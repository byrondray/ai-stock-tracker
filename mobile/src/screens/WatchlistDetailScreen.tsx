import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../store';
import { useTheme } from '../hooks/useTheme';
import {
  useGetWatchlistQuery,
  useDeleteWatchlistItemMutation,
} from '../store/api/apiSlice';
import { removeFromWatchlist } from '../store/slices/watchlistSlice';
import { addToPortfolio } from '../store/slices/portfolioSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChangeIndicator } from '../components/ui/ChangeIndicator';
import { v4 as uuidv4 } from 'uuid';

type RootStackParamList = {
  WatchlistDetail: { watchlistId: string };
};

type WatchlistDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'WatchlistDetail'
>;

export const WatchlistDetailScreen: React.FC = () => {
  const route = useRoute<WatchlistDetailScreenRouteProp>();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { watchlistId } = route.params;

  const [refreshing, setRefreshing] = useState(false);

  const watchlistItems = useAppSelector((state) => state.watchlist.items);
  const watchlistItem = watchlistItems.find(
    (item) => item.id === parseInt(watchlistId, 10)
  );

  const {
    data: watchlistData,
    isLoading,
    error,
    refetch,
  } = useGetWatchlistQuery();

  const [deleteWatchlistItemMutation] = useDeleteWatchlistItemMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveFromWatchlist = () => {
    Alert.alert(
      'Remove from Watchlist',
      'Are you sure you want to remove this stock from your watchlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWatchlistItemMutation(
                parseInt(watchlistId, 10)
              ).unwrap();
              dispatch(removeFromWatchlist(parseInt(watchlistId, 10)));
              // Navigate back
            } catch (error) {
              console.error('Error removing from watchlist:', error);
              Alert.alert(
                'Error',
                'Failed to remove from watchlist. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleAddToPortfolio = () => {
    if (!watchlistItem) return;

    Alert.prompt(
      'Add to Portfolio',
      'Enter the number of shares:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (shares) => {
            const numShares = parseInt(shares || '0', 10);
            if (numShares > 0) {
              // ... rest of imports

              dispatch(
                addToPortfolio({
                  id: Date.now(),
                  stock_symbol: watchlistItem.stock_symbol,
                  name: watchlistItem.stock?.name || watchlistItem.stock_symbol,
                  quantity: numShares,
                  average_cost: watchlistItem.current_price || 0,
                  averagePrice: watchlistItem.current_price || 0,
                  purchase_date: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  stock: watchlistItem.stock || null,
                })
              );
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleViewStockDetail = () => {
    // Navigate to stock detail screen
    // navigation.navigate('StockDetail', { symbol: watchlistItem?.symbol });
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading watchlist details...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!watchlistItem) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Watchlist item not found
          </Text>
        </View>
      </LinearGradient>
    );
  }

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
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.stockHeader}>
            {' '}
            <View style={styles.stockInfo}>
              <Text style={[styles.stockSymbol, { color: theme.colors.text }]}>
                {watchlistItem.stock_symbol}
              </Text>
              <Text
                style={[
                  styles.stockName,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {watchlistItem.stock?.name || watchlistItem.stock_symbol}
              </Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={[styles.currentPrice, { color: theme.colors.text }]}>
                ${(watchlistItem.current_price || 0).toFixed(2)}
              </Text>
              <ChangeIndicator
                value={watchlistItem.price_change || 0}
                percentage={watchlistItem.price_change_percent || 0}
              />
            </View>
          </View>
        </Card>

        {/* Watchlist Info Card */}
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Watchlist Information
          </Text>
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Added to Watchlist
              </Text>{' '}
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {new Date(watchlistItem.added_at || '').toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Current Price
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                ${(watchlistItem.current_price || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Daily Change
              </Text>
              <View style={styles.changeContainer}>
                <Text
                  style={[
                    styles.changeValue,
                    {
                      color:
                        (watchlistItem.price_change || 0) >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  ${(watchlistItem.price_change || 0).toFixed(2)}
                </Text>{' '}
                <Text
                  style={[
                    styles.changePercent,
                    {
                      color:
                        (watchlistItem.price_change || 0) >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  ({(watchlistItem.price_change_percent || 0) >= 0 ? '+' : ''}
                  {(watchlistItem.price_change_percent || 0).toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quick Stats Card */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Stats
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Symbol
              </Text>{' '}
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {watchlistItem.stock_symbol}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Price
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                ${(watchlistItem.current_price || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Change
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      (watchlistItem.price_change || 0) >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                ${(watchlistItem.price_change || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Change %
              </Text>{' '}
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      (watchlistItem.price_change || 0) >= 0
                        ? theme.colors.success
                        : theme.colors.error,
                  },
                ]}
              >
                {(watchlistItem.price_change_percent || 0) >= 0 ? '+' : ''}
                {(watchlistItem.price_change_percent || 0).toFixed(2)}%
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Actions
          </Text>
          <View style={styles.actionButtons}>
            <Button
              title='View Details'
              onPress={handleViewStockDetail}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.primary },
              ]}
            />
            <Button
              title='Add to Portfolio'
              onPress={handleAddToPortfolio}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.success },
              ]}
            />
          </View>
          <Button
            title='Remove from Watchlist'
            onPress={handleRemoveFromWatchlist}
            style={[
              styles.actionButton,
              styles.fullWidthButton,
              { backgroundColor: theme.colors.error, marginTop: 8 },
            ]}
          />
        </Card>

        {/* Price Alerts Card (Future Feature) */}
        <Card style={styles.alertsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Price Alerts
          </Text>
          <Text
            style={[
              styles.comingSoonText,
              { color: theme.colors.textSecondary },
            ]}
          >
            Set price alerts to get notified when {watchlistItem.symbol} reaches
            your target price.
          </Text>
          <Button
            title='Set Price Alert'
            onPress={() =>
              Alert.alert(
                'Coming Soon',
                'Price alerts feature will be available in a future update.'
              )
            }
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.surface, marginTop: 12 },
            ]}
            textStyle={{ color: theme.colors.text }}
          />
        </Card>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerCard: {
    marginBottom: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  stockName: {
    fontSize: 16,
    marginTop: 4,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoContent: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeContainer: {
    alignItems: 'flex-end',
  },
  changeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  changePercent: {
    fontSize: 12,
    marginTop: 2,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullWidthButton: {
    marginHorizontal: 0,
  },
  alertsCard: {
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
