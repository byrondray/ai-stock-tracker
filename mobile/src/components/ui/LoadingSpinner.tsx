import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  overlay = false,
}) => {
  const { theme } = useTheme();

  const content = (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {text && (
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
          {text}
        </Text>
      )}
    </View>
  );

  if (overlay) {
    return (
      <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoadingSpinner;
