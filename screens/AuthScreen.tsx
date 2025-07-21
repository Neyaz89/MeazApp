
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import GlassCard from '../components/ui/GlassCard';
import { Theme } from '../constants/Theme';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        if (password !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          return;
        }
        
        if (password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          return;
        }
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        
        if (error) throw error;
        
        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username.trim(),
              email: email.trim(),
            });
          
          if (profileError) throw profileError;
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={Theme.gradients.primary}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Floating Decorative Elements */}
        <View style={styles.decorativeElement1} />
        <View style={styles.decorativeElement2} />
        <View style={styles.decorativeElement3} />
        
        <SafeAreaView style={styles.safeArea}>
          <Animated.View 
            style={[
              styles.content,
              { 
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={Theme.gradients.gold}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="chatbubbles" size={40} color="#FFFFFF" />
              </LinearGradient>
              
              <Text style={styles.title}>Welcome to Meaz</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Sign in to continue' : 'Create your account'}
              </Text>
            </View>

            {/* Auth Form */}
            <GlassCard style={styles.formCard} variant="light" shadow={true}>
              <View style={styles.form}>
                {!isLogin && (
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={20} color={Theme.colors.darkGold} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor={Theme.colors.gray400}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color={Theme.colors.darkGold} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={Theme.colors.gray400}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color={Theme.colors.darkGold} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Theme.colors.gray400}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye" : "eye-off"} 
                      size={20} 
                      color={Theme.colors.gray400} 
                    />
                  </TouchableOpacity>
                </View>

                {!isLogin && (
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={20} color={Theme.colors.darkGold} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor={Theme.colors.gray400}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.authButton}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={Theme.gradients.gold}
                    style={styles.authButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.authButtonText}>
                      {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </Text>
                    {!loading && (
                      <Ionicons 
                        name={isLogin ? "log-in" : "person-add"} 
                        size={20} 
                        color="#FFFFFF" 
                        style={styles.buttonIcon}
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {isLogin && (
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>

            {/* Switch Mode */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
                <Text style={styles.switchButton}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  decorativeElement1: {
    position: 'absolute',
    top: height * 0.1,
    left: -width * 0.3,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
  },
  decorativeElement2: {
    position: 'absolute',
    top: height * 0.6,
    right: -width * 0.2,
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: 'rgba(44, 95, 124, 0.1)',
  },
  decorativeElement3: {
    position: 'absolute',
    bottom: height * 0.2,
    left: width * 0.7,
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: width * 0.15,
    backgroundColor: 'rgba(212, 165, 116, 0.08)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.glass,
  },
  title: {
    fontSize: Theme.typography.fontSize.xxxl,
    fontWeight: Theme.typography.fontWeight.bold,
    color: Theme.colors.navyBlue,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.fontSize.md,
    color: Theme.colors.gray600,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Theme.spacing.lg,
  },
  form: {
    gap: Theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: Theme.borderRadius.medium,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Theme.typography.fontSize.md,
    color: Theme.colors.gray800,
    paddingVertical: Theme.spacing.sm,
  },
  eyeIcon: {
    padding: Theme.spacing.sm,
  },
  authButton: {
    marginTop: Theme.spacing.sm,
    ...Theme.shadows.medium,
  },
  authButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
  },
  authButtonText: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginLeft: Theme.spacing.sm,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  forgotPasswordText: {
    fontSize: Theme.typography.fontSize.sm,
    color: Theme.colors.darkGold,
    fontWeight: Theme.typography.fontWeight.medium,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  switchText: {
    fontSize: Theme.typography.fontSize.md,
    color: Theme.colors.gray600,
  },
  switchButton: {
    fontSize: Theme.typography.fontSize.md,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.darkGold,
  },
});
