import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../../store';
import { useStockPrices } from '../../hooks/useWebSocket';
import {
  useGetPortfolioQuery,
  useGetWatchlistQuery,
  useGetGeneralNewsQuery,
} from '../../store/api/apiSlice';
import { useTheme } from '../../hooks/useTheme';

import { LoadingSpinner, SectionLoadingCard } from '../../components/ui';
import type { MainTabParamList } from '../../navigation/MainTabNavigator';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated, token } = useAppSelector(
    (state) => state.auth
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation<DashboardNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    refetch: refetchPortfolio,
    error: portfolioError,
  } = useGetPortfolioQuery(undefined, {
    skip: !user,
  });

  const {
    data: watchlist,
    isLoading: watchlistLoading,
    refetch: refetchWatchlist,
    error: watchlistError,
  } = useGetWatchlistQuery(undefined, {
    skip: !user,
  });
  // Debug authentication and API issues
  useEffect(() => {
    if (!user) {
      console.warn(
        '⚠️ User is not authenticated - portfolio and watchlist queries will be skipped'
      );
    }

    if (watchlistError) {
      console.error('Watchlist API Error:', watchlistError);
    }
    if (portfolioError) {
      console.error('Portfolio API Error:', portfolioError);
    }
  }, [
    user,
    isAuthenticated,
    token,
    watchlistError,
    portfolioError,
    portfolio,
    watchlist,
  ]);

  const {
    data: news,
    isLoading: newsLoading,
    refetch: refetchNews,
  } = useGetGeneralNewsQuery({
    limit: 5,
  });

  // Get all unique symbols from portfolio and watchlist for real-time updates
  const portfolioSymbols =
    portfolio?.items?.map((item) => item.stock_symbol) || [];
  const watchlistSymbols = watchlist?.map((item) => item.stock_symbol) || [];
  const allSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];

  const { prices: realtimePrices, connected: isConnected } =
    useStockPrices(allSymbols);

  // Helper function to get real-time price for a symbol
  const getCurrentPrice = (symbol: string, fallbackPrice?: number) => {
    const realtimeData = realtimePrices[symbol];
    return realtimeData?.price || fallbackPrice || 0;
  };

  // Helper function to get real-time change data
  const getChangeData = (
    symbol: string,
    fallbackChange?: number,
    fallbackPercent?: number
  ) => {
    const realtimeData = realtimePrices[symbol];
    return {
      change: realtimeData?.change || fallbackChange || 0,
      changePercent: realtimeData?.changePercent || fallbackPercent || 0,
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refetch all data to ensure latest information
      await Promise.all([
        refetchPortfolio(),
        refetchWatchlist(),
        refetchNews(),
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
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

  const getChangeColor = (change: number) => {
    if (change > 0) return theme.colors.success;
    if (change < 0) return theme.colors.error;
    return theme.colors.textSecondary;
  };

  // Get user's display name
  const getUserDisplayName = () => {
    if (user?.first_name) {
      return user.first_name;
    }
    if (user?.username) {
      return user.username;
    }
    return 'Investor';
  };
  // Debug API errors
  useEffect(() => {
    // Log API errors for debugging
    if (portfolioError) {
      console.error('Portfolio API Error:', portfolioError);
    }
    if (watchlistError) {
      console.error('Watchlist API Error:', watchlistError);
    }
  }, [
    user,
    isAuthenticated,
    token,
    portfolioError,
    watchlistError,
    portfolio,
    watchlist,
  ]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: '#FFFFFF' }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: '#FFFFFF' }]}>
              {getUserDisplayName()}
            </Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.content}>
        {/* Portfolio Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Portfolio Overview
            </Text>
          </View>

          {portfolioLoading ? (
            <SectionLoadingCard type='portfolio' />
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Portfolio')}
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.7}
            >
              {portfolio ? (
                <>
                  <View style={styles.portfolioHeader}>
                    <Text
                      style={[
                        styles.portfolioValue,
                        { color: theme.colors.text },
                      ]}
                    >
                      {formatCurrency(portfolio.total_value)}
                    </Text>
                    <View style={styles.portfolioChange}>
                      <Text
                        style={[
                          styles.portfolioChangeText,
                          {
                            color: getChangeColor(portfolio.return_percentage),
                          },
                        ]}
                      >
                        {formatPercentage(portfolio.return_percentage)}
                      </Text>
                      <Text
                        style={[
                          styles.portfolioChangeAmount,
                          {
                            color: getChangeColor(portfolio.total_return),
                          },
                        ]}
                      >
                        {formatCurrency(portfolio.total_return)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.portfolioStats}>
                    <View style={styles.statItem}>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Holdings
                      </Text>
                      <Text
                        style={[styles.statValue, { color: theme.colors.text }]}
                      >
                        {portfolio.items?.length || 0}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Day's Gain
                      </Text>
                      <Text
                        style={[
                          styles.statValue,
                          {
                            color: getChangeColor(portfolio.total_return || 0),
                          },
                        ]}
                      >
                        {formatCurrency(portfolio.total_return || 0)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text
                    style={[styles.emptyTitle, { color: theme.colors.text }]}
                  >
                    No Portfolio Yet
                  </Text>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Start building your portfolio by adding stocks
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Watchlist */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Watchlist
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Watchlist')}>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {watchlistLoading ? (
            <SectionLoadingCard type='watchlist' />
          ) : (
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              {watchlistError ? (
                <View style={styles.emptyState}>
                  <Text
                    style={[styles.emptyTitle, { color: theme.colors.error }]}
                  >
                    Error Loading Watchlist
                  </Text>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {(watchlistError as any)?.status === 401
                      ? 'Please log in again to view your watchlist'
                      : 'Failed to load watchlist. Pull down to refresh.'}
                  </Text>
                </View>
              ) : watchlist && watchlist.length > 0 ? (
                <View style={styles.watchlistContainer}>
                  {watchlist.slice(0, 5).map((item: any, index: number) => {
                    const currentPrice = getCurrentPrice(
                      item.stock_symbol,
                      item.stock?.current_price
                    );
                    const changeData = getChangeData(
                      item.stock_symbol,
                      item.price_change,
                      item.price_change_percent
                    );

                    return (
                      <TouchableOpacity
                        key={item.stock_symbol}
                        style={styles.watchlistItem}
                        onPress={() =>
                          navigation.navigate('StockDetail', {
                            symbol: item.stock_symbol,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <View style={styles.stockInfo}>
                          <Text
                            style={[
                              styles.stockSymbol,
                              { color: theme.colors.text },
                            ]}
                          >
                            {item.stock_symbol}
                          </Text>
                          <Text
                            style={[
                              styles.stockName,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {item.stock?.name || item.stock_symbol}
                          </Text>
                        </View>
                        <View style={styles.stockPrice}>
                          <Text
                            style={[
                              styles.priceText,
                              { color: theme.colors.text },
                            ]}
                          >
                            {formatCurrency(currentPrice)}
                          </Text>
                          <Text
                            style={[
                              styles.changeText,
                              {
                                color: getChangeColor(changeData.changePercent),
                              },
                            ]}
                          >
                            {formatPercentage(changeData.changePercent)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text
                    style={[styles.emptyTitle, { color: theme.colors.text }]}
                  >
                    Empty Watchlist
                  </Text>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Add stocks to track their performance
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Market News */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Market News
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('News')}>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {newsLoading ? (
            <SectionLoadingCard type='news' />
          ) : (
            <View
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              {news && news.news_items && news.news_items.length > 0 ? (
                <View style={styles.newsContainer}>
                  {news.news_items
                    .slice(0, 3)
                    .map((article: any, index: number) => (
                      <TouchableOpacity key={index} style={styles.newsItem}>
                        <Text
                          style={[
                            styles.newsTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {article.title}
                        </Text>
                        <Text
                          style={[
                            styles.newsSource,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {article.source} •
                          {new Date(article.published_at).toLocaleDateString()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text
                    style={[styles.emptyTitle, { color: theme.colors.text }]}
                  >
                    No News Available
                  </Text>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Check back later for market updates
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    opacity: 0.8,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  portfolioHeader: {
    marginBottom: 20,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  portfolioChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioChangeText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  portfolioChangeAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  portfolioStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  watchlistContainer: {
    gap: 16,
  },
  watchlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stockName: {
    fontSize: 14,
  },
  stockPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  newsContainer: {
    gap: 16,
  },
  newsItem: {
    paddingVertical: 4,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 22,
  },
  newsSource: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DashboardScreen;
