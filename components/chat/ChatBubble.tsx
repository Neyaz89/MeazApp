
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../store/authStore';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import type { Message } from '../../types';

interface ChatBubbleProps {
  message: Message;
  showAvatar?: boolean;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  showAvatar = true,
  onReact,
  onReply,
}) => {
  const { user } = useAuthStore();
  const { playVoiceNote } = useVoiceRecording();
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const scaleAnim = new Animated.Value(1);
  const isOwn = message.sender_id === user?.id;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLongPress = () => {
    setShowReactions(!showReactions);
  };

  const handlePlayVoice = async () => {
    if (message.audio_url && !isPlaying) {
      try {
        setIsPlaying(true);
        await playVoiceNote(message.audio_url);
        setIsPlaying(false);
      } catch (error) {
        setIsPlaying(false);
        Alert.alert('Error', 'Failed to play voice message');
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const renderContent = () => {
    switch (message.type) {
      case 'voice':
        return (
          <TouchableOpacity
            style={styles.voiceMessage}
            onPress={handlePlayVoice}
            disabled={isPlaying}
          >
            <View style={styles.voiceIconContainer}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color="#ffd700"
              />
            </View>
            <View style={styles.voiceWaveform}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: Math.random() * 20 + 10,
                      backgroundColor: isOwn ? '#ffd700' : '#1a237e',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.voiceDuration, { color: isOwn ? '#ffd700' : '#1a237e' }]}>
              {message.attachments?.[0]?.duration || '0:00'}s
            </Text>
          </TouchableOpacity>
        );

      case 'image':
        return (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: message.attachments?.[0]?.url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
            {message.content && (
              <Text style={[styles.messageText, styles.imageCaption]}>
                {message.content}
              </Text>
            )}
          </View>
        );

      default:
        return (
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {message.content}
          </Text>
        );
    }
  };

  const reactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  return (
    <Animated.View
      style={[
        styles.container,
        isOwn ? styles.ownMessage : styles.otherMessage,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        style={styles.messageContainer}
      >
        {!isOwn && showAvatar && (
          <Image
            source={{
              uri: message.sender?.avatar_url || 'https://randomuser.me/api/portraits/men/1.jpg',
            }}
            style={styles.avatar}
          />
        )}

        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {isOwn ? (
            <LinearGradient
              colors={['#ffd700', '#ffb300']}
              style={styles.bubbleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {renderContent()}
            </LinearGradient>
          ) : (
            <BlurView intensity={80} style={styles.bubbleBlur}>
              <View style={[styles.bubbleContent, styles.otherBubbleContent]}>
                {renderContent()}
              </View>
            </BlurView>
          )}

          {/* Message status and time */}
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
              {formatTime(message.created_at)}
            </Text>
            {isOwn && (
              <View style={styles.messageStatus}>
                <Ionicons
                  name={message.viewed ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={message.viewed ? '#4CAF50' : 'rgba(255, 255, 255, 0.7)'}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Reactions popup */}
      {showReactions && (
        <View style={[styles.reactionsContainer, isOwn ? styles.ownReactions : styles.otherReactions]}>
          {reactions.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionButton}
              onPress={() => {
                onReact?.(emoji);
                setShowReactions(false);
              }}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => {
              onReply?.();
              setShowReactions(false);
            }}
          >
            <Ionicons name="arrow-undo" size={18} color="#1a237e" />
          </TouchableOpacity>
        </View>
      )}

      {/* Message reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <View style={[styles.messageReactions, isOwn ? styles.ownMessageReactions : styles.otherMessageReactions]}>
          {message.reactions.map((reaction, index) => (
            <View key={index} style={styles.reactionBubble}>
              <Text style={styles.reactionText}>{reaction.emoji}</Text>
              <Text style={styles.reactionCount}>{reaction.count}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  bubble: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  ownBubble: {
    marginLeft: 'auto',
    borderBottomRightRadius: 8,
  },
  otherBubble: {
    borderBottomLeftRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(26, 35, 126, 0.1)',
  },
  bubbleGradient: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  bubbleBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  bubbleContent: {
    borderRadius: 20,
  },
  otherBubbleContent: {
    backgroundColor: 'rgba(26, 35, 126, 0.05)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1a237e',
    fontWeight: '500',
  },
  ownMessageText: {
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(26, 35, 126, 0.6)',
    fontWeight: '400',
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageStatus: {
    marginLeft: 4,
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 180,
  },
  voiceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 8,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  voiceDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  imageCaption: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: '100%',
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(26, 35, 126, 0.1)',
  },
  ownReactions: {
    right: 0,
  },
  otherReactions: {
    left: 44,
  },
  reactionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  replyButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageReactions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  ownMessageReactions: {
    justifyContent: 'flex-end',
  },
  otherMessageReactions: {
    justifyContent: 'flex-start',
    marginLeft: 44,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  reactionText: {
    fontSize: 14,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 12,
    color: '#1a237e',
    fontWeight: '600',
  },
});

export default ChatBubble;
