import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';
import type { Chat } from '../types';

const ChatsScreen = () => {
  const navigation = useNavigation<any>();
  const { chats, isLoading, loadChats, setupRealTimeSubscriptions, cleanupSubscriptions } = useChatStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (user) {
      loadChats();
      setupRealTimeSubscriptions(user.id);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return () => {
      cleanupSubscriptions();
    };
  }, [user]);

  useEffect(() => {
    const filtered = chats.filter(chat =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.members?.some(member =>
        member.user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setFilteredChats(filtered);
  }, [chats, searchQuery]);

  const onRefresh = useCallback(() => {
    loadChats();
  }, []);

  const formatLastMessageTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'direct') {
      const otherMember = chat.members?.find(member => member.user_id !== user?.id);
      return otherMember?.user?.display_name || otherMember?.user?.username || 'Unknown User';
    }
    return chat.name;
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'direct') {
      const otherMember = chat.members?.find(member => member.user_id !== user?.id);
      return otherMember?.user?.avatar_url || 'https://randomuser.me/api/portraits/men/1.jpg';
    }
    return chat.avatar || 'https://randomuser.me/api/portraits/men/1.jpg';
  };

  const getOnlineStatus = (chat: Chat) => {
    if (chat.type === 'direct') {
      const otherMember = chat.members?.find(member => member.user_id !== user?.id);
      return otherMember?.user?.status === 'online';
    }
    return false;
  };

  const renderChatItem = ({ item: chat, index }: { item: Chat; index: number }) => {
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
          styles.chatItemContainer,
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
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => navigation.navigate('ChatDetail', { chat })}
          activeOpacity={0.8}
        >
          <BlurView intensity={60} style={styles.chatItemBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.chatItemGradient}
            >
              {/* Avatar with online indicator */}
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: getChatAvatar(chat) }}
                  style={styles.chatAvatar}
                />
                {getOnlineStatus(chat) && <View style={styles.onlineIndicator} />}
              </View>

              {/* Chat info */}
              <View style={styles.chatInfo}>
                <Text style={styles.chatName} numberOfLines={1}>
                  {getChatName(chat)}
                </Text>
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {chat.last_message?.content || 'No messages yet'}
                </Text>
              </View>

              {/* Time and indicators */}
              <View style={styles.chatMeta}>
                {chat.last_message?.created_at && (
                  <Text style={styles.messageTime}>
                    {formatLastMessageTime(chat.last_message.created_at)}
                  </Text>
                )}
                <View style={styles.indicators}>
                  {chat.type === 'group' && (
                    <View style={styles.groupIndicator}>
                      <Ionicons name="people" size={12} color="#ffd700" />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="rgba(26, 35, 126, 0.4)" />
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={['#f5f7fa', '#c3cfe2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="search" size={24} color="#1a237e" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <BlurView intensity={80} style={styles.searchBlur}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="rgba(26, 35, 126, 0.5)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search conversations..."
                  placeholderTextColor="rgba(26, 35, 126, 0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="rgba(26, 35, 126, 0.5)" />
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>
          </View>

          {/* Chats List */}
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            style={styles.chatsList}
            contentContainerStyle={styles.chatsListContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {/* Floating Action Button */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('Friends')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ffd700', '#ffb300']}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={28} color="white" />
            </LinearGradient>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1a237e',
  },
  clearButton: {
    padding: 4,
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  chatItemContainer: {
    marginBottom: 12,
  },
  chatItem: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  chatItemBlur: {
    borderRadius: 20,
  },
  chatItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 35, 126, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 16,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a237e',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.6)',
    lineHeight: 20,
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(26, 35, 126, 0.5)',
    marginBottom: 4,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupIndicator: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    marginHorizontal: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatsScreen;