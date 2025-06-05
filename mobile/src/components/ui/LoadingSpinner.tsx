import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Animated,
  Easing 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  text?: string;
  overlay?: boolean;
  variant?: 'default' | 'gradient' | 'pulse';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  text,
  overlay = false,
  variant = 'default',
  color,
}) => {
  const { theme, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (variant === 'gradient') {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [variant]);

  const spinnerColor = color || theme.colors.primary;

  const renderSpinner = () => {
    switch (variant) {
      case 'gradient':
        const rotate = rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View 
            style={[
              styles.gradientContainer,
              { transform: [{ rotate }] }
            ]}
          >
            <LinearGradient
              colors={[spinnerColor, 'transparent', spinnerColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.gradientSpinner,
                size === 'small' ? styles.smallGradient : styles.largeGradient
              ]}
            />
          </Animated.View>
        );

      case 'pulse':
        return (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <ActivityIndicator size={size} color={spinnerColor} />
          </Animated.View>
        );

      default:
        return <ActivityIndicator size={size} color={spinnerColor} />;
    }
  };

  const content = (
    <View style={styles.container}>
      {renderSpinner()}
      {text && (
        <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
          {text}
        </Text>
      )}
    </View>
  );

  if (overlay) {
    return (
      <View
        style={[
          styles.overlay, 
          { 
            backgroundColor: isDark 
              ? 'rgba(26, 26, 46, 0.9)' 
              : 'rgba(255, 255, 255, 0.9)' 
          }
        ]}
      >
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
  gradientContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientSpinner: {
    borderRadius: 50,
  },
  smallGradient: {
    width: 24,
    height: 24,
  },
  largeGradient: {
    width: 40,
    height: 40,
  },
});

export default LoadingSpinner;
