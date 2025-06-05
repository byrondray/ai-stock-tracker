import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from '../ui/LoadingSpinner';

interface LoadingScreenProps {
  text?: string;
  variant?: 'default' | 'gradient' | 'pulse';
}

export function LoadingScreen({ 
  text = 'Loading...', 
  variant = 'gradient' 
}: LoadingScreenProps) {
  const { theme, isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.content}>
        <LoadingSpinner 
          variant={variant} 
          size="large" 
          text={text}
          color={theme.colors.surface}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});
