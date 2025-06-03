import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../hooks/redux';
import {
  useGetPortfolioQuery,
  useGetWatchlistQuery,
  useGetNewsQuery,
} from '../../store/api/apiSlice';
import { useTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: portfolio,
    isLoading: portfolioLoading,
    refetch: refetchPortfolio,
  } = useGetPortfolioQuery(undefined, {
    skip: !user,
  });

  const {
    data: watchlist,
    isLoading: watchlistLoading,
    refetch: refetchWatchlist,
  } = useGetWatchlistQuery(undefined, {
    skip: !user,
  });
  const {
    data: news,
    isLoading: newsLoading,
    refetch: refetchNews,
  } = useGetNewsQuery({
    symbol: 'MARKET',
    limit: 5,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPortfolio(),
        refetchWatchlist(),
        refetchNews(),
      ]);
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
        <Text style={[styles.greeting, { color: theme.colors.surface }]}>
          Welcome back,
        </Text>
        <Text style={[styles.userName, { color: theme.colors.surface }]}>
          {user?.first_name || 'Investor'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Portfolio Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Portfolio Overview
          </Text>
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            {portfolioLoading ? (
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Loading portfolio...
              </Text>
            ) : portfolio ? (
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
                  <View style={styles.portfolioChange}>                    <Text
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
                        styles.statValue,                        { color: getChangeColor(portfolio.total_return || 0) },
                      ]}
                    >
                      {formatCurrency(portfolio.total_return || 0)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
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
          </View>
        </View>

        {/* Watchlist */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Watchlist
            </Text>
            <TouchableOpacity>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            {watchlistLoading ? (
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Loading watchlist...
              </Text>            ) : watchlist && watchlist.length > 0 ? (
              <View style={styles.watchlistContainer}>
                {watchlist
                  .slice(0, 5)
                  .map((item: any, index: number) => (
                    <View key={item.stock_symbol} style={styles.watchlistItem}>
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
                          {item.stock.name}
                        </Text>
                      </View>
                      <View style={styles.stockPrice}>
                        <Text
                          style={[
                            styles.priceText,
                            { color: theme.colors.text },
                          ]}
                        >
                          {formatCurrency(stock.current_price)}
                        </Text>
                        <Text
                          style={[
                            styles.changeText,
                            { color: getChangeColor(stock.change_percent) },
                          ]}
                        >
                          {formatPercentage(stock.change_percent)}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
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
        </View>

        {/* Market News */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Market News
            </Text>
            <TouchableOpacity>
              <Text
                style={[styles.seeAllText, { color: theme.colors.primary }]}
              >
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            {newsLoading ? (
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Loading news...
              </Text>
            ) : news && news.length > 0 ? (
              <View style={styles.newsContainer}>
                {news.slice(0, 3).map((article: any, index: number) => (
                  <TouchableOpacity key={index} style={styles.newsItem}>
                    <Text
                      style={[styles.newsTitle, { color: theme.colors.text }]}
                    >
                      {article.title}
                    </Text>
                    <Text
                      style={[
                        styles.newsSource,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {article.source} •{' '}
                      {new Date(article.published_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
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
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
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
