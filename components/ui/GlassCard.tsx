
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../constants/Theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'light' | 'dark' | 'gold' | 'navy';
  blur?: 'low' | 'medium' | 'high';
  shadow?: boolean;
  border?: boolean;
}

export default function GlassCard({ 
  children, 
  style, 
  variant = 'light',
  blur = 'medium',
  shadow = true,
  border = true 
}: GlassCardProps) {
  
  const getGradientColors = () => {
    switch (variant) {
      case 'dark':
        return ['rgba(44, 95, 124, 0.2)', 'rgba(44, 95, 124, 0.1)'];
      case 'gold':
        return ['rgba(212, 165, 116, 0.2)', 'rgba(200, 149, 109, 0.1)'];
      case 'navy':
        return ['rgba(44, 95, 124, 0.3)', 'rgba(30, 58, 138, 0.2)'];
      case 'light':
      default:
        return ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)'];
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'dark':
        return 'rgba(44, 95, 124, 0.3)';
      case 'gold':
        return 'rgba(212, 165, 116, 0.3)';
      case 'navy':
        return 'rgba(44, 95, 124, 0.4)';
      case 'light':
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const shadowStyle = shadow ? {
    ...Theme.shadows.medium,
    shadowColor: variant === 'gold' ? '#D4A574' : '#000',
  } : {};

  const borderStyle = border ? {
    borderWidth: 1,
    borderColor: getBorderColor(),
  } : {};

  return (
    <View style={[shadowStyle, style]}>
      <LinearGradient
        colors={getGradientColors()}
        style={[
          styles.container,
          borderStyle,
          style,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.md,
    overflow: 'hidden',
  },
});
