
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface VoiceNotePlayerProps {
  audioUri: string;
  duration: number;
  isOwnMessage?: boolean;
}

export default function VoiceNotePlayer({ audioUri, duration, isOwnMessage }: VoiceNotePlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return sound ? () => {
      sound.unloadAsync();
    } : undefined;
  }, [sound]);

  useEffect(() => {
    loadAudio();
  }, [audioUri]);

  const loadAudio = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: false,
          isLooping: false,
        },
        onPlaybackStatusUpdate
      );
      setSound(sound);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      
      const progress = status.durationMillis ? status.positionMillis / status.durationMillis : 0;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        progressAnim.setValue(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!sound || !isLoaded) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessage]}>
      <TouchableOpacity 
        onPress={togglePlayback}
        disabled={!isLoaded}
        style={styles.playButton}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isOwnMessage ? ['#2C5F7C', '#1E3A8A'] : ['#D4A574', '#C8956D']}
          style={styles.playButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={16}
            color="#FFFFFF"
          />
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
                backgroundColor: isOwnMessage ? '#2C5F7C' : '#D4A574',
              },
            ]}
          />
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isOwnMessage && styles.ownMessageText]}>
            {formatTime(position)}
          </Text>
          <Text style={[styles.timeText, styles.durationText, isOwnMessage && styles.ownMessageText]}>
            {formatTime(duration * 1000)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ownMessage: {
    backgroundColor: '#F0F8FF',
  },
  playButton: {
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  durationText: {
    opacity: 0.7,
  },
  ownMessageText: {
    color: '#2C5F7C',
  },
});
