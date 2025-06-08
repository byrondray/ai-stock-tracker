import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useStockPrices } from '../../hooks/useWebSocket';
import {
  useGetWatchlistQuery,
  useRemoveFromWatchlistMutation,
  useAddToPortfolioMutation,
  type WatchlistItem,
} from '../../store/api/apiSlice';

interface WatchlistStock {
  symbol: string;
  name: string;
  current_price: number;
  change_amount: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  high_52w?: number;
  low_52w?: number;
}

const WatchlistScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: watchlist, isLoading, refetch } = useGetWatchlistQuery();

  const [removeFromWatchlist, { isLoading: removing }] =
    useRemoveFromWatchlistMutation();
  const [addToPortfolio, { isLoading: adding }] = useAddToPortfolioMutation();
  const { prices: realtimePrices, connected: isConnected } = useStockPrices(
    watchlist?.map((item) => item.stock_symbol) || []
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    Alert.alert(
      'Remove from Watchlist',
      `Are you sure you want to remove ${symbol} from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use symbol to remove from watchlist (API expects symbol, not ID)
              await removeFromWatchlist(symbol).unwrap();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.data?.detail || 'Failed to remove stock'
              );
            }
          },
        },
      ]
    );
  };
  const handleAddToPortfolio = (stock: WatchlistItem) => {
    Alert.alert(
      'Add to Portfolio',
      `Add ${stock.stock_symbol} to your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            Alert.prompt(
              'Add to Portfolio',
              'Enter the number of shares and purchase price:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add',
                  onPress: async (input) => {
                    if (!input) return;

                    const parts = input.split(',');
                    if (parts.length !== 2) {
                      Alert.alert(
                        'Error',
                        'Please enter quantity and price separated by comma (e.g., 10, 150.50)'
                      );
                      return;
                    }

                    const quantity = parseFloat(parts[0].trim());
                    const price = parseFloat(parts[1].trim());

                    if (
                      isNaN(quantity) ||
                      isNaN(price) ||
                      quantity <= 0 ||
                      price <= 0
                    ) {
                      Alert.alert('Error', 'Please enter valid numbers');
                      return;
                    }
                    try {
                      await addToPortfolio({
                        stock_symbol: stock.stock_symbol,
                        quantity,
                        average_cost: price,
                        purchase_date: new Date().toISOString(),
                      }).unwrap();
                    } catch (error: any) {
                      Alert.alert(
                        'Error',
                        error?.data?.detail ||
                          'Failed to add stock to portfolio'
                      );
                    }
                  },
                },
              ],
              'plain-text',
              '',
              'number-pad'
            );
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return theme.colors.success;
    if (change < 0) return theme.colors.error;
    return theme.colors.textSecondary;
  };
  const getCurrentPrice = (item: WatchlistItem) => {
    const realtimeData = realtimePrices[item.stock_symbol];
    return realtimeData?.price || item.current_price;
  };
  const getChangeData = (item: WatchlistItem) => {
    const realtimeData = realtimePrices[item.stock_symbol];

    if (realtimeData) {
      // Use real-time data
      return {
        currentPrice: realtimeData.price,
        changeAmount: realtimeData.change,
        changePercent: realtimeData.changePercent,
      };
    } else {
      // Fallback to cached data
      return {
        currentPrice: item.current_price || 0,
        changeAmount: item.price_change || 0,
        changePercent: item.price_change_percent || 0,
      };
    }
  };
  const renderStockItem = ({ item }: { item: WatchlistItem }) => {
    const { currentPrice, changeAmount, changePercent } = getChangeData(item);

    return (
      <TouchableOpacity
        style={[styles.stockCard, { backgroundColor: theme.colors.surface }]}
        onLongPress={() => handleRemoveStock(item.stock_symbol)}
        activeOpacity={0.7}
      >
        <View style={styles.stockHeader}>
          <View style={styles.stockInfo}>
            <Text style={[styles.stockSymbol, { color: theme.colors.text }]}>
              {item.stock_symbol}
            </Text>
            <Text
              style={[styles.stockName, { color: theme.colors.textSecondary }]}
            >
              {item.stock.name}
            </Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={[styles.currentPrice, { color: theme.colors.text }]}>
              {formatCurrency(currentPrice || 0)}
            </Text>
            <View style={styles.changeInfo}>
              <Text
                style={[
                  styles.changeAmount,
                  { color: getChangeColor(changeAmount || 0) },
                ]}
              >
                {changeAmount >= 0 ? '+' : ''}
                {formatCurrency(Math.abs(changeAmount || 0))}
              </Text>
              <Text
                style={[
                  styles.changePercent,
                  { color: getChangeColor(changePercent || 0) },
                ]}
              >
                ({formatPercentage(changePercent || 0)})
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.stockDetails}>
          <View style={styles.detailRow}>
            <Text
              style={[
                styles.detailLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Volume
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatVolume(item.stock.volume || 0)}
            </Text>
          </View>
          {item.stock.market_cap && (
            <View style={styles.detailRow}>
              <Text
                style={[
                  styles.detailLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Market Cap
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {formatVolume(item.stock.market_cap)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.portfolioButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => handleAddToPortfolio(item)}
            disabled={adding}
          >
            <Text style={[styles.buttonText, { color: theme.colors.surface }]}>
              {adding ? 'Adding...' : 'Add to Portfolio'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.removeButton, { borderColor: theme.colors.error }]}
            onPress={() => handleRemoveStock(item.stock_symbol)}
            disabled={removing}
          >
            <Text
              style={[styles.removeButtonText, { color: theme.colors.error }]}
            >
              {removing ? 'Removing...' : 'Remove'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading watchlist...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.colors.surface }]}>
            Watchlist
          </Text>
          {watchlist && (
            <Text style={[styles.stockCount, { color: theme.colors.surface }]}>
              {watchlist.length} stocks
            </Text>
          )}
        </View>
        {/* Real-time connection status */}
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.connectionDot,
              {
                backgroundColor: isConnected
                  ? theme.colors.success
                  : theme.colors.error,
              },
            ]}
          />
          <Text
            style={[styles.connectionText, { color: theme.colors.surface }]}
          >
            {isConnected ? 'Live prices' : 'Offline'}
          </Text>
        </View>
      </LinearGradient>
      {/* Stock List */}
      {watchlist && watchlist.length > 0 ? (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStockItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Your Watchlist is Empty
          </Text>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            Start adding stocks to track their performance
          </Text>
          <Text
            style={[styles.emptyHint, { color: theme.colors.textSecondary }]}
          >
            Use the search tab to find and add stocks
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  stockCount: {
    fontSize: 16,
    opacity: 0.8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    opacity: 0.9,
  },
  listContent: {
    padding: 16,
  },
  stockCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stockName: {
    fontSize: 14,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  changeInfo: {
    alignItems: 'flex-end',
  },
  changeAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  portfolioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WatchlistScreen;
