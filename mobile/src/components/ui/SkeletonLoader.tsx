import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  animated?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
}) => {
  const { theme, isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [animated, animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isDark
      ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)']
      : ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.2)'],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: animated ? backgroundColor : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        style,
      ]}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; style?: any }> = ({ 
  lines = 1, 
  style 
}) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonLoader
        key={index}
        height={16}
        width={index === lines - 1 ? '70%' : '100%'}
        style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC<{ style?: any }> = ({ style }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={120} height={20} />
        <SkeletonLoader width={60} height={16} />
      </View>
      <SkeletonLoader width="100%" height={12} style={{ marginVertical: 8 }} />
      <SkeletonLoader width="80%" height={12} />
      <View style={styles.cardFooter}>
        <SkeletonLoader width={80} height={14} />
        <SkeletonLoader width={100} height={14} />
      </View>
    </View>
  );
};

export const SkeletonAvatar: React.FC<{ 
  size?: number; 
  style?: any 
}> = ({ size = 40, style }) => (
  <SkeletonLoader
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
  />
);

export const SkeletonButton: React.FC<{ 
  width?: number | string; 
  style?: any 
}> = ({ width = 120, style }) => (
  <SkeletonLoader
    width={width}
    height={44}
    borderRadius={8}
    style={style}
  />
);

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
});

export default SkeletonLoader;