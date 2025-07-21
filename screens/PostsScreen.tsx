import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import PostCard from '../components/PostCard';
import { PostCreateModal } from '../components/post/PostCreateModal';
import { usePostsStore } from '../store/postsStore';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const PostsScreen = () => {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const { posts, loading, error, fetchPosts, createPost } = usePostsStore();
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

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  const handleCreatePost = async (postData: any) => {
    try {
      await createPost(postData);
      setShowCreatePost(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item, index }: { item: any; index: number }) => {
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
          styles.postContainer,
          {
            opacity: itemAnim,
            transform: [{
              translateY: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <PostCard post={item} />
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Svg height="120" width="120" viewBox="0 0 120 120">
        <Defs>
          <SvgLinearGradient id="emptyGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#D4A574" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#1A237E" stopOpacity="0.2" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx="60" cy="60" r="50" fill="url(#emptyGrad)" opacity="0.5" />
        <Path d="M40 40 L80 40 L80 80 L40 80 Z" fill="url(#emptyGrad)" opacity="0.7" />
      </Svg>

      <ThemedText style={styles.emptyTitle}>No Posts Yet</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Be the first to share something amazing with your friends!
      </ThemedText>
    </View>
  );

  if (!user) {
    return (
      <LinearGradient colors={['#FFFFFF', '#F8F9FA', '#E8F4FD']} style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4A574" />
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
            <ThemedText style={styles.title}>Posts</ThemedText>
            <TouchableOpacity 
              onPress={() => setShowCreatePost(true)}
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

          {/* Posts List */}
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#D4A574']}
                tintColor="#D4A574"
              />
            }
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#D4A574" />
              <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
            </View>
          )}

          {/* Create Post Modal */}
          <PostCreateModal
            visible={showCreatePost}
            onClose={() => setShowCreatePost(false)}
            onSubmit={handleCreatePost}
          />
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
  postContainer: {
    marginBottom: 16,
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
});

export default PostsScreen;