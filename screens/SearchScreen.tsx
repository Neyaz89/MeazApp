
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { ThemedText } from '../components/ThemedText';
import UserAvatar from '../components/UserAvatar';
import { Database } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

type User = Database['public']['Tables']['users']['Row'];
const { width } = Dimensions.get('window');

export default function SearchScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { searchUsers, sendFriendRequest } = useFriendsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.95);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Safety check - don't render if user is not available
  if (!user) {
    return (
      <LinearGradient colors={['#FFFFFF', '#F8F9FA', '#E8F4FD']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4A574" />
            <ThemedText style={styles.loadingText}>Loading user data...</ThemedText>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearching(true);
      console.log('Searching for:', searchQuery);
      
      searchUsers(searchQuery)
        .then((results) => {
          console.log('Search results received:', results?.length || 0);
          setSearchResults(results || []);
        })
        .catch((error) => {
          console.error('Search error:', error);
          setSearchResults([]);
        })
        .finally(() => setSearching(false));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSendRequest = async (receiverId: string) => {
    try {
      console.log('Sending friend request to:', receiverId);
      const result = await sendFriendRequest(receiverId);
      
      if (result.error) {
        console.error('Friend request error:', result.error);
        Alert.alert('Error', result.error.message || 'Failed to send friend request');
      } else {
        console.log('Friend request sent successfully');
        Alert.alert('Success', 'Friend request sent!');
        
        // Refresh search results to remove the user
        if (searchQuery.trim()) {
          const refreshedResults = await searchUsers(searchQuery);
          setSearchResults(refreshedResults || []);
        }
      }
    } catch (error) {
      console.error('Error in handleSendRequest:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const renderUserItem = ({ item, index }: { item: any; index: number }) => {
    const itemAnim = new Animated.Value(0);

    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View
        style={[
          styles.userItemContainer,
          {
            opacity: itemAnim,
            transform: [{
              translateX: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            }],
          },
        ]}
      >
        <BlurView intensity={40} style={styles.userItemBlur}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
            style={styles.userItem}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.avatarContainer}>
              <UserAvatar user={item} size={60} style={styles.avatar} />
              {(item.isOnline || item.status === 'online') && (
                <View style={styles.onlineIndicator}>
                  <View style={styles.onlineInnerDot} />
                </View>
              )}
            </View>

            <View style={styles.userInfo}>
              <ThemedText style={styles.userName}>{item.displayName}</ThemedText>
              <ThemedText style={styles.userUsername}>@{item.username}</ThemedText>
              {item.bio && (
                <ThemedText style={styles.userBio} numberOfLines={2}>
                  {item.bio}
                </ThemedText>
              )}
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleSendRequest(item.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#D4A574', '#C8956D']}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {/* Decorative SVG */}
      <Svg height="120" width="120" viewBox="0 0 120 120">
        <Defs>
          <SvgLinearGradient id="emptyGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#D4A574" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#1A237E" stopOpacity="0.2" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx="60" cy="60" r="50" fill="url(#emptyGrad)" opacity="0.5" />
        <Path d="M40 50 Q60 30 80 50 Q60 70 40 50" fill="url(#emptyGrad)" opacity="0.7" />
      </Svg>
      
      <ThemedText style={styles.emptyTitle}>
        {searchQuery.trim() ? 'No users found' : 'Discover New Friends'}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {searchQuery.trim() 
          ? 'Try searching with a different username or display name'
          : 'Enter a username or display name to find amazing people'
        }
      </ThemedText>
    </View>
  );

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F8F9FA', '#E8F4FD']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Floating Decorative Elements */}
      <View style={styles.decorativeElement1} />
      <View style={styles.decorativeElement2} />
      
      <SafeAreaView style={styles.safeArea}>
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <BlurView intensity={20} style={styles.backButtonBlur}>
                <Ionicons name="arrow-back" size={24} color="#1A237E" />
              </BlurView>
            </TouchableOpacity>
            
            <ThemedText style={styles.title}>Discover</ThemedText>
            
            <View style={styles.placeholder} />
          </View>

          {/* Search Container */}
          <View style={styles.searchContainer}>
            <BlurView intensity={60} style={styles.searchBlur}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.8)']}
                style={styles.searchInputContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.searchIconContainer}>
                  <Ionicons name="search" size={22} color="#D4A574" />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for amazing people..."
                  placeholderTextColor="rgba(26, 35, 126, 0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={22} color="rgba(26, 35, 126, 0.5)" />
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </BlurView>
          </View>

          {/* Content Area */}
          {searching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4A574" />
              <ThemedText style={styles.loadingText}>Searching...</ThemedText>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={
                searchResults.length === 0 ? styles.emptyContainer : styles.listContent
              }
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  decorativeElement1: {
    position: 'absolute',
    top: 100,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    zIndex: 0,
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: 200,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 35, 126, 0.08)',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A237E',
    textShadowColor: 'rgba(26, 35, 126, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    zIndex: 1,
  },
  searchBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(26, 35, 126, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  userItemContainer: {
    marginBottom: 16,
  },
  userItemBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  onlineInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.6)',
    marginBottom: 6,
  },
  userBio: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.5)',
    lineHeight: 20,
  },
  addButton: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  addButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    marginHorizontal: 20,
  },
});
