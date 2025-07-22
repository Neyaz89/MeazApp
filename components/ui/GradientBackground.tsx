import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../constants/theme';

export const GradientBackground: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <LinearGradient
    colors={[COLORS.primary, COLORS.accent, COLORS.secondary]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.gradient, style]}
    {...props}
  >
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});