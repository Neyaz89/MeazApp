
import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { DESIGN } from '../../constants/design';

export const GlassCard: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.glass, style]} {...props}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  glass: {
    ...DESIGN.glass,
    padding: 16,
    margin: 8,
  },
});
