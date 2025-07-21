
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';
import CallService from '../components/call/CallService';
import { ThemedText } from '../components/ThemedText';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const CallHistoryScreen = () => {
  const { user } = useAuthStore();
  const [calls, setCalls] = useState<any[]>([]);
  const [users, setUsers] = useState<{ [id: string]: any }>({});
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

  // Fetch call history
  useEffect(() => {
    const fetchHistory = async () => {
      const data = await CallService.getCallHistory(user.id);
      setCalls(data);
      // Fetch all unique user profiles
      const userIds = Array.from(new Set(data.flatMap((c: any) => [c.caller_id, c.receiver_id]).filter((id: string) => id !== user.id)));
      const profiles: { [id: string]: any } = {};
      for (const id of userIds) {
        const { data: u } = await supabase.from('users').select('*').eq('id', id).single();
        if (u) profiles[id] = u;
      }
      setUsers(profiles);
    };
    if (user?.id) fetchHistory();
  }, [user]);

  // Format duration
  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const s = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Format timestamp
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Render call item
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isOutgoing = item.caller_id === user.id;
    const otherUser = users[isOutgoing ? item.receiver_id : item.caller_id];
    const missed = item.status === 'missed' || item.status === 'rejected';
    
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
          styles.itemContainer,
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
        <TouchableOpacity activeOpacity={0.8}>
          <BlurView intensity={40} style={styles.itemBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.item}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Avatar with call type indicator */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={
                      otherUser?.avatar_url 
                        ? { uri: otherUser.avatar_url } 
                        : require('../assets/images/default-avatar.png')
                    } 
                    style={styles.avatar} 
                  />
                  <View style={[styles.callTypeIndicator, { backgroundColor: missed ? '#FF6B6B' : '#4ECDC4' }]}>
                    <Ionicons 
                      name={item.type === 'video' ? 'videocam' : 'call'} 
                      size={14} 
                      color="#FFFFFF" 
                    />
                  </View>
                </View>
              </View>

              {/* Call info */}
              <View style={styles.callInfo}>
                <Text style={styles.name}>
                  {otherUser?.display_name || otherUser?.username || 'Unknown User'}
                </Text>
                
                <View style={styles.callDetails}>
                  <View style={styles.statusContainer}>
                    <Ionicons 
                      name={isOutgoing ? 'call-outline' : 'call-received-outline'} 
                      size={14} 
                      color={missed ? '#FF6B6B' : '#4ECDC4'} 
                    />
                    <Text style={[styles.status, { color: missed ? '#FF6B6B' : '#4ECDC4' }]}>
                      {missed ? 'Missed' : 'Connected'}
                    </Text>
                  </View>
                  
                  {item.started_at && item.ended_at && !missed && (
                    <Text style={styles.duration}>
                      • {formatDuration(item.started_at, item.ended_at)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Time and action */}
              <View style={styles.rightSection}>
                <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                
                <TouchableOpacity style={styles.callBackButton} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['#D4A574', '#C8956D']}
                    style={styles.callBackGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
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
        <Path d="M40 40 Q60 20 80 40 L80 80 Q60 100 40 80 Z" fill="url(#emptyGrad)" opacity="0.7" />
      </Svg>
      
      <Text style={styles.emptyTitle}>No Call History</Text>
      <Text style={styles.emptySubtitle}>Your call history will appear here once you start making calls</Text>
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
            <ThemedText style={styles.title}>Call History</ThemedText>
            <View style={styles.headerDecoration}>
              <Svg height="30" width="30" viewBox="0 0 30 30">
                <Circle cx="15" cy="15" r="12" fill="url(#headerGrad)" opacity="0.3" />
                <Defs>
                  <SvgLinearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#D4A574" />
                    <Stop offset="100%" stopColor="#C8956D" />
                  </SvgLinearGradient>
                </Defs>
              </Svg>
            </View>
          </View>

          {/* Call History List */}
          <FlatList
            data={calls}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={calls.length === 0 ? styles.emptyContainer : styles.listContent}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

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
    top: 120,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    zIndex: 0,
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: 180,
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
    paddingVertical: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A237E',
    textShadowColor: 'rgba(26, 35, 126, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerDecoration: {
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
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
  itemContainer: {
    marginBottom: 16,
  },
  itemBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  avatarSection: {
    marginRight: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.3)',
  },
  callTypeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  callInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 6,
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  duration: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.6)',
    marginLeft: 8,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 13,
    color: 'rgba(26, 35, 126, 0.5)',
    marginBottom: 8,
  },
  callBackButton: {
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  callBackGradient: {
    width: 32,
    height: 32,
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



export default CallHistoryScreen;
