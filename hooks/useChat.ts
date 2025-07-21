
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  chat_id: string;
  message_type: 'text' | 'voice' | 'image' | 'video';
  metadata?: any;
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  last_message?: string;
  last_message_at?: string;
  participants: Array<{
    id: string;
    username: string;
    avatar_url?: string;
  }>;
}

export function useChat(chatId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Load initial messages for a specific chat
  const loadMessages = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(username, avatar_url)
        `)
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  }, []);

  // Load user's chats
  const loadChats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: chatData, error } = await supabase
        .from('chat_members')
        .select(`
          chat:chats(
            id,
            name,
            is_group,
            last_message,
            last_message_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get participants for each chat
      const chatsWithParticipants = await Promise.all(
        (chatData || []).map(async (item) => {
          const chat = item.chat;
          const { data: participants } = await supabase
            .from('chat_members')
            .select(`
              user:profiles(id, username, avatar_url)
            `)
            .eq('chat_id', chat.id);

          return {
            ...chat,
            participants: participants?.map(p => p.user) || [],
          };
        })
      );

      setChats(chatsWithParticipants);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content: string, type: 'text' | 'voice' | 'image' = 'text', metadata?: any) => {
    if (!chatId || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newMessage = {
        content,
        sender_id: user.id,
        chat_id: chatId,
        message_type: type,
        metadata,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select(`
          *,
          sender:profiles(username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update chat's last message
      await supabase
        .from('chats')
        .update({
          last_message: type === 'text' ? content : `${type} message`,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      // Optimistically add to local messages
      setMessages(prev => [...prev, data]);

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }, [chatId, sendingMessage]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!chatId) return;

    // Real-time messages subscription
    const messageSubscription = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, async (payload) => {
        // Get sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();

        const newMessage = {
          ...payload.new,
          sender,
        } as Message;

        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      })
      .subscribe();

    // Typing indicators subscription
    const typingSubscription = supabase
      .channel(`typing-${chatId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { typing, userId, username } = payload.payload;
        
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (typing) {
            newSet.add(username);
          } else {
            newSet.delete(username);
          }
          return newSet;
        });

        // Auto-clear typing after 3 seconds
        if (typing) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(username);
              return newSet;
            });
          }, 3000);
        }
      })
      .subscribe();

    // Load initial messages
    loadMessages(chatId);

    return () => {
      messageSubscription.unsubscribe();
      typingSubscription.unsubscribe();
    };
  }, [chatId, loadMessages]);

  // Set up chat list subscription
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser();
    
    loadChats();

    // Real-time chat updates
    const chatSubscription = supabase
      .channel('chats-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
      }, () => {
        // Reload chats when any chat is updated
        loadChats();
      })
      .subscribe();

    return () => {
      chatSubscription.unsubscribe();
    };
  }, [loadChats]);

  return {
    messages,
    chats,
    loading,
    sendingMessage,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    loadMessages,
    loadChats,
  };
}
