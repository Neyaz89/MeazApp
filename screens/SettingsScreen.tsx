
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useTheme, FontSize, ColorBlindMode } from '../components/ThemeContext';
import { Colors } from '../constants/Colors';
import { PrivacyControls } from '../components/privacy/PrivacyControls';

const { width } = Dimensions.get('window');

const SettingsScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);
  const { theme, setTheme, fontSize, setFontSize, colorBlindMode, setColorBlindMode } = useTheme();
  const themeColors = Colors[theme] || Colors.light;
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.95);

  React.useEffect(() => {
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

  const themeOptions = [
    { id: 'light', label: 'Light', icon: 'sunny', colors: ['#FFFFFF', '#F8F9FA'] },
    { id: 'dark', label: 'Dark', icon: 'moon', colors: ['#232526', '#414345'] },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: 'flash', colors: ['#ff00ea', '#00fff7'] },
    { id: 'glass', label: 'Glass', icon: 'diamond', colors: ['#ffffff', '#e0e0e0'] },
    { id: 'neon', label: 'Neon', icon: 'bulb', colors: ['#00FFF7', '#FF00EA'] },
  ];

  const fontSizeOptions = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
  ];

  const colorBlindOptions = [
    { id: 'none', label: 'None' },
    { id: 'protanopia', label: 'Protanopia' },
    { id: 'deuteranopia', label: 'Deuteranopia' },
    { id: 'tritanopia', label: 'Tritanopia' },
  ];

  const settingsSections = [
    {
      title: 'Appearance',
      icon: 'color-palette',
      items: [
        { id: 'theme', label: 'Theme', icon: 'color-palette', type: 'navigate' },
        { id: 'darkMode', label: 'Dark Mode', icon: 'moon', type: 'switch', value: darkMode, onValueChange: setDarkMode },
      ]
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        { id: 'notifications', label: 'Push Notifications', icon: 'notifications', type: 'switch', value: notifications, onValueChange: setNotifications },
        { id: 'sound', label: 'Sound', icon: 'volume-high', type: 'switch', value: soundEnabled, onValueChange: setSoundEnabled },
        { id: 'vibration', label: 'Vibration', icon: 'phone-portrait', type: 'switch', value: vibrationEnabled, onValueChange: setVibrationEnabled },
      ]
    },
    {
      title: 'Privacy & Security',
      icon: 'shield-checkmark',
      items: [
        { id: 'privacy', label: 'Privacy Settings', icon: 'shield-checkmark', type: 'navigate', onPress: () => setShowPrivacyControls(true) },
        { id: 'security', label: 'Security', icon: 'lock-closed', type: 'navigate' },
        { id: 'blocked', label: 'Blocked Users', icon: 'ban', type: 'navigate' },
      ]
    },
    {
      title: 'Account',
      icon: 'person',
      items: [
        { id: 'profile', label: 'Edit Profile', icon: 'person', type: 'navigate' },
        { id: 'password', label: 'Change Password', icon: 'key', type: 'navigate' },
        { id: 'logout', label: 'Logout', icon: 'log-out', type: 'action' },
      ]
    },
  ];

  const renderSettingItem = (item: any, index: number) => {
    const itemAnim = new Animated.Value(0);

    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 50,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.settingItemContainer,
          {
            opacity: itemAnim,
            transform: [{
              translateX: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity onPress={item.onPress} activeOpacity={0.8}>
          <BlurView intensity={40} style={styles.settingItemBlur}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
              style={styles.settingItem}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <LinearGradient
                    colors={['#D4A574', '#C8956D']}
                    style={styles.settingIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={item.icon as any} size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
              </View>
              
              <View style={styles.settingRight}>
                {item.type === 'switch' && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: 'rgba(26, 35, 126, 0.2)', true: '#D4A574' }}
                    thumbColor={item.value ? '#FFFFFF' : '#FFFFFF'}
                    style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                  />
                )}
                {(item.type === 'navigate' || item.type === 'action') && (
                  <View style={styles.chevronContainer}>
                    <Ionicons name="chevron-forward" size={20} color="rgba(26, 35, 126, 0.5)" />
                  </View>
                )}
              </View>
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSection = (section: any, sectionIndex: number) => (
    <View key={section.title} style={styles.section}>
      <View style={styles.sectionHeader}>
        <LinearGradient
          colors={['#D4A574', '#C8956D']}
          style={styles.sectionIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={section.icon as any} size={18} color="#FFFFFF" />
        </LinearGradient>
        <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
      </View>
      
      <View style={styles.sectionContent}>
        {section.items.map((item: any, index: number) => renderSettingItem(item, sectionIndex * 10 + index))}
      </View>
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
      <View style={styles.decorativeElement3} />

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
            <ThemedText style={styles.mainTitle}>Settings</ThemedText>
            <View style={styles.headerDecoration}>
              <Svg height="30" width="30" viewBox="0 0 30 30">
                <Circle cx="15" cy="15" r="12" fill="url(#headerGrad)" opacity="0.3" />
                <Defs>
                  <SvgLinearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#D4A574" />
                    <Stop offset="100%" stopColor="#C8956D" />
                  </SvgLinearGradient>
                </Defs>
              </Svg>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {settingsSections.map((section, index) => renderSection(section, index))}

            {/* Theme Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#D4A574', '#C8956D']}
                  style={styles.sectionIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="color-palette" size={18} color="#FFFFFF" />
                </LinearGradient>
                <ThemedText style={styles.sectionTitle}>Choose Theme</ThemedText>
              </View>
              
              <View style={styles.themeGrid}>
                {themeOptions.map((themeOption, index) => (
                  <TouchableOpacity
                    key={themeOption.id}
                    style={styles.themeOptionContainer}
                    onPress={() => setTheme(themeOption.id)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={theme === themeOption.id ? 60 : 40} style={styles.themeOptionBlur}>
                      <LinearGradient
                        colors={theme === themeOption.id 
                          ? ['rgba(212, 165, 116, 0.3)', 'rgba(200, 149, 109, 0.2)']
                          : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']
                        }
                        style={[
                          styles.themeOption,
                          theme === themeOption.id && styles.selectedTheme
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={[styles.themePreview, { backgroundColor: themeOption.colors[0] }]}>
                          <View style={[styles.themePreviewInner, { backgroundColor: themeOption.colors[1] }]} />
                        </View>
                        <Ionicons 
                          name={themeOption.icon as any} 
                          size={20} 
                          color={theme === themeOption.id ? "#D4A574" : "rgba(26, 35, 126, 0.7)"} 
                        />
                        <ThemedText style={[
                          styles.themeLabel,
                          theme === themeOption.id && styles.selectedThemeLabel
                        ]}>
                          {themeOption.label}
                        </ThemedText>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Font Size Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['#D4A574', '#C8956D']}
                  style={styles.sectionIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="text" size={18} color="#FFFFFF" />
                </LinearGradient>
                <ThemedText style={styles.sectionTitle}>Font Size</ThemedText>
              </View>
              
              <View style={styles.optionRow}>
                {fontSizeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionButton}
                    onPress={() => setFontSize(option.id as FontSize)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={fontSize === option.id ? 60 : 40} style={styles.optionBlur}>
                      <LinearGradient
                        colors={fontSize === option.id
                          ? ['rgba(212, 165, 116, 0.3)', 'rgba(200, 149, 109, 0.2)']
                          : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']
                        }
                        style={[
                          styles.optionContent,
                          fontSize === option.id && styles.selectedOption
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <ThemedText style={[
                          styles.optionLabel,
                          fontSize === option.id && styles.selectedOptionLabel
                        ]}>
                          {option.label}
                        </ThemedText>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* App Version */}
            <View style={styles.versionContainer}>
              <BlurView intensity={20} style={styles.versionBlur}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)']}
                  style={styles.versionContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <ThemedText style={styles.versionText}>Meaz v1.0.0</ThemedText>
                  <ThemedText style={styles.versionSubtext}>Built with ❤️</ThemedText>
                </LinearGradient>
              </BlurView>
            </View>
          </ScrollView>

          {/* Privacy Controls Modal */}
          {showPrivacyControls && (
            <BlurView intensity={80} style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
                  style={styles.modalContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <PrivacyControls userId={'current-user-id'} />
                  <TouchableOpacity 
                    onPress={() => setShowPrivacyControls(false)} 
                    style={styles.closeButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#D4A574', '#C8956D']}
                      style={styles.closeButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </BlurView>
          )}
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
    top: 150,
    right: -60,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    zIndex: 0,
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: 250,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 35, 126, 0.08)',
    zIndex: 0,
  },
  decorativeElement3: {
    position: 'absolute',
    top: 300,
    left: width * 0.7,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
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
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A237E',
    textShadowColor: 'rgba(26, 35, 126, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerDecoration: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  sectionContent: {
    gap: 12,
  },
  settingItemContainer: {
    marginBottom: 4,
  },
  settingItemBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  settingIconGradient: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
  },
  settingRight: {
    alignItems: 'center',
  },
  chevronContainer: {
    padding: 4,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  themeOptionContainer: {
    width: '48%',
  },
  themeOptionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  themeOption: {
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  selectedTheme: {
    borderColor: '#D4A574',
    borderWidth: 2,
  },
  themePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  themePreviewInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(26, 35, 126, 0.7)',
    marginTop: 8,
  },
  selectedThemeLabel: {
    color: '#D4A574',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionButton: {
    flex: 1,
  },
  optionBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  optionContent: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.15)',
  },
  selectedOption: {
    borderColor: '#D4A574',
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(26, 35, 126, 0.7)',
  },
  selectedOptionLabel: {
    color: '#D4A574',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  versionContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.1)',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(26, 35, 126, 0.6)',
  },
  versionSubtext: {
    fontSize: 12,
    color: 'rgba(26, 35, 126, 0.4)',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
  modalContent: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 2,
  },
  closeButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen;
