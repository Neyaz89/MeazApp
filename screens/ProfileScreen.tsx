import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { useToast } from '../components/ui/Toast';
import { addPostComment, deletePostComment, fetchFollowers, fetchFollowing, fetchPostComments, fetchPostLikes, fetchSavedPosts, fetchTaggedPosts, fetchUserPosts, fetchUserProfile, followUser, isBlocked, likePost, supabase, unfollowUser, unlikePost, updatePostComment, updateUserProfile, uploadFile } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

const TABS = [
  { key: 'posts', label: 'Posts', icon: 'grid-outline' },
  { key: 'reels', label: 'Reels', icon: 'film-outline' },
  { key: 'tagged', label: 'Tagged', icon: 'pricetag-outline' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
];

const { width } = Dimensions.get('window');
const GRID_SIZE = 3;
const THUMB_SIZE = width / GRID_SIZE - 4;

export default function ProfileScreen() {
  const route = useRoute<any>();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  // Debug: Log navigation params and currentUser
  console.log('[ProfileScreen] route.params:', route.params);
  console.log('[ProfileScreen] currentUser:', currentUser);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const toast = useToast();
  const [shareModal, setShareModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [postDetails, setPostDetails] = useState<any>(null);
  const [editProfile, setEditProfile] = useState({ display_name: '', bio: '', status: '', avatar_url: '', is_private: false });
  const navigation = useNavigation();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [customizerModal, setCustomizerModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(profile?.privacy_settings || {});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const { friends: allFriends, loadFriends } = useFriendsStore();
  // 1. Add state for full friend objects
  const [profileFriends, setProfileFriends] = useState<any[]>([]);
  const [friendsModal, setFriendsModal] = useState(false);
  const { signOut } = useAuthStore();
  const [settingsModal, setSettingsModal] = useState(false);

  // Determine whose profile to show
  const paramUserId = route.params?.userId || route.params?.username || currentUser?.id;
  const [profileUserIdOrUsername, setProfileUserIdOrUsername] = useState(paramUserId);
  // Debug: Log which userId/username is being used
  useEffect(() => {
    console.log('[ProfileScreen] setProfileUserIdOrUsername:', route.params?.userId, route.params?.username, currentUser?.id);
    setProfileUserIdOrUsername(route.params?.userId || route.params?.username || currentUser?.id);
  }, [route.params, currentUser?.id]);

  // Fetch profile and stats
  useEffect(() => {
    let mounted = true;
      setLoading(true);
    (async () => {
      console.log('[ProfileScreen] Fetching profile for:', profileUserIdOrUsername);
      if (!currentUser || !currentUser.id) {
        setProfile(null);
        setLoading(false);
        console.log('[ProfileScreen] Not logged in');
        toast.error('Not logged in.');
        return;
      }
      try {
        let prof = null;
        let canView = true;
        try {
          prof = await fetchUserProfile(profileUserIdOrUsername);
          console.log('[ProfileScreen] fetchUserProfile result:', prof);
        } catch (e: any) {
          console.error('[ProfileScreen] fetchUserProfile error:', e);
          // If fetching your own profile and it doesn't exist, auto-create
          if (profileUserIdOrUsername === currentUser.id) {
            try {
              await supabase.from('users').insert({
                id: currentUser.id,
                email: currentUser.email || '',
                username: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : `user_${currentUser.id.slice(0, 8)}`),
                display_name: currentUser.displayName || currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'New User'),
                avatar_url: currentUser.avatar || '',
                bio: currentUser.bio || '',
                status: currentUser.status || 'online',
              });
              prof = await fetchUserProfile(currentUser.id);
              console.log('[ProfileScreen] Auto-created profile:', prof);
            } catch (insertErr: any) {
              console.error('[ProfileScreen] Profile auto-insert error:', insertErr);
              toast.error('Failed to auto-create profile: ' + (insertErr?.message || insertErr));
              setProfile(null);
              setLoading(false);
              return;
            }
        } else {
            toast.error('Failed to load profile: ' + (e?.message || e));
            setProfile(null);
            setLoading(false);
            return;
          }
        }
        // Privacy logic
        if (profileUserIdOrUsername !== currentUser.id && currentUser && prof && prof.id !== currentUser.id) {
          if (prof.is_private) {
            const { data: friends, error: friendsError } = await supabase
              .from('friends')
              .select('*')
              .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${prof.id}),and(user_id.eq.${prof.id},friend_id.eq.${currentUser.id})`)
              .eq('status', 'accepted');
            if (friendsError) throw friendsError;
            canView = friends && friends.length > 0;
            console.log('[ProfileScreen] Privacy check, canView:', canView, 'friends:', friends);
          }
        }
        if (!mounted) return;
        setProfile(canView ? prof : null);
        setIsOwner(prof.id === currentUser.id);
        setBlocked(currentUser && prof.id !== currentUser.id ? await isBlocked(currentUser.id, prof.id) : false);
        const [f, g] = await Promise.all([
          fetchFollowers(prof.id),
          fetchFollowing(prof.id),
        ]);
        setFollowers(f || []);
        setFollowing(g || []);
        if (currentUser && prof.id !== currentUser.id) {
          setIsFollowing(!!f.find((x: any) => x.follower_id === currentUser.id));
        }
      } catch (e: any) {
        console.error('[ProfileScreen] Profile load error:', e);
        setProfile(null);
        toast.error('Failed to load profile: ' + (e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profileUserIdOrUsername, currentUser]);

  useEffect(() => {
    if (profile && isOwner) {
      setEditProfile({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        status: profile.status || '',
        avatar_url: profile.avatar_url || '',
        is_private: profile.is_private || false,
      });
    }
  }, [profile, isOwner]);

  // Fetch posts for current tab
  const fetchTabPosts = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let data = [];
      if (tab === 'posts') data = await fetchUserPosts(profile.id);
      else if (tab === 'tagged') data = await fetchTaggedPosts(profile.id);
      else if (tab === 'saved' && isOwner) data = await fetchSavedPosts(profile.id);
      // TODO: Reels logic (vertical video feed)
      setPosts(data || []);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tab, profile, isOwner]);

  useEffect(() => { fetchTabPosts(); }, [tab, fetchTabPosts]);

  // Fetch Reels (video posts)
  const fetchReels = useCallback(async () => {
    if (!profile) return [];
    const allPosts = await fetchUserPosts(profile.id);
    return allPosts.filter((p: any) => p.media && p.media[0]?.type === 'video');
  }, [profile]);
  const [reels, setReels] = useState<any[]>([]);
  useEffect(() => {
    if (tab === 'reels') {
      fetchReels().then(setReels);
    }
  }, [tab, fetchReels]);

  // Follow/unfollow
  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    await followUser(currentUser.id, profile.id);
    setIsFollowing(true);
    setFollowers((prev) => [...prev, { follower_id: currentUser.id }]);
  };
  const handleUnfollow = async () => {
    if (!currentUser || !profile) return;
    await unfollowUser(currentUser.id, profile.id);
    setIsFollowing(false);
    setFollowers((prev) => prev.filter((f) => f.follower_id !== currentUser.id));
  };

  // Share profile link logic
  const profileLink = profile ? `https://meaz.app/user/${profile.username}` : '';
  const handleCopyLink = () => {
    if (!profile) return;
    Clipboard.setStringAsync(profileLink);
    toast.success('Profile link copied!');
  };

  // Edit profile logic
  const handleSaveProfile = async () => {
    try {
      // Only include fields that exist in the type
      const updateFields: any = {
        display_name: editProfile.display_name,
        bio: editProfile.bio,
        status: editProfile.status as any,
        avatar_url: editProfile.avatar_url,
      };
      // If your users table has is_private, include it; otherwise, remove this line
      if ('is_private' in profile) updateFields.is_private = editProfile.is_private;
      await updateUserProfile(profile.id, updateFields);
      toast.success('Profile updated!');
      setEditModal(false);
    } catch (e) {
      toast.error('Failed to update profile.');
    }
  };

  // Avatar upload logic
  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUploading(true);
      try {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop();
        const fileName = `avatars/${profile.id}_${Date.now()}.${ext}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const publicUrl = await uploadFile(blob, fileName);
        setEditProfile((p) => ({ ...p, avatar_url: publicUrl }));
        toast.success('Avatar updated!');
      } catch (e) {
        toast.error('Failed to upload avatar.');
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  // Message/Call logic
  const handleMessage = async () => {
    if (!currentUser || !profile) return;
    try {
      const { data, error } = await supabase.rpc('start_or_get_chat', { user_a: currentUser.id, user_b: profile.id });
      if (error) throw error;
      (navigation as any).navigate('ChatDetail', { chatId: data });
    } catch (e) {
      toast.error('Failed to start chat.');
    }
  };
  const handleCall = async () => {
    if (!currentUser || !profile) return;
    try {
      const { data: channelId, error } = await supabase.rpc('start_call', { caller: currentUser.id, receiver: profile.id, call_type: 'audio' });
      if (error) throw error;
      // Fetch the call row by channel_id to get the UUID id
      const { data: callRow, error: callError } = await supabase
        .from('calls')
        .select('id')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (callError) throw callError;
      (navigation as any).navigate('CallInterface', { callId: callRow.id });
    } catch (e) {
      toast.error('Failed to start call.');
    }
  };

  // Video Call logic
  const handleVideoCall = async () => {
    if (!currentUser || !profile) return;
    try {
      const { data: channelId, error } = await supabase.rpc('start_call', { caller: currentUser.id, receiver: profile.id, call_type: 'video' });
      if (error) throw error;
      // Fetch the call row by channel_id to get the UUID id
      const { data: callRow, error: callError } = await supabase
        .from('calls')
        .select('id')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (callError) throw callError;
      (navigation as any).navigate('CallInterface', { callId: callRow.id });
    } catch (e) {
      toast.error('Failed to start video call.');
    }
  };

  // Post details logic (likes/comments)
  useEffect(() => {
    if (postDetails && currentUser) {
      fetchPostLikes(postDetails.id).then(setLikes).catch(() => setLikes([]));
      fetchPostComments(postDetails.id).then(setComments).catch(() => setComments([]));
      setLiked(!!likes.find((l) => l.user_id === currentUser.id));
    }
  }, [postDetails]);

  const handleLike = async () => {
    if (!postDetails || !currentUser) return;
    try {
      if (liked) {
        await unlikePost(postDetails.id, currentUser.id);
        setLiked(false);
        setLikes((prev) => prev.filter((l) => l.user_id !== currentUser.id));
      } else {
        await likePost(postDetails.id, currentUser.id);
        setLiked(true);
        setLikes((prev) => [...prev, { user_id: currentUser.id, user: currentUser }]);
      }
    } catch (e) {
      toast.error('Failed to update like.');
    }
  };
  const handleAddComment = async () => {
    if (!postDetails || !currentUser || !commentText.trim()) return;
    try {
      await addPostComment(postDetails.id, currentUser.id, commentText.trim());
      setComments((prev) => [...prev, { user_id: currentUser.id, content: commentText.trim(), user: currentUser }]);
      setCommentText('');
    } catch (e) {
      toast.error('Failed to add comment.');
    }
  };

  const handleEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };
  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    try {
      await updatePostComment(editingCommentId, editingCommentText.trim());
      setComments(prev => prev.map(c => c.id === editingCommentId ? { ...c, content: editingCommentText.trim() } : c));
      setEditingCommentId(null);
      setEditingCommentText('');
      toast.success('Comment updated');
    } catch (e) {
      toast.error('Failed to update comment');
    }
  };
  const handleDeleteComment = async (comment: any) => {
    if (!currentUser) return;
    try {
      await deletePostComment(comment.id, currentUser.id);
      setComments(prev => prev.filter(c => c.id !== comment.id));
      toast.success('Comment deleted');
    } catch (e) {
      toast.error('Failed to delete comment');
    }
  };

  // 2. Fetch full friend user objects for the profile being viewed
  useEffect(() => {
    async function fetchProfileFriends() {
      if (!profile) return setProfileFriends([]);
      // If viewing own profile, use global store for instant updates
      if (isOwner) {
        setProfileFriends(allFriends);
        return;
      }
      // Otherwise, fetch from backend
      const { data: friends1, error: error1 } = await supabase
        .from('friends')
        .select(`
          friend_id,
          users:users!friends_friend_id_fkey (
            id, username, display_name, avatar_url, status, bio
          )
        `)
        .eq('user_id', profile.id);
      const { data: friends2, error: error2 } = await supabase
        .from('friends')
        .select(`
          user_id,
          users:users!friends_user_id_fkey (
            id, username, display_name, avatar_url, status, bio
          )
        `)
        .eq('friend_id', profile.id);
      console.log('[ProfileScreen] friends1:', friends1, 'error1:', error1);
      console.log('[ProfileScreen] friends2:', friends2, 'error2:', error2);
      if (error1 || error2) {
        setProfileFriends([]);
        return;
      }
      const formatted1 = (friends1 || []).map((f: any) => f.users).filter(Boolean);
      const formatted2 = (friends2 || []).map((f: any) => f.users).filter(Boolean);
      const all = [...formatted1, ...formatted2].filter((f, i, arr) => arr.findIndex(ff => ff.id === f.id) === i);
      console.log('[ProfileScreen] profileFriends (all):', all);
      setProfileFriends(all);
    }
    fetchProfileFriends();
  }, [profile, isOwner, allFriends]);

  // Render post grid item
  const renderPostItem = ({ item }: { item: any }) => {
    const media = item.media && item.media[0];
    return (
      <TouchableOpacity style={styles.gridItem}>
        {media && media.type === 'image' && (
          <Image source={{ uri: media.url }} style={styles.gridThumb} />
        )}
        {media && media.type === 'video' && (
          <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
        )}
        {(!media || media.type === 'text') && (
          <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="document-text-outline" size={32} color="#888" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Post details logic
  const handleOpenPost = (item: any) => setPostDetails(item);
  const handleClosePost = () => setPostDetails(null);

  try {
    if (loading) {
      console.log('[ProfileScreen] UI: loading spinner');
      return <View style={styles.loading}><ActivityIndicator size="large" color="#FF6B35" /></View>;
    }
    if (!currentUser || !currentUser.id) {
      console.log('[ProfileScreen] UI: not logged in');
      return <View style={styles.loading}><Text>Not logged in.</Text></View>;
    }
    if (!profile) {
      console.log('[ProfileScreen] profile is null, showing error UI');
      return (
        <View style={styles.loading}>
          <Text style={{ marginBottom: 12 }}>
            {profileUserIdOrUsername !== currentUser?.id
              ? 'This account is private or not found.'
              : 'Profile not found.'}
          </Text>
          <TouchableOpacity onPress={() => setProfileUserIdOrUsername(currentUser?.id)} style={{ backgroundColor: '#FF6B35', borderRadius: 8, padding: 12 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
    </TouchableOpacity>
        </View>
    );
  }
    console.log('[ProfileScreen] Rendering profile UI for:', profile);
    // FORCE VISIBLE TEST UI + PROFILE HEADER
  return (
  <View style={{ flex: 1, backgroundColor: '#f7fafd' }}>
    {/* Glassy Banner with SVG Wave */}
    <View style={{ height: 160, position: 'relative', marginBottom: -60 }}>
      <Image source={{ uri: profile.cover_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' }} style={{ width: '100%', height: 160, position: 'absolute' }} resizeMode="cover" />
      <BlurView intensity={40} tint="light" style={{ ...StyleSheet.absoluteFillObject }} />
      {/* SVG Wave */}
      <Svg height="60" width="100%" viewBox="0 0 400 60" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <Defs>
          <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#f7fafd" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#f7fafd" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path d="M0,30 Q100,60 200,30 T400,30 V60 H0 Z" fill="url(#waveGrad)" />
      </Svg>
    </View>
    {/* Profile Card */}
    <View style={{ marginHorizontal: 18, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.85)', padding: 18, marginTop: -40, alignItems: 'center', shadowColor: '#b0c4de', shadowOpacity: 0.18, shadowRadius: 18, elevation: 8, borderWidth: 1, borderColor: 'rgba(200,200,220,0.13)' }}>
      {/* Avatar with SVG Glow */}
      <View style={{ marginBottom: 8, position: 'relative' }}>
        <Svg height="120" width="120" style={{ position: 'absolute', top: -10, left: -10, zIndex: 0 }}>
          <Ellipse cx="60" cy="60" rx="54" ry="54" fill="url(#avatarGlow)" opacity="0.18" />
          <Defs>
            <LinearGradient id="avatarGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#00bfae" />
              <Stop offset="100%" stopColor="#ffb300" />
            </LinearGradient>
          </Defs>
        </Svg>
        <TouchableOpacity onPress={() => setAvatarModal(true)}>
          <Image source={{ uri: profile.avatar_url && profile.avatar_url.trim() !== '' ? profile.avatar_url : 'https://picsum.photos/200/200?random=1' }} style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee', borderWidth: 3, borderColor: '#fff' }} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#232526', marginBottom: 2, textShadowColor: '#e0e7ef', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>{profile.display_name || profile.username}</Text>
      <Text style={{ fontSize: 15, color: '#888', marginBottom: 6 }}>@{profile.username}</Text>
      {profile.bio ? (
        <Text style={{ fontSize: 14, color: '#444', textAlign: 'center', marginHorizontal: 12, marginBottom: 6 }}>{profile.bio}</Text>
      ) : null}
      {/* Stats Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 6, marginBottom: 2 }}>
        <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222' }}>{posts.length}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>Posts</Text>
        </View>
        <TouchableOpacity style={{ alignItems: 'center', marginHorizontal: 16 }} onPress={() => setFriendsModal(true)}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222' }}>{profileFriends.length}</Text>
          <Text style={{ fontSize: 12, color: '#00bfae', textDecorationLine: 'underline' }}>Friends</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222' }}>{following.length}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>Following</Text>
        </View>
      </View>
      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 2, flexWrap: 'wrap', width: '100%' }}>
        {isOwner ? (
          <>
            <TouchableOpacity
              style={{
                backgroundColor: '#00bfae',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 22,
                marginHorizontal: 6,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#00bfae',
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 2,
              }}
              onPress={() => setEditModal(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#FF6B35',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 22,
                marginHorizontal: 6,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#FF6B35',
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 2
              }}
              onPress={async () => {
                await signOut();
                if (navigation && navigation.reset) {
                  navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
                }
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={{
                backgroundColor: '#00bfae',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 22,
                marginHorizontal: 6,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#00bfae',
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 2,
              }}
              onPress={handleMessage}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#fff',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 22,
                marginHorizontal: 6,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#00bfae',
                shadowColor: '#00bfae',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 1,
              }}
              onPress={handleCall}
            >
              <Ionicons name="call-outline" size={18} color="#00bfae" style={{ marginRight: 8 }} />
              <Text style={{ color: '#00bfae', fontWeight: 'bold' }}>Audio Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#fff',
                borderRadius: 18,
                paddingVertical: 8,
                paddingHorizontal: 22,
                marginHorizontal: 6,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#00bfae',
                shadowColor: '#00bfae',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 1,
              }}
              onPress={handleVideoCall}
            >
              <Ionicons name="videocam-outline" size={18} color="#00bfae" style={{ marginRight: 8 }} />
              <Text style={{ color: '#00bfae', fontWeight: 'bold' }}>Video Call</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            paddingVertical: 8,
            paddingHorizontal: 22,
            marginHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ffb300',
            shadowColor: '#ffb300',
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 1,
          }}
          onPress={handleCopyLink}
        >
          <Ionicons name="share-social-outline" size={18} color="#ffb300" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ffb300', fontWeight: 'bold' }}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal (restored, centered, glassmorphic, with BlurView) */}
      {editModal && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <BlurView intensity={60} tint="light" style={{ ...StyleSheet.absoluteFillObject, zIndex: 101 }} />
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderRadius: 28,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#00bfae',
            shadowOpacity: 0.10,
            shadowRadius: 24,
            elevation: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(200,200,220,0.13)',
          }}>
            {/* Close Button */}
            <TouchableOpacity onPress={() => setEditModal(false)} style={{ position: 'absolute', top: 18, right: 18, zIndex: 2 }}>
              <Ionicons name="close-circle" size={32} color="#00bfae" />
            </TouchableOpacity>
            {/* Avatar Picker */}
            <TouchableOpacity onPress={handlePickAvatar} style={{ marginBottom: 18, marginTop: 8 }}>
              <View style={{
                width: 90, height: 90, borderRadius: 45, backgroundColor: '#f0f0f0',
                borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
                shadowColor: '#00bfae', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
              }}>
                <Image source={{ uri: editProfile.avatar_url && editProfile.avatar_url.trim() !== '' ? editProfile.avatar_url : (profile.avatar_url && profile.avatar_url.trim() !== '' ? profile.avatar_url : 'https://picsum.photos/200/200?random=1') }} style={{ width: 84, height: 84, borderRadius: 42 }} />
                <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#fff', borderRadius: 12, padding: 2 }}>
                  <Ionicons name="camera" size={18} color="#00bfae" />
                </View>
              </View>
            </TouchableOpacity>
            {/* Display Name */}
            <TextInput
              value={editProfile.display_name}
              onChangeText={v => setEditProfile(p => ({ ...p, display_name: v }))}
              placeholder="Display Name"
              style={{
                borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 14,
                width: '100%', backgroundColor: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: 'bold', color: '#232526',
                shadowColor: '#00bfae', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
              }}
              placeholderTextColor="#bbb"
            />
            {/* Bio */}
            <TextInput
              value={editProfile.bio}
              onChangeText={v => setEditProfile(p => ({ ...p, bio: v }))}
              placeholder="Bio"
              multiline
              style={{
                borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 14,
                width: '100%', backgroundColor: 'rgba(255,255,255,0.7)', fontSize: 15, color: '#444', minHeight: 60,
                shadowColor: '#00bfae', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
              }}
              placeholderTextColor="#bbb"
            />
            {/* Status */}
            <TextInput
              value={editProfile.status}
              onChangeText={v => setEditProfile(p => ({ ...p, status: v }))}
              placeholder="Status (online, away, busy, offline)"
              style={{
                borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 18,
                width: '100%', backgroundColor: 'rgba(255,255,255,0.7)', fontSize: 15, color: '#444',
                shadowColor: '#00bfae', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
              }}
              placeholderTextColor="#bbb"
            />
            {/* Private toggle if available */}
            {'is_private' in editProfile && (
              <TouchableOpacity
                onPress={() => setEditProfile(p => ({ ...p, is_private: !p.is_private }))}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}
              >
                <Ionicons name={editProfile.is_private ? 'lock-closed' : 'lock-open'} size={20} color="#00bfae" style={{ marginRight: 8 }} />
                <Text style={{ color: '#00bfae', fontWeight: 'bold' }}>{editProfile.is_private ? 'Private Account' : 'Public Account'}</Text>
              </TouchableOpacity>
            )}
            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={{
                backgroundColor: 'linear-gradient(90deg, #00bfae 0%, #ffb300 100%)',
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 32,
                alignItems: 'center',
                marginTop: 8,
                shadowColor: '#00bfae',
                shadowOpacity: 0.14,
                shadowRadius: 8,
                elevation: 4,
                width: '100%',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
    {/* Profile Tabs */}
    <View style={{ flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fafafa', marginHorizontal: 16, borderRadius: 8, marginTop: 18 }}>
      {TABS.map(t => (
        <TouchableOpacity
          key={t.key}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: tab === t.key ? 2 : 0, borderBottomColor: tab === t.key ? '#00bfae' : 'transparent' }}
          onPress={() => setTab(t.key)}
        >
          <Ionicons name={t.icon as any} size={20} color={tab === t.key ? '#00bfae' : '#bbb'} />
          <Text style={{ fontSize: 12, color: tab === t.key ? '#00bfae' : '#bbb', fontWeight: tab === t.key ? 'bold' : 'normal', marginTop: 2 }}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
    {/* Posts Grid/List (Tab Content) */}
    <View style={{ flex: 1, margin: 16, padding: 0, borderRadius: 8 }}>
      {tab === 'posts' && (
        posts.length === 0 ? (
          <Text style={{ color: '#bbb', textAlign: 'center', marginTop: 32 }}>No posts yet.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {posts.map((item, idx) => (
              <TouchableOpacity key={item.id || idx} style={{ width: 100, height: 100, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f2f2f2', margin: 6, shadowColor: '#b0c4de', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }} onPress={() => setPostDetails(item)}>
                {item.media && item.media[0]?.type === 'image' && (
                  <Image source={{ uri: item.media[0].url }} style={{ width: 100, height: 100, borderRadius: 16 }} />
                )}
                {item.media && item.media[0]?.type === 'video' && (
                  <View style={{ width: 100, height: 100, borderRadius: 16, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="film-outline" size={32} color="#888" />
                  </View>
                )}
                {(!item.media || item.media[0]?.type === 'text') && (
                  <View style={{ width: 100, height: 100, borderRadius: 16, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={32} color="#888" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )
      )}
      {tab === 'reels' && (
        reels.length === 0 ? (
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No reels yet.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {reels.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
          {tab === 'tagged' && (
            posts.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No tagged posts yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {posts.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    {item.media && item.media[0]?.type === 'image' && (
                      <Image source={{ uri: item.media[0].url }} style={styles.gridThumb} />
                    )}
                    {item.media && item.media[0]?.type === 'video' && (
                      <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                    )}
                    {(!item.media || item.media[0]?.type === 'text') && (
                      <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="document-text-outline" size={32} color="#888" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
          {tab === 'saved' && isOwner && (
            posts.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No saved posts yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {posts.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    {item.media && item.media[0]?.type === 'image' && (
                      <Image source={{ uri: item.media[0].url }} style={styles.gridThumb} />
                    )}
                    {item.media && item.media[0]?.type === 'video' && (
                      <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                    )}
                    {(!item.media || item.media[0]?.type === 'text') && (
                      <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="document-text-outline" size={32} color="#888" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </View>
        {/* Post Details Modal */}
        {postDetails && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 30 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '92%', maxHeight: '90%' }}>
              <TouchableOpacity onPress={handleClosePost} style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                <Ionicons name="close-circle" size={32} color="#FF6B35" />
              </TouchableOpacity>
              {/* Post Media */}
              <View style={{ alignItems: 'center', marginBottom: 12, marginTop: 16 }}>
                {postDetails.media && postDetails.media[0]?.type === 'image' && (
                  <Image source={{ uri: postDetails.media[0].url }} style={{ width: 260, height: 260, borderRadius: 12, backgroundColor: '#eee' }} resizeMode="cover" />
                )}
                {postDetails.media && postDetails.media[0]?.type === 'video' && (
                  <View style={{ width: 260, height: 260, borderRadius: 12, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="film-outline" size={64} color="#888" />
                  </View>
                )}
                {(!postDetails.media || postDetails.media[0]?.type === 'text') && (
                  <View style={{ width: 260, height: 120, borderRadius: 12, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#444', fontSize: 18 }}>{postDetails.caption || 'No content'}</Text>
                  </View>
                )}
              </View>
              {/* Likes/Comments */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#FF6B35' : '#888'} />
                  <Text style={{ marginLeft: 6, color: liked ? '#FF6B35' : '#888', fontWeight: 'bold' }}>{likes.length}</Text>
                </TouchableOpacity>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#888" style={{ marginRight: 6 }} />
                <Text style={{ color: '#888' }}>{comments.length}</Text>
              </View>
              {/* Comments List */}
              <View style={{ maxHeight: 120, marginBottom: 8 }}>
                {comments.length === 0 ? (
                  <Text style={{ color: '#aaa', fontStyle: 'italic' }}>No comments yet.</Text>
                ) : (
                  comments.map((c, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="person-circle-outline" size={18} color="#888" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#444', fontWeight: 'bold', marginRight: 4 }}>{c.user?.display_name || c.user?.username || 'User'}:</Text>
                      <Text style={{ color: '#444' }}>{c.content}</Text>
                    </View>
                  ))
                )}
              </View>
              {/* Add Comment */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginRight: 8 }}
                />
                <TouchableOpacity onPress={handleAddComment} style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {settingsModal && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Settings</Text>
              <TouchableOpacity
                onPress={async () => { await signOut(); setSettingsModal(false); }}
                style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSettingsModal(false)} style={{ alignItems: 'center', padding: 10 }}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Friends List Modal */}
        {friendsModal && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18, width: '90%', maxWidth: 400, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#00bfae' }}>Friends</Text>
                <TouchableOpacity onPress={() => setFriendsModal(false)}>
                  <Ionicons name="close-circle" size={28} color="#00bfae" />
                </TouchableOpacity>
              </View>
              {profileFriends.length === 0 ? (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No friends yet.</Text>
              ) : (
                <View style={{ maxHeight: 350 }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {profileFriends.map((friend, idx) => (
                      <TouchableOpacity
                        key={friend.id || idx}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx !== profileFriends.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}
                        onPress={() => {
                          setFriendsModal(false);
                          navigation.navigate('ProfileScreen', { userId: friend.id });
                        }}
                      >
                        <Image source={{ uri: friend.avatar_url && friend.avatar_url.trim() !== '' ? friend.avatar_url : 'https://picsum.photos/200/200?random=2' }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 14, backgroundColor: '#eee' }} />
                        <View>
                          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#232526' }}>{friend.display_name || friend.username}</Text>
                          <Text style={{ color: '#888', fontSize: 13 }}>@{friend.username}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  } catch (err) {
    console.error('[ProfileScreen] Render error:', err);
    return <View style={styles.loading}><Text>Render error: {String(err)}</Text></View>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { marginBottom: 12 },
  displayName: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  username: { fontSize: 16, color: '#888', marginBottom: 8 },
  bio: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4cd137', marginRight: 6 },
  statusText: { fontSize: 13, color: '#888' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
  stat: { alignItems: 'center', marginHorizontal: 18 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  statLabel: { fontSize: 13, color: '#888' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 8, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 6, marginVertical: 4 },
  actionBtnActive: { backgroundColor: '#888' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  avatarModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  avatarModalImg: { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 },
  avatarModalClose: { position: 'absolute', top: 60, right: 30 },
  tabsRow: { flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fafafa' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#FF6B35' },
  tabLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  tabLabelActive: { color: '#FF6B35', fontWeight: 'bold' },
  tabContent: { minHeight: 300 },
  gridItem: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f2f2f2' },
  gridThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 },
});

// 4. Remove the old FriendListItem component at the bottom of the file 