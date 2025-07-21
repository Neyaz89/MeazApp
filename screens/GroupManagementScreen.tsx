
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Modal, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { GroupManager } from '../components/group/GroupManager';
import { useTheme } from '../components/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const GroupManagementScreen = () => {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const { theme } = useTheme();
  const themeColors = Colors[theme] || Colors.light;
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
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

  // Safety check - don't render if user is not available
  if (!user) {
    return (
      <LinearGradient colors={['#FFFFFF', '#F8F9FA', '#E8F4FD']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4A574" />
            <ThemedText style={styles.loadingText}>Loading user data...</ThemedText>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    if (!user) return;
    // Fetch groups where user is a member
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('type', 'group')
      .contains('participants', [user.id]);
    if (error) setError(error.message);
    setGroups(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setLoading(true);
    setError(null);
    if (!user) return;
    const { data, error } = await supabase
      .from('chats')
      .insert([{ 
        name: groupName, 
        description: groupDescription, 
        type: 'group', 
        participants: [user.id], 
        created_by: user.id 
      }]);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setGroupName('');
    setGroupDescription('');
    setShowCreateGroup(false);
    fetchGroups();
  };

  const renderGroupItem = ({ item, index }: { item: any; index: number }) => {
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
          styles.groupItemContainer,
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
          onPress={() => { setSelectedGroupId(item.id); setShowGroupManager(true); }}
          activeOpacity={0.8}
        >
          <BlurView intensity={40} style={styles.groupItemBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.groupItem}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Group Avatar */}
              <View style={styles.groupAvatarContainer}>
                <LinearGradient
                  colors={['#D4A574', '#C8956D']}
                  style={styles.groupAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="people" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Group Info */}
              <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupName}>{item.name}</ThemedText>
                  {item.isAdmin && (
                    <View style={styles.adminBadge}>
                      <LinearGradient
                        colors={['#4ECDC4', '#44A08D']}
                        style={styles.adminBadgeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <ThemedText style={styles.adminText}>Admin</ThemedText>
                      </LinearGradient>
                    </View>
                  )}
                </View>
                
                <ThemedText style={styles.groupMembers}>
                  {item.members || item.participants?.length || 0} members
                </ThemedText>
                
                {item.description && (
                  <ThemedText style={styles.groupDescription} numberOfLines={2}>
                    {item.description}
                  </ThemedText>
                )}
                
                <ThemedText style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || 'No messages yet'}
                </ThemedText>
              </View>

              {/* Group Actions */}
              <View style={styles.groupActions}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => { setSelectedGroupId(item.id); setShowGroupManager(true); }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(212, 165, 116, 0.2)', 'rgba(200, 149, 109, 0.1)']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="settings-outline" size={20} color="#D4A574" />
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <LinearGradient
                    colors={['rgba(212, 165, 116, 0.2)', 'rgba(200, 149, 109, 0.1)']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="people-outline" size={20} color="#D4A574" />
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
        <Circle cx="45" cy="50" r="8" fill="url(#emptyGrad)" opacity="0.7" />
        <Circle cx="75" cy="50" r="8" fill="url(#emptyGrad)" opacity="0.7" />
        <Circle cx="60" cy="70" r="8" fill="url(#emptyGrad)" opacity="0.7" />
      </Svg>
      
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptySubtitle}>Create or join a group to start collaborating with others</Text>
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
            <ThemedText style={styles.title}>My Groups</ThemedText>
            <TouchableOpacity 
              onPress={() => setShowCreateGroup(true)}
              style={styles.createButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#D4A574', '#C8956D']}
                style={styles.createButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Groups List */}
          <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#D4A574" />
              <Text style={styles.loadingOverlayText}>Loading groups...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Create Group Modal */}
          <Modal visible={showCreateGroup} transparent animationType="fade">
            <BlurView intensity={80} style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                  style={styles.createGroupModal}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <ThemedText style={styles.modalTitle}>Create New Group</ThemedText>
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Group name"
                    placeholderTextColor="rgba(26, 35, 126, 0.5)"
                    value={groupName}
                    onChangeText={setGroupName}
                  />
                  
                  <TextInput
                    style={[styles.modalInput, styles.descriptionInput]}
                    placeholder="Group description (optional)"
                    placeholderTextColor="rgba(26, 35, 126, 0.5)"
                    value={groupDescription}
                    onChangeText={setGroupDescription}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.modalButton}
                      onPress={handleCreateGroup}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#D4A574', '#C8956D']}
                        style={styles.modalButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <ThemedText style={styles.modalButtonText}>Create Group</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.modalButton}
                      onPress={() => setShowCreateGroup(false)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['rgba(26, 35, 126, 0.8)', 'rgba(26, 35, 126, 0.6)']}
                        style={styles.modalButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    onPress={() => setShowCreateGroup(false)} 
                    style={styles.closeButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={32} color="#D4A574" />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </BlurView>
          </Modal>

          {/* GroupManager Modal */}
          <Modal visible={showGroupManager} transparent animationType="fade">
            <BlurView intensity={80} style={styles.modalOverlay}>
              <View style={styles.modalContainer}> 
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                  style={styles.createGroupModal}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {selectedGroupId && <GroupManager groupId={selectedGroupId} />}
                  <TouchableOpacity 
                    onPress={() => setShowGroupManager(false)} 
                    style={styles.closeButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={32} color="#D4A574" />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </BlurView>
          </Modal>
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
    bottom: 200,
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
  createButton: {
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  createButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
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
  groupItemContainer: {
    marginBottom: 16,
  },
  groupItemBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  groupAvatarContainer: {
    marginRight: 16,
  },
  groupAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginRight: 12,
  },
  adminBadge: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  adminBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  groupMembers: {
    fontSize: 13,
    color: 'rgba(26, 35, 126, 0.6)',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 13,
    color: 'rgba(26, 35, 126, 0.5)',
    marginBottom: 6,
    lineHeight: 18,
  },
  lastMessage: {
    fontSize: 14,
    color: 'rgba(26, 35, 126, 0.7)',
  },
  groupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(26, 35, 126, 0.1)',
    marginHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A237E',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A237E',
  },
  errorContainer: {
    padding: 16,
    margin: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  createGroupModal: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A237E',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
});

export default GroupManagementScreen;
