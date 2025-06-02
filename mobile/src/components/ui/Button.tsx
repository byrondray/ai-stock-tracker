import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size], style];

    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }

    switch (variant) {
      case 'primary':
        baseStyle.push({ backgroundColor: theme.colors.primary });
        break;
      case 'secondary':
        baseStyle.push({ backgroundColor: theme.colors.secondary });
        break;
      case 'outline':
        baseStyle.push({
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        });
        break;
      case 'danger':
        baseStyle.push({ backgroundColor: theme.colors.error });
        break;
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`], textStyle];

    switch (variant) {
      case 'outline':
        baseStyle.push({ color: theme.colors.primary });
        break;
      default:
        baseStyle.push({ color: theme.colors.surface });
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size='small'
          color={
            variant === 'outline' ? theme.colors.primary : theme.colors.surface
          }
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  // Text sizes
  text: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});

export { Button };
