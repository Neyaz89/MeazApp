
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CallService from './CallService';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');

interface CallInterfaceProps {
  visible: boolean;
  call: any;
  onClose: () => void;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ visible, call, onClose }) => {
  const [callStatus, setCallStatus] = useState(call?.status || 'ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(call?.type === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState(null);
  
  const { user } = useAuthStore();
  const pulseAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(height);

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Pulse animation for incoming calls
      if (callStatus === 'ringing') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
      }

      // Load caller information
      loadCallerInfo();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, callStatus]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'accepted') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  const loadCallerInfo = async () => {
    // Load caller information from your backend
    // This is a placeholder - implement according to your data structure
    setCallerInfo({
      name: 'John Doe',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async () => {
    try {
      await CallService.answerCall(call.id);
      setCallStatus('accepted');
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleReject = async () => {
    try {
      await CallService.rejectCall(call.id);
      onClose();
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await CallService.endCall(call.id);
      onClose();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Implement actual mute functionality
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    // Implement actual camera toggle
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Implement actual speaker toggle
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <BlurView intensity={100} style={styles.container}>
        <Animated.View 
          style={[
            styles.callInterface,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#1a237e', '#3949ab', '#5c6bc0']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Status Bar */}
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>
                {callStatus === 'ringing' ? 'Incoming call...' :
                 callStatus === 'calling' ? 'Calling...' :
                 callStatus === 'accepted' ? formatDuration(callDuration) : 'Call ended'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.minimizeButton}>
                <Ionicons name="chevron-down" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Caller Information */}
            <View style={styles.callerSection}>
              <Animated.View 
                style={[
                  styles.avatarContainer,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <Image
                  source={{ uri: callerInfo?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                  style={styles.callerAvatar}
                />
                <View style={styles.avatarBorder} />
              </Animated.View>
              
              <Text style={styles.callerName}>
                {callerInfo?.name || 'Unknown Caller'}
              </Text>
              
              <View style={styles.callTypeContainer}>
                <Ionicons 
                  name={call?.type === 'video' ? 'videocam' : 'call'} 
                  size={20} 
                  color="#ffd700" 
                />
                <Text style={styles.callType}>
                  {call?.type === 'video' ? 'Video Call' : 'Audio Call'}
                </Text>
              </View>
            </View>

            {/* Call Controls */}
            <View style={styles.controlsSection}>
              {callStatus === 'ringing' ? (
                // Incoming call controls
                <View style={styles.incomingControls}>
                  <TouchableOpacity 
                    style={[styles.controlButton, styles.rejectButton]}
                    onPress={handleReject}
                  >
                    <Ionicons name="call" size={32} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.controlButton, styles.answerButton]}
                    onPress={handleAnswer}
                  >
                    <Ionicons name="call" size={32} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                // Active call controls
                <View style={styles.activeControls}>
                  <TouchableOpacity 
                    style={[styles.smallControlButton, isMuted && styles.activeControl]}
                    onPress={toggleMute}
                  >
                    <Ionicons 
                      name={isMuted ? 'mic-off' : 'mic'} 
                      size={24} 
                      color={isMuted ? '#ffd700' : 'white'} 
                    />
                  </TouchableOpacity>

                  {call?.type === 'video' && (
                    <TouchableOpacity 
                      style={[styles.smallControlButton, !isCameraOn && styles.activeControl]}
                      onPress={toggleCamera}
                    >
                      <Ionicons 
                        name={isCameraOn ? 'videocam' : 'videocam-off'} 
                        size={24} 
                        color={isCameraOn ? 'white' : '#ffd700'} 
                      />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.smallControlButton, isSpeakerOn && styles.activeControl]}
                    onPress={toggleSpeaker}
                  >
                    <Ionicons 
                      name={isSpeakerOn ? 'volume-high' : 'volume-low'} 
                      size={24} 
                      color={isSpeakerOn ? '#ffd700' : 'white'} 
                    />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.controlButton, styles.endCallButton]}
                    onPress={handleEndCall}
                  >
                    <Ionicons name="call" size={28} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  callInterface: {
    height: height * 0.9,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradient: {
    flex: 1,
    paddingTop: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  minimizeButton: {
    padding: 8,
  },
  callerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  callerAvatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: '#ffd700',
  },
  avatarBorder: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    top: -10,
    left: -10,
  },
  callerName: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callType: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  controlsSection: {
    paddingBottom: 40,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  smallControlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  answerButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
    transform: [{ rotate: '135deg' }],
  },
  endCallButton: {
    backgroundColor: '#f44336',
    transform: [{ rotate: '135deg' }],
  },
  activeControl: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
});

export default CallInterface;
