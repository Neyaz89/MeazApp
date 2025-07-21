import { create } from 'zustand';
import { Platform, ToastAndroid } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Chat, Message, ChatMember, User } from '../types';

export function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    console.log('Toast:', message);
  }
}

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  onlineUsers: string[];
  messageSubscription: any;
  chatSubscription: any;

  // Actions
  setCurrentChat: (chat: Chat | null) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, type?: string, attachments?: any[], audioUrl?: string) => Promise<void>;
  setupRealTimeSubscriptions: (userId: string) => void;
  cleanupSubscriptions: () => void;
  updateTypingStatus: (chatId: string, isTyping: boolean) => Promise<void>;
  markMessagesAsRead: (chatId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: [],
  onlineUsers: [],
  messageSubscription: null,
  chatSubscription: null,

  setCurrentChat: (chat) => {
    set({ currentChat: chat });
    if (chat) {
      get().loadMessages(chat.id);
      get().markMessagesAsRead(chat.id);
    }
  },

  loadChats: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          members:chat_members!inner(
            user_id,
            role,
            last_read_at,
            user:users(id, username, display_name, avatar_url, status, last_seen)
          ),
          last_message:messages!chats_last_message_id_fkey(
            id,
            content,
            type,
            created_at,
            sender:users(username, display_name)
          )
        `)
        .eq('chat_members.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      set({ chats: chats || [], isLoading: false });
    } catch (error) {
      console.error('Error loading chats:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadMessages: async (chatId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, username, display_name, avatar_url),
          reply_to_message:messages!messages_reply_to_fkey(
            id,
            content,
            sender:users(username, display_name)
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: messages || []
        }
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      set({ error: (error as Error).message });
    }
  },

  sendMessage: async (chatId: string, content: string, type = 'text', attachments = [], audioUrl?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const messageData: any = {
        chat_id: chatId,
        sender_id: user.id,
        content,
        type,
        attachments,
      };

      if (audioUrl) {
        messageData.audio_url = audioUrl;
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update chat's last message
      await supabase
        .from('chats')
        .update({ 
          last_message_id: message.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      // Optimistically add message to local state
      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), message]
        }
      }));

      console.log('✅ Message sent successfully:', message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  },

  setupRealTimeSubscriptions: (userId: string) => {
    // Cleanup existing subscriptions
    get().cleanupSubscriptions();

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMessage = payload.new as Message;
        console.log('📨 Real-time message received:', newMessage);

        // Add message to appropriate chat
        set(state => ({
          messages: {
            ...state.messages,
            [newMessage.chat_id]: [
              ...(state.messages[newMessage.chat_id] || []),
              newMessage
            ]
          }
        }));

        // If this is the current chat, mark as read
        const currentChat = get().currentChat;
        if (currentChat?.id === newMessage.chat_id && newMessage.sender_id !== userId) {
          get().markMessagesAsRead(newMessage.chat_id);
        }
      })
      .subscribe();

    // Subscribe to chat updates
    const chatSubscription = supabase
      .channel('chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
      }, (payload) => {
        console.log('💬 Real-time chat update:', payload);
        // Reload chats on any change
        get().loadChats();
      })
      .subscribe();

    // Subscribe to typing status
    supabase
      .channel('typing_status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_status',
      }, (payload) => {
        const typingData = payload.new;
        if (typingData && get().currentChat?.id === typingData.chat_id) {
          // Update typing users list
          set(state => {
            const typingUsers = typingData.is_typing 
              ? [...state.typingUsers.filter(id => id !== typingData.user_id), typingData.user_id]
              : state.typingUsers.filter(id => id !== typingData.user_id);
            return { typingUsers };
          });
        }
      })
      .subscribe();

    set({ messageSubscription, chatSubscription });
  },

  cleanupSubscriptions: () => {
    const { messageSubscription, chatSubscription } = get();

    if (messageSubscription) {
      supabase.removeChannel(messageSubscription);
    }
    if (chatSubscription) {
      supabase.removeChannel(chatSubscription);
    }

    set({ messageSubscription: null, chatSubscription: null });
  },

  updateTypingStatus: async (chatId: string, isTyping: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('typing_status')
        .upsert({
          chat_id: chatId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  },

  markMessagesAsRead: async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  // Add missing methods
  addMessage: (chatId: string, message: any) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message]
      }
    }));
  },

  updateChatCustomization: (chatId: string, customization: any) => {
    set(state => ({
      chats: state.chats.map(chat => 
        chat.id === chatId 
          ? { ...chat, customization }
          : chat
      )
    }));
  },

  forwardMessage: async (messageId: string, targetChatId: string) => {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error || !message) throw error;

      await get().sendMessage(targetChatId, message.content, message.type);
    } catch (error) {
      console.error('Error forwarding message:', error);
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_deleted: true, content: '[deleted]' })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  },
}));