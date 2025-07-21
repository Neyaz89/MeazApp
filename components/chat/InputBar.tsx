
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import { supabase } from '../../lib/supabase';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (audioUri: string, duration: number) => void;
  chatId: string;
  disabled?: boolean;
}

export default function InputBar({ onSendMessage, onSendVoiceNote, chatId, disabled }: InputBarProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSend = async () => {
    if (message.trim().length === 0) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(false);
    
    try {
      // Send message immediately to UI
      onSendMessage(messageText);
      
      // Send to database for real-time delivery
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          content: messageText,
          sender_id: user?.id,
          chat_id: chatId,
          message_type: 'text',
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Update chat's last message
      await supabase
        .from('chats')
        .update({ 
          last_message: messageText,
          last_message_at: new Date().toISOString() 
        })
        .eq('id', chatId);

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleVoiceNoteSend = async (audioUri: string, duration: number) => {
    try {
      onSendVoiceNote(audioUri, duration);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          content: audioUri,
          sender_id: user?.id,
          chat_id: chatId,
          message_type: 'voice',
          metadata: { duration },
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      await supabase
        .from('chats')
        .update({ 
          last_message: '🎤 Voice message',
          last_message_at: new Date().toISOString() 
        })
        .eq('id', chatId);

    } catch (error) {
      console.error('Error sending voice note:', error);
      Alert.alert('Error', 'Failed to send voice note. Please try again.');
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      // Send typing indicator
      supabase
        .channel(`chat-${chatId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { typing: true, chatId }
        });
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      supabase
        .channel(`chat-${chatId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { typing: false, chatId }
        });
    }, 1000);
  };

  const toggleVoiceRecorder = () => {
    const newValue = !showVoiceRecorder;
    setShowVoiceRecorder(newValue);
    
    Animated.timing(slideAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <View style={styles.container}>
        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <Animated.View 
            style={[
              styles.voiceRecorderContainer,
              {
                opacity: slideAnim,
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  })
                }]
              }
            ]}
          >
            <VoiceNoteRecorder 
              onSend={handleVoiceNoteSend}
              disabled={disabled}
            />
          </Animated.View>
        )}
        
        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.textInputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#999999"
              value={message}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
              editable={!disabled}
            />
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={toggleVoiceRecorder}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={showVoiceRecorder ? ['#2C5F7C', '#1E3A8A'] : ['#D4A574', '#C8956D']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={showVoiceRecorder ? "keyboard" : "mic"}
                size={20}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>

          {message.trim().length > 0 && (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#D4A574', '#C8956D']}
                style={styles.sendButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    backgroundColor: '#FFFFFF',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  voiceRecorderContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textInput: {
    fontSize: 16,
    color: '#333333',
    maxHeight: 80,
    lineHeight: 20,
  },
  actionButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
