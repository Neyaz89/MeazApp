
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ThemedText } from '../components/ThemedText';
import UserAvatar from '../components/UserAvatar';
import { useToast } from '../components/ui/Toast';
import { Database, supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

const { width } = Dimensions.get('window');

type FriendRequest = Database['public']['Tables']['friend_requests']['Row'] & {
  sender?: Database['public']['Tables']['users']['Row'];
};

const FriendsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const toast = useToast();

  const { 
    friends: realFriends, 
    friendRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest,
    loadFriends,
    loadFriendRequests,
    subscribeToFriendRequests,
    removeFriend,
    isLoading,
    getSuggestions,
    searchUsers
  } = useFriendsStore();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4A574" />
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    subscribeToFriendRequests();
  }, [loadFriends, loadFriendRequests, subscribeToFriendRequests]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestionsLoading(true);
      getSuggestions()
        .then((suggestions) => {
          console.log('Friend suggestions loaded:', suggestions?.length || 0);
          setSuggestedUsers(suggestions || []);
        })
        .catch((error) => {
          console.error('Error loading suggestions:', error);
          setSuggestedUsers([]);
        })
        .finally(() => setSuggestionsLoading(false));
    }
  }, [searchQuery, realFriends, user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    searchUsers(searchQuery.trim())
      .then((users) => {
        console.log('Search users loaded:', users?.length || 0);
        setSearchResults(users || []);
      })
      .catch((error) => {
        console.error('Error searching users:', error);
        setSearchError('Failed to search users');
        setSearchResults([]);
      })
      .finally(() => setSearchLoading(false));
  }, [searchQuery, realFriends, user]);

  const handleAddFriend = async () => {
    if (!newFriendUsername.trim()) {
      toast.error('Please enter a valid username');
      return;
    }

    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', newFriendUsername.trim())
        .single();

      if (error || !users) {
        toast.error('User not found');
        return;
      }

      const result = await sendFriendRequest(users.id);
      if (result.error) {
        toast.error(result.error.message || 'Failed to send friend request');
      } else {
        toast.success('Friend request sent!');
        setNewFriendUsername('');
        setShowAddFriend(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  const handleAddFriendFromSearch = async (userId: string) => {
    try {
      const result = await sendFriendRequest(userId);
      if (result.error) {
        toast.error(result.error.message || 'Failed to send friend request');
      } else {
        toast.success('Friend request sent!');
        if (searchQuery.trim()) {
          const refreshedResults = await searchUsers(searchQuery.trim());
          setSearchResults(refreshedResults || []);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptFriendRequest(requestId);
    await loadFriendRequests();
    await loadFriends();
    if (result.error) {
      toast.error(result.error.message || 'Failed to accept request');
    } else {
      toast.success('Friend request accepted!');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const result = await rejectFriendRequest(requestId);
    await loadFriendRequests();
    await loadFriends();
    if (result.error) {
      toast.error(result.error.message || 'Failed to reject request');
    } else {
      toast.info('Friend request rejected');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(friendId);
            if (result.error) {
              toast.error(result.error.message || 'Failed to remove friend');
            } else {
              toast.success('Friend removed');
            }
          },
        },
      ]
    );
  };

  const openOrCreateDirectChat = async (friend: any) => {
    try {
      console.log('[ChatButton] Pressed for friend:', friend);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[ChatButton] Failed to get session:', sessionError);
        throw new Error('Failed to get session');
      }
      const sessionUser = sessionData?.session?.user;
      if (!sessionUser || !sessionUser.id) {
        console.error('[ChatButton] Not authenticated: session user is', sessionUser);
        throw new Error('Not authenticated');
      }
      const currentUserId = sessionUser.id;
      if (currentUserId !== sessionUser.id) {
        console.error('[start_or_get_chat] Mismatch: currentUserId does not match session user!');
        throw new Error('Session user mismatch');
      }
      console.log('[openOrCreateDirectChat] Auth user:', sessionUser.id, 'Passing as user_a:', currentUserId, 'Friend:', friend.id);
      const { data: chatId, error } = await supabase.rpc('start_or_get_chat', {
        user_a: currentUserId,
        user_b: friend.id,
      });
      console.log('[start_or_get_chat] RPC result:', { chatId, error });
      if (error || !chatId) {
        console.error('start_or_get_chat error:', error);
        throw error || new Error('No chat ID returned');
      }
      (navigation as any).navigate('ChatDetail', { chatId });
    } catch (err: any) {
      console.error('Could not start chat:', err);
      toast.error('Could not start chat');
    }
  };

  const renderFriendItem = ({ item }: { item: any }) => {
    console.log('[FriendsScreen] Navigating to ProfileScreen with userId:', item.id);
    return (
      <BlurView intensity={20} tint="light" style={styles.friendItem}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.9)', 'rgba(248, 249, 250, 0.8)']}
          style={styles.friendGradient}
        >
          <TouchableOpacity style={styles.avatarContainer} onPress={() => { console.log('[FriendsScreen] onPress avatar, userId:', item.id); navigation.navigate('ProfileScreen', { userId: item.id }); }}>
            <UserAvatar user={item} size={56} />
            {(item.isOnline || item.status === 'online') && <View style={styles.onlineIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.friendInfo} onPress={() => { console.log('[FriendsScreen] onPress info, userId:', item.id); navigation.navigate('ProfileScreen', { userId: item.id }); }}>
            <ThemedText style={styles.friendName}>{item.displayName}</ThemedText>
            <ThemedText style={styles.friendUsername}>@{item.username}</ThemedText>
            {item.bio && (
              <ThemedText style={styles.friendBio} numberOfLines={1}>
                {item.bio}
              </ThemedText>
            )}
          </TouchableOpacity>
          
          <View style={styles.friendActions}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => openOrCreateDirectChat(item)}
            >
              <LinearGradient
                colors={['#D4A574', '#C8956D']}
                style={styles.actionGradient}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFriend(item.id)}
            >
              <View style={styles.removeButtonBg}>
                <Ionicons name="person-remove-outline" size={18} color="#FF6B6B" />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BlurView>
    );
  };

  const renderRequestItem = ({ item }: { item: any }) => (
    <BlurView intensity={20} tint="light" style={styles.requestItem}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(248, 249, 250, 0.8)']}
        style={styles.requestGradient}
      >
        <View style={styles.avatarContainer}>
          <UserAvatar user={item.sender} size={56} />
        </View>

        <View style={styles.requestInfo}>
          <ThemedText style={styles.requestName}>{item.sender?.display_name}</ThemedText>
          <ThemedText style={styles.requestUsername}>@{item.sender?.username}</ThemedText>
          {item.message && (
            <ThemedText style={styles.requestMessage} numberOfLines={2}>
              {item.message}
            </ThemedText>
          )}
        </View>

        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(item.id)}
          >
            <LinearGradient
              colors={['#4CAF50', '#45A049']}
              style={styles.actionGradient}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => handleRejectRequest(item.id)}
          >
            <View style={styles.rejectButtonBg}>
              <Ionicons name="close" size={18} color="#FF6B6B" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </BlurView>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadFriendRequests()]);
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={80} color="rgba(26, 35, 126, 0.3)" />
      <ThemedText style={styles.emptyTitle}>
        {activeTab === 'friends' ? 'No friends yet' : 'No friend requests'}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {activeTab === 'friends' 
          ? 'Start adding friends to see them here'
          : 'When someone sends you a friend request, it will appear here'
        }
      </ThemedText>
    </View>
  );

  const renderUserResult = (item: any) => (
    <BlurView intensity={20} tint="light" style={styles.userResult}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(248, 249, 250, 0.8)']}
        style={styles.userGradient}
      >
        <View style={styles.avatarContainer}>
          <UserAvatar user={item} size={56} />
          {item.isOnline && <View style={styles.onlineIndicator} />}
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
          onPress={() => handleAddFriendFromSearch(item.id)}
        >
          <LinearGradient
            colors={['#D4A574', '#C8956D']}
            style={styles.addButtonGradient}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </BlurView>
  );

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <BlurView intensity={80} tint="light" style={styles.header}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 249, 250, 0.9)']}
          style={styles.headerGradient}
        >
          <ThemedText style={styles.title}>Friends</ThemedText>
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={() => setShowAddFriend(true)}
          >
            <LinearGradient
              colors={['#D4A574', '#C8956D']}
              style={styles.addButtonIcon}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </BlurView>

      {/* Modern Search Bar */}
      <View style={styles.searchContainer}>
        <BlurView intensity={20} tint="light" style={styles.searchBlur}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(248, 249, 250, 0.8)']}
            style={styles.searchInputContainer}
          >
            <Ionicons name="search" size={20} color="#1A237E" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends or find new ones..."
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
              >
                <Ionicons name="close-circle" size={20} color="rgba(26, 35, 126, 0.5)" />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </BlurView>
      </View>

      {/* Modern Tab Selector */}
      <View style={styles.tabContainer}>
        <BlurView intensity={15} tint="light" style={styles.tabBlur}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            {activeTab === 'friends' && (
              <LinearGradient
                colors={['#D4A574', '#C8956D']}
                style={styles.tabGradient}
              />
            )}
            <ThemedText style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Friends ({realFriends.length})
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            {activeTab === 'requests' && (
              <LinearGradient
                colors={['#D4A574', '#C8956D']}
                style={styles.tabGradient}
              />
            )}
            <ThemedText style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests ({friendRequests.length})
            </ThemedText>
            {friendRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{friendRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Content */}
      {searchQuery.trim() ? (
        <FlatList
          data={searchResults}
          renderItem={({ item }) => renderUserResult(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : styles.contentContainer}
          ListEmptyComponent={
            searchLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4A574" />
                <ThemedText style={styles.loadingText}>Searching...</ThemedText>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={80} color="rgba(26, 35, 126, 0.3)" />
                <ThemedText style={styles.emptyTitle}>No users found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Try searching with a different username or display name
                </ThemedText>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      ) : activeTab === 'friends' ? (
        <FlatList
          data={realFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={realFriends.length === 0 ? styles.emptyContainer : styles.contentContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <FlatList
          data={friendRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={friendRequests.length === 0 ? styles.emptyContainer : styles.contentContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriend}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddFriend(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 249, 250, 0.9)']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Add Friend</ThemedText>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowAddFriend(false)}
                  >
                    <Ionicons name="close" size={24} color="#1A237E" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.usernameInput}
                    placeholder="Enter username"
                    placeholderTextColor="rgba(26, 35, 126, 0.5)"
                    value={newFriendUsername}
                    onChangeText={setNewFriendUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setShowAddFriend(false)}
                  >
                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={handleAddFriend}
                  >
                    <LinearGradient
                      colors={['#D4A574', '#C8956D']}
                      style={styles.sendButtonGradient}
                    >
                      <ThemedText style={styles.sendButtonText}>Send Request</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  headerAddButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  addButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: 8,
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 16,
  },
  activeTab: {
    overflow: 'hidden',
  },
  tabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(26, 35, 126, 0.6)',
    fontWeight: '600',
    zIndex: 1,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(26, 35, 126, 0.6)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(26, 35, 126, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  friendItem: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  friendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  requestItem: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  requestGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userResult: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  userGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  friendInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.6)',
    marginBottom: 4,
  },
  requestUsername: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.6)',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.6)',
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.5)',
    lineHeight: 18,
  },
  requestMessage: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.5)',
    lineHeight: 18,
  },
  userBio: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.5)',
    lineHeight: 18,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  removeButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  acceptButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  rejectButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  actionGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  rejectButtonBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  addButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  usernameInput: {
    borderWidth: 2,
    borderColor: 'rgba(26, 35, 126, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A237E',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(26, 35, 126, 0.2)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: 'rgba(26, 35, 126, 0.6)',
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default FriendsScreen;
