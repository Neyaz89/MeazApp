import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ThemeProvider } from './components/ThemeContext';
import { ToastProvider } from './components/ui/ToastProvider';
import { useNotifications } from './hooks/useNotifications';
import { setupGlobalErrorHandler } from './utils/errorReporting';
import { networkManager } from './utils/networkManager';
import PerformanceMonitor from './utils/performance';
import { appStateManager } from './utils/appState';
import { ProductionReadinessChecker } from './utils/productionCheck';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';

// Import screens
import CallInterface from './components/call/CallInterface';
import CallInterfaceScreen from './components/call/CallInterfaceScreen';
import CallService from './components/call/CallService';
import AuthScreen from './screens/AuthScreen';
import CallHistoryScreen from './screens/CallHistoryScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import ChatsScreen from './screens/ChatsScreen';
import FriendsScreen from './screens/FriendsScreen';
import PostsScreen from './screens/PostsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Chats':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Friends':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Posts':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Posts" component={PostsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Stack Navigator for authenticated users
function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen}
        options={{ 
          headerShown: false,
          // title: 'Chat',
          // headerBackTitleVisible: false 
        }}
      />
      <Stack.Screen name="CallInterface" component={CallInterfaceScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ 
          headerShown: true,
          title: 'Settings'
        }}
      />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ 
          headerShown: true,
          title: 'Search'
        }}
      />
      <Stack.Screen 
        name="CallHistory" 
        component={CallHistoryScreen}
        options={{ 
          headerShown: true,
          title: 'Call History'
        }}
      />

    </Stack.Navigator>
  );
}

// Loading component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

export default function App() {
  const { user, isLoading: loading, initializeAuth } = useAuthStore();
  const [appIsReady, setAppIsReady] = useState(false);

  // Global incoming call state
  const [incomingCall, setIncomingCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Initialize notifications
  useNotifications();

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();

    // Initialize production services
    setupGlobalErrorHandler();
    networkManager.initialize();
    appStateManager.initialize();

    // Performance monitoring
    PerformanceMonitor.startTimer('App Initialization');

    // Run production readiness checks in development
    if (__DEV__) {
      ProductionReadinessChecker.runChecks().then(checks => {
        ProductionReadinessChecker.logResults(checks);
      });
    }

    return () => {
      PerformanceMonitor.endTimer('App Initialization');
    };
  }, []);

  // Listen for incoming calls globally
  useEffect(() => {
    if (!user) return;
    if (CallService && typeof CallService.onCallStateChange === 'function') {
      const unsub = CallService.onCallStateChange((call) => {
        if (call && call.status && ['calling', 'ringing', 'accepted'].includes(call.status) && call.receiver_id === user.id) {
          setIncomingCall(call);
          setShowCallModal(true);
        } else if (call && ['ended', 'missed', 'rejected'].includes(call.status)) {
          setShowCallModal(false);
          setIncomingCall(null);
        }
      });
      return () => { if (typeof unsub === 'function') unsub(); };
    }
  }, [user]);

  // Ensure CallService always has the current user set
  useEffect(() => {
    if (user && CallService && typeof CallService === 'object') {
      CallService.user = user;
    }
  }, [user]);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any resources, fonts, etc.
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Handle push notification taps for incoming calls
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const data = response.notification.request.content.data;
      console.log('🔔 Notification tapped:', data);

      if (data && data.type === 'call' && data.callId) {
        if (user) {
          try {
            const { data: call, error } = await supabase
              .from('calls')
              .select('*')
              .eq('id', data.callId)
              .single();
            console.log('📞 Fetched call:', call, error);

            if (!error && call) {
              setIncomingCall(call);
              setShowCallModal(true);
              console.log('✅ Showing call modal for:', call);
            } else {
              console.log('⚠️ Call not found, showing fallback modal for callId:', data.callId);
              setIncomingCall({ id: data.callId });
              setShowCallModal(true);
            }
          } catch (e) {
            console.log('❌ Error fetching call:', e);
            setIncomingCall({ id: data.callId });
            setShowCallModal(true);
          }
        }
      }
    });
    return () => subscription.remove();
  }, [user]);

  if (!appIsReady || loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ToastProvider>
              <NavigationContainer>
                {user ? <AppNavigator /> : <AuthScreen />}
              </NavigationContainer>
              <StatusBar style="auto" />
              {/* Global Incoming Call Modal */}
              {showCallModal && incomingCall && (
                <CallInterface
                  visible={showCallModal}
                  call={incomingCall}
                  onClose={() => setShowCallModal(false)}
                />
              )}
            </ToastProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}