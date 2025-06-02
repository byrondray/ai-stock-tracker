import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ChangeIndicatorProps {
  value: number;
  percentage?: number; // Add missing prop
  format?: 'currency' | 'percentage';
  style?: TextStyle;
  showSign?: boolean;
  showIcon?: boolean; // Add missing prop
}

const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({
  value,
  percentage,
  format = 'percentage',
  style,
  showSign = true,
  showIcon = true,
}) => {
  const { theme } = useTheme();

  const getColor = () => {
    if (value > 0) return theme.colors.success;
    if (value < 0) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  const formatValue = () => {
    const absValue = Math.abs(value);
    let formattedValue = '';

    if (format === 'currency') {
      formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(absValue);
    } else {
      formattedValue = `${absValue.toFixed(2)}%`;
    }

    if (showSign && value !== 0) {
      const sign = value > 0 ? '+' : '-';
      return `${sign}${formattedValue}`;
    }

    return formattedValue;
  };

  return (
    <Text style={[styles.text, { color: getColor() }, style]}>
      {formatValue()}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
  },
});

export { ChangeIndicator };
