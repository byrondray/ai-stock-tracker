import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { Card } from './Card';
import { ChangeIndicator } from './ChangeIndicator';

// Navigation types
type RootStackParamList = {
  StockDetail: { symbol: string };
  [key: string]: any;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  onPress?: (symbol: string) => void;
}

export const StockCard: React.FC<StockCardProps> = ({
  symbol,
  name,
  price,
  change,
  changePercent,
  volume,
  onPress,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    if (onPress) {
      onPress(symbol);
    } else {
      // Default navigation to StockDetailScreen
      navigation.navigate('StockDetail', { symbol });
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      testID='stock-card-touchable'
    >
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.stockInfo}>
            <Text style={[styles.symbol, { color: theme.colors.text }]}>
              {symbol}
            </Text>
            <Text
              style={[styles.name, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={[styles.price, { color: theme.colors.text }]}>
              ${price.toFixed(2)}
            </Text>
            <ChangeIndicator
              value={change}
              percentage={changePercent}
              showIcon={false}
            />
          </View>
        </View>

        {volume && (
          <View style={styles.footer}>
            <Text
              style={[styles.volume, { color: theme.colors.textSecondary }]}
            >
              Vol: {volume.toLocaleString()}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flex: 1,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    opacity: 0.8,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  volume: {
    fontSize: 12,
  },
});

export default StockCard;
