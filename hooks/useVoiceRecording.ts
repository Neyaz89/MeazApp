import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export const useVoiceRecording = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting voice recording...');

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(newRecording);
      setIsRecording(true);
      console.log('✅ Voice recording started');
    } catch (error) {
      console.error('❌ Error starting voice recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return null;

    try {
      console.log('🛑 Stopping voice recording...');
      setIsRecording(false);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI found');
      }

      console.log('✅ Voice recording stopped, URI:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Error stopping voice recording:', error);
      throw error;
    }
  }, [recording]);

  const uploadVoiceNote = async (uri: string, chatId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsUploading(true);
      console.log('📤 Uploading voice note...');

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Voice file does not exist');
      }

      // Create unique filename
      const fileName = `voice_${Date.now()}_${user.id}.m4a`;

      // Read file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, decode(fileBase64), {
          contentType: 'audio/m4a',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(uploadData.path);

      // Get audio duration (estimate based on file size)
      const duration = Math.round(fileInfo.size / 16000); // rough estimate

      // Create voice note record
      const { data: voiceNote, error: insertError } = await supabase
        .from('voice_notes')
        .insert({
          user_id: user.id,
          url: publicUrl,
          duration: duration,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Send as message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: 'Voice message',
          type: 'voice',
          audio_url: publicUrl,
          attachments: [{
            id: voiceNote.id,
            type: 'audio',
            url: publicUrl,
            duration: duration,
          }],
        })
        .select('*, sender:users(*)')
        .single();

      if (messageError) throw messageError;

      console.log('✅ Voice note uploaded and message sent:', message);
      return message;
    } catch (error) {
      console.error('❌ Error uploading voice note:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const playVoiceNote = async (url: string) => {
    try {
      console.log('▶️ Playing voice note:', url);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );

      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });

      console.log('✅ Voice note playing');
    } catch (error) {
      console.error('❌ Error playing voice note:', error);
      throw error;
    }
  };

  return {
    startRecording,
    stopRecording,
    uploadVoiceNote,
    playVoiceNote,
    isRecording,
    isUploading,
  };
};

// Helper function to decode base64
function decode(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}