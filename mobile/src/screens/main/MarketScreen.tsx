import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../hooks/useTheme';
import { useGetWatchlistQuery } from '../../store/api/apiSlice';
import { StockList } from '../../components/common/StockList';
import { Card } from '../../components/ui';

// Navigation types
type RootStackParamList = {
  StockDetail: { symbol: string };
  [key: string]: any;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MarketScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  // Example: Using watchlist data as stock list
  const { data: watchlistData, isLoading, refetch } = useGetWatchlistQuery();

  // Transform watchlist data to stock format
  const stocks =
    watchlistData?.map((item) => ({
      symbol: item.stock_symbol,
      name: item.stock?.name || `${item.stock_symbol} Inc.`,
      current_price: item.current_price || 0,
      change_amount: item.price_change || 0,
      change_percent: item.price_change_percent || 0,
      volume: item.stock?.volume,
    })) || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing market data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Custom navigation handler (optional)
  const handleStockPress = (symbol: string) => {
    console.log(`Navigating to stock: ${symbol}`);
    navigation.navigate('StockDetail', { symbol });
  };

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Card style={styles.headerCard}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Market Overview
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Tap any stock to view detailed analysis
          </Text>
        </Card>

        <StockList
          stocks={stocks}
          loading={isLoading}
          onStockPress={handleStockPress} // Optional custom handler
          emptyMessage='No stocks in your watchlist'
        />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
});

export default MarketScreen;
