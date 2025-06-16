/**
 * Stock Detail Screen
 *
 * Comprehensive stock analysis screen with price charts, AI predictions,
 * fundamental/technical analysis, and portfolio management capabilities
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../store';
import { useTheme } from '../hooks/useTheme';
import {
  useGetStockQuery,
  useGetStockPriceQuery,
  useGetStockPriceHistoryQuery,
  useGetStockAnalysisQuery,
  useGetStockPredictionQuery,
  useGetStockNewsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useAddToPortfolioMutation,
  useGetWatchlistQuery,
} from '../store/api/apiSlice';
import {
  addItem as addToWatchlistLocal,
  removeItem as removeFromWatchlistLocal,
} from '../store/slices/watchlistSlice';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChangeIndicator } from '../components/ui/ChangeIndicator';
import {
  LoadingSpinner,
  SkeletonLoader,
  SkeletonText,
  SkeletonCard,
} from '../components/ui';
import LineChart from '../components/charts/LineChart';

const { width: screenWidth } = Dimensions.get('window');

type RootStackParamList = {
  StockDetail: { symbol: string };
  PortfolioDetail: { portfolioId: string };
};

type StockDetailScreenRouteProp = RouteProp<RootStackParamList, 'StockDetail'>;
type StockDetailScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

interface AddToPortfolioModalData {
  shares: string;
  price: string;
}

export const StockDetailScreen: React.FC = () => {
  const route = useRoute<StockDetailScreenRouteProp>();
  const navigation = useNavigation<StockDetailScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { symbol } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [addToPortfolioModalVisible, setAddToPortfolioModalVisible] =
    useState(false);
  const [portfolioModalData, setPortfolioModalData] =
    useState<AddToPortfolioModalData>({
      shares: '',
      price: '',
    });

  // API queries
  const {
    data: stockData,
    isLoading: stockLoading,
    error: stockError,
    refetch: refetchStock,
  } = useGetStockQuery(symbol);

  // Fetch real-time price data separately
  const {
    data: priceData,
    isLoading: priceLoading,
    error: priceError,
    refetch: refetchPrice,
  } = useGetStockPriceQuery(symbol);

  // Fetch historical data for charts
  const {
    data: historicalData,
    isLoading: historicalLoading,
    error: historicalError,
    refetch: refetchHistorical,
  } = useGetStockPriceHistoryQuery({
    symbol,
    timeframe: selectedTimeframe.toLowerCase(),
  });

  const {
    data: analysisData,
    isLoading: analysisLoading,
    error: analysisError,
    refetch: refetchAnalysis,
  } = useGetStockAnalysisQuery(symbol);

  const {
    data: predictionData,
    isLoading: predictionLoading,
    error: predictionError,
    refetch: refetchPrediction,
  } = useGetStockPredictionQuery({ symbol, days: 7 });

  const {
    data: realNewsData,
    isLoading: newsLoading,
    error: newsError,
    refetch: refetchNews,
  } = useGetStockNewsQuery({ symbol, limit: 5 });

  // Watchlist API calls
  const { data: watchlistData, refetch: refetchWatchlist } =
    useGetWatchlistQuery();

  const [addToWatchlistMutation, { isLoading: addingToWatchlist }] =
    useAddToWatchlistMutation();

  const [removeFromWatchlistMutation, { isLoading: removingFromWatchlist }] =
    useRemoveFromWatchlistMutation();

  const [addToPortfolioMutation, { isLoading: addingToPortfolio }] =
    useAddToPortfolioMutation();

  // Use real data when available, show nothing when unavailable
  const displayAnalysisData = analysisData;
  const displayPredictionData = predictionData;
  // Get real chart data from historical prices
  const getChartData = (timeframe: string) => {
    // Use real historical data if available
    if (historicalData?.data && historicalData.data.length > 0) {
      const prices = historicalData.data;

      // Extract price data - handle both 'close' and 'close_price' fields
      const data = prices.map((price) => {
        const closePrice = price.close || price.close_price || price.Close || 0;
        return closePrice;
      });

      // Generate labels based on timeframe and data length
      const labels = prices.map((price, index) => {
        const date = new Date(price.date);

        // Adjust label format based on timeframe - use shorter formats
        switch (timeframe) {
          case '1D':
            // For intraday data, show time in compact format
            if (prices.length > 50) {
              // Intraday data - show hours only
              return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: false, // Use 24h format for compactness
              });
            } else {
              // Daily close data - very compact
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }
          case '1W':
            // Compact weekday format
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
            });
          case '1M':
            // Month/day format
            return `${date.getMonth() + 1}/${date.getDate()}`;
          case '3M':
          case '6M':
            // Month/day format
            return `${date.getMonth() + 1}/${date.getDate()}`;
          case '1Y':
            // Month abbreviation
            return date.toLocaleDateString('en-US', {
              month: 'short',
            });
          default:
            // Default compact format
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      });

      // Optimize labels to prevent overlap - more aggressive filtering
      let optimizedLabels = labels;
      const maxLabels = timeframe === '1D' ? 4 : 5; // Reduce max labels further

      if (labels.length > maxLabels) {
        const step = Math.max(1, Math.floor(labels.length / maxLabels));

        // Always include first and last, then evenly space the rest
        const selectedIndices = [0]; // Always include first

        // Add evenly spaced indices
        for (let i = step; i < labels.length - 1; i += step) {
          selectedIndices.push(i);
        }

        // Always include last if not already included
        if (selectedIndices[selectedIndices.length - 1] !== labels.length - 1) {
          selectedIndices.push(labels.length - 1);
        }

        // Filter both labels and data to match
        optimizedLabels = selectedIndices.map((i) => labels[i]);

        // Also optimize the data array to match the labels
        const optimizedData = selectedIndices.map((i) => data[i]);
        data.splice(0, data.length, ...optimizedData);
      }

      const validData = data.filter((price) => price > 0);
      if (validData.length === 0) {
        console.log('❌ No valid price data found');
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }],
        };
      }
      return {
        labels: optimizedLabels,
        datasets: [{ data }],
      };
    }

    // No historical data available - return placeholder chart with current price
    const currentPrice = displayStockData?.current_price || 150;
    return {
      labels: ['Current'],
      datasets: [{ data: [currentPrice] }],
    };
  };

  // Only use real news data, no fallbacks
  const displayNewsData = realNewsData;

  // Local state
  const watchlistItems = useAppSelector((state) => state.watchlist.items);
  const portfolioItems = useAppSelector(
    (state) => state.portfolio.portfolio?.items || []
  );

  // Check if stock is in watchlist using API data (preferred) or local state (fallback)
  const isInWatchlistAPI = watchlistData?.some(
    (item) => item.stock_symbol === symbol
  );
  const isInWatchlistLocal = watchlistItems.some(
    (item) => item.stock_symbol === symbol
  );
  const isInWatchlist = isInWatchlistAPI ?? isInWatchlistLocal;

  // Use real data when available, with better fallback using watchlist data
  const watchlistItem = watchlistItems.find(
    (item) => item.stock_symbol === symbol
  );

  // Extract daily stats from historical data (same source as chart)
  const getDailyStats = () => {
    if (historicalData?.data && historicalData.data.length > 0) {
      const latestData = historicalData.data[historicalData.data.length - 1];
      return {
        open: latestData.open || latestData.Open,
        high: latestData.high || latestData.High,
        low: latestData.low || latestData.Low,
        volume: latestData.volume || latestData.Volume,
      };
    }
    return { open: null, high: null, low: null, volume: null };
  };

  const dailyStats = getDailyStats();
  const displayStockData = React.useMemo(() => {
    // Priority 1: Combine stock data with separate price data (REAL DATA!)
    if (stockData && priceData && priceData.price > 0) {
      return {
        ...stockData,
        current_price: priceData.price,
        change_amount: priceData.change,
        change_percent: priceData.change_percent,
        volume: priceData.volume,
        last_updated: priceData.last_updated,
      };
    } // Priority 2: Use API stock data if it has valid price
    if (stockData && stockData.current_price && stockData.current_price > 0) {
      return stockData;
    } // Priority 3: Use just price data with basic stock info
    if (priceData && priceData.price > 0) {
      return {
        symbol: symbol,
        name: stockData?.name || `${symbol} Inc.`,
        current_price: priceData.price,
        change_amount: priceData.change,
        change_percent: priceData.change_percent,
        open_price: null,
        high_price: null,
        low_price: null,
        volume: priceData.volume,
        market_cap: stockData?.market_cap || null,
        sector: stockData?.sector || 'Technology',
        exchange: stockData?.exchange || 'NASDAQ',
        currency: 'USD',
        last_updated: priceData.last_updated,
      };
    }

    // Priority 4: Use watchlist data if available and valid
    if (
      watchlistItem &&
      watchlistItem.current_price &&
      watchlistItem.current_price > 0
    ) {
      const result = {
        symbol: symbol,
        name: (watchlistItem.stock as any)?.name || `${symbol} Inc.`,
        current_price: watchlistItem.current_price,
        change_amount: watchlistItem.price_change || 0,
        change_percent: watchlistItem.price_change_percent || 0,
        open_price: null,
        high_price: null,
        low_price: null,
        volume: null,
        market_cap: (watchlistItem.stock as any)?.market_cap || null,
        sector: (watchlistItem.stock as any)?.sector || null,
        exchange: (watchlistItem.stock as any)?.exchange || null,
        currency: 'USD',
        last_updated: new Date().toISOString(),
      };
      return result;
    }

    // No fallback data - return null if no real data available
    return null;
  }, [stockData, priceData, watchlistItem, symbol]);

  const portfolioPosition = portfolioItems.find(
    (item) => item.symbol === symbol
  );

  const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  // Refetch data when timeframe changes
  useEffect(() => {
    refetchHistorical();
  }, [selectedTimeframe, refetchHistorical]);
  useEffect(() => {
    navigation.setOptions({
      title: symbol,
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text,
      headerTitleStyle: {
        color: theme.colors.text,
        fontWeight: '600',
      },
      headerBackTitle: 'Home',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleWatchlistToggle}
          style={styles.headerButton}
          disabled={addingToWatchlist || removingFromWatchlist}
        >
          <Ionicons
            name={
              addingToWatchlist || removingFromWatchlist
                ? 'sync'
                : isInWatchlist
                ? 'heart'
                : 'heart-outline'
            }
            size={24}
            color={isInWatchlist ? theme.colors.error : theme.colors.text}
          />
        </TouchableOpacity>
      ),
    });
  }, [
    isInWatchlist,
    symbol,
    theme.colors,
    addingToWatchlist,
    removingFromWatchlist,
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Stagger the API calls to avoid rate limiting
      console.log('🔄 Refreshing essential data first...');
      await refetchStock();
      await refetchPrice();

      // Add small delay before fetching more data
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log('🔄 Refreshing chart data...');
      await refetchHistorical();

      // Another delay before AI services
      await new Promise((resolve) => setTimeout(resolve, 500)); // These are more likely to be rate limited, so do them last and in parallel
      await Promise.all([
        refetchAnalysis().catch((e) =>
          console.log('Analysis rate limited:', e)
        ),
        refetchPrediction().catch((e) =>
          console.log('Prediction rate limited:', e)
        ),
        refetchNews().catch((e) => console.log('News rate limited:', e)),
        refetchWatchlist(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleWatchlistToggle = async () => {
    if (addingToWatchlist || removingFromWatchlist) {
      return; // Prevent multiple simultaneous requests
    }

    try {
      if (isInWatchlist) {
        // Remove from watchlist using API
        await removeFromWatchlistMutation(symbol).unwrap();

        // Also update local state for immediate UI feedback
        const watchlistItem = watchlistItems.find(
          (item) => item.stock_symbol === symbol
        );
        if (watchlistItem) {
          dispatch(removeFromWatchlistLocal(watchlistItem.id));
        }
      } else {
        // Add to watchlist using API
        await addToWatchlistMutation({
          stock_symbol: symbol,
          notes: `Added ${symbol} to watchlist`,
        }).unwrap();

        // Also update local state for immediate UI feedback
        dispatch(
          addToWatchlistLocal({
            id: Date.now(),
            stock_symbol: symbol,
            stock: displayStockData?.name || '',
            current_price: displayStockData?.current_price || 0,
            price_change: displayStockData?.change_amount || 0,
            price_change_percent: displayStockData?.change_percent || 0,
            added_at: new Date().toISOString(),
          })
        );
      }

      // Refetch watchlist to ensure consistency
      await refetchWatchlist();
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      Alert.alert('Error', 'Failed to update watchlist. Please try again.');
    }
  };

  const handleAddToPortfolio = () => {
    setPortfolioModalData({
      shares: '',
      price: (displayStockData?.current_price || 0).toString(),
    });
    setAddToPortfolioModalVisible(true);
  };

  const handleSaveToPortfolio = async () => {
    if (addingToPortfolio) return; // Prevent duplicate requests

    const shares = parseInt(portfolioModalData.shares, 10);
    const price = parseFloat(portfolioModalData.price);

    if (isNaN(shares) || shares <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of shares.');
      return;
    }

    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid price.');
      return;
    }

    try {
      // Use API to add to portfolio
      await addToPortfolioMutation({
        stock_symbol: symbol,
        quantity: shares,
        average_cost: price,
        purchase_date: new Date().toISOString(),
        notes: `Added ${shares} shares of ${symbol}`,
      }).unwrap();

      // Portfolio will be automatically updated via RTK Query cache invalidation

      setAddToPortfolioModalVisible(false);
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      Alert.alert('Error', 'Failed to add to portfolio. Please try again.');
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'strong_buy':
        return theme.colors.success;
      case 'buy':
        return '#4CAF50';
      case 'hold':
        return theme.colors.warning;
      case 'sell':
        return '#FF7043';
      case 'strong_sell':
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const formatRating = (rating: string) => {
    return rating.replace('_', ' ').toUpperCase();
  };

  // Render loading skeleton while data is being fetched
  const renderLoadingSkeleton = () => (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        {/* Stock Header Skeleton */}
        <Card style={styles.headerCard}>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <SkeletonLoader
                width={120}
                height={32}
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader
                width={200}
                height={18}
                style={{ marginBottom: 4 }}
              />
              <SkeletonLoader width={100} height={14} />
            </View>
            <View style={styles.priceInfo}>
              <SkeletonLoader
                width={140}
                height={32}
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader width={80} height={16} />
            </View>
          </View>
        </Card>
        {/* Chart Section Skeleton */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <SkeletonLoader width={100} height={20} />
            <View style={styles.timeframeSelector}>
              {timeframes.map((timeframe, index) => (
                <SkeletonLoader
                  key={index}
                  width={32}
                  height={24}
                  style={{ borderRadius: 8, marginHorizontal: 2 }}
                />
              ))}
            </View>
          </View>
          <View style={styles.chartContainer}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <LoadingSpinner
                variant='gradient'
                size='large'
                text='Loading chart data...'
              />
            </View>
          </View>
        </Card>
        {/* AI Analysis Skeleton */}
        <Card style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <View style={styles.analysisHeaderLeft}>
              <SkeletonLoader
                width={32}
                height={32}
                style={{ marginRight: 12, borderRadius: 16 }}
              />
              <SkeletonLoader width={100} height={20} />
            </View>
          </View>
          <View style={styles.analysisLoadingState}>
            <View
              style={[styles.loadingIndicator, { backgroundColor: '#f0f0f0' }]}
            >
              <SkeletonLoader
                width={120}
                height={16}
                style={{ marginBottom: 8 }}
              />
              <SkeletonLoader width={200} height={14} />
            </View>
          </View>
        </Card>
        {/* Predictions Skeleton */}
        <Card style={styles.predictionCard}>
          <SkeletonLoader width={150} height={20} style={{ marginBottom: 4 }} />
          <SkeletonLoader
            width={120}
            height={12}
            style={{ marginBottom: 16 }}
          />
          <View style={styles.predictionList}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={styles.predictionItem}>
                <SkeletonLoader width={60} height={12} />
                <SkeletonLoader width={80} height={14} />
                <SkeletonLoader width={40} height={12} />
              </View>
            ))}
          </View>
        </Card>
        {/* Statistics Skeleton */}
        <Card style={styles.statsCard}>
          <SkeletonLoader
            width={130}
            height={20}
            style={{ marginBottom: 16 }}
          />
          <View style={styles.statsGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={index} style={styles.statItem}>
                <SkeletonLoader
                  width={60}
                  height={12}
                  style={{ marginBottom: 4 }}
                />
                <SkeletonLoader width={80} height={14} />
              </View>
            ))}
          </View>
        </Card>
        {/* News Skeleton */}
        <Card style={styles.newsCard}>
          <SkeletonLoader
            width={100}
            height={20}
            style={{ marginBottom: 16 }}
          />
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={styles.newsItem}>
              <SkeletonText lines={2} style={{ marginBottom: 4 }} />
              <SkeletonLoader
                width={120}
                height={12}
                style={{ marginBottom: 4 }}
              />
              <SkeletonText lines={1} />
            </View>
          ))}
        </Card>
        {/* Actions Skeleton */}
        <Card style={styles.actionsCard}>
          <SkeletonLoader width={80} height={20} style={{ marginBottom: 16 }} />
          <View style={styles.actionButtons}>
            <SkeletonLoader
              width='48%'
              height={48}
              style={{ borderRadius: 8 }}
            />
            <SkeletonLoader
              width='48%'
              height={48}
              style={{ borderRadius: 8 }}
            />
          </View>
        </Card>
      </ScrollView>
    </LinearGradient>
  );

  // Show loading skeleton while initial data is being fetched
  if ((stockLoading && !stockData) || (priceLoading && !priceData)) {
    return renderLoadingSkeleton();
  }

  // Show error state if no real data is available
  if (!displayStockData) {
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
          <Card style={styles.errorCard}>
            <View style={styles.errorContainer}>
              <Ionicons
                name='alert-circle-outline'
                size={64}
                color={theme.colors.error}
              />
              <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                No Data Available
              </Text>
              <Text
                style={[
                  styles.errorMessage,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Unable to load stock data for {symbol}.
              </Text>
              {stockError && (
                <Text
                  style={[styles.errorDetails, { color: theme.colors.error }]}
                >
                  Stock API Error: {JSON.stringify(stockError)}
                </Text>
              )}
              {priceError && (
                <Text
                  style={[styles.errorDetails, { color: theme.colors.error }]}
                >
                  Price API Error: {JSON.stringify(priceError)}
                </Text>
              )}
              <Button
                title='Retry'
                onPress={handleRefresh}
                style={[
                  styles.retryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            </View>
          </Card>
        </ScrollView>
      </LinearGradient>
    );
  }

  // TypeScript assertion: displayStockData is guaranteed to be non-null here
  const safeStock = displayStockData;

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
        {/* Rate Limit Info - Show if AI services are failing */}
        {(analysisError || predictionError || newsError) && (
          <Card
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.warning + '20',
                borderColor: theme.colors.warning,
              },
            ]}
          >
            <View style={styles.infoContent}>
              <Text style={[styles.infoIcon, { color: theme.colors.warning }]}>
                ℹ️
              </Text>
              <View style={styles.infoText}>
                <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                  API Rate Limit Reached
                </Text>
                <Text
                  style={[
                    styles.infoMessage,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Free APIs have daily limits. Stock prices and charts still
                  work. AI analysis will resume after the limit resets.
                </Text>
              </View>
            </View>
          </Card>
        )}
        {/* Stock Header */}
        <Card style={styles.headerCard}>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockSymbol, { color: theme.colors.text }]}>
                {displayStockData.symbol}
              </Text>
              <Text
                style={[
                  styles.stockName,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {displayStockData.name}
              </Text>
              <Text
                style={[
                  styles.stockSector,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {displayStockData.sector}
              </Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={[styles.currentPrice, { color: theme.colors.text }]}>
                ${displayStockData.current_price?.toFixed(2) || '150.00'}
              </Text>
              <ChangeIndicator
                value={displayStockData.change_amount || 0}
                percentage={displayStockData.change_percent || 0}
              />
            </View>
          </View>
        </Card>
        {/* Chart Section */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Price Chart
            </Text>
            <View style={styles.timeframeSelector}>
              {timeframes.map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  onPress={() => setSelectedTimeframe(timeframe)}
                  style={[
                    styles.timeframeButton,
                    selectedTimeframe === timeframe && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeframeText,
                      {
                        color:
                          selectedTimeframe === timeframe
                            ? theme.colors.background
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {timeframe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.chartContainer}>
            <LineChart data={getChartData(selectedTimeframe)} />
          </View>
        </Card>
        {/* AI Analysis */}
        <Card style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <View style={styles.analysisHeaderLeft}>
              <View style={styles.aiIconContainer}>
                <Ionicons
                  name='analytics'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                AI Analysis
              </Text>
            </View>
            {analysisLoading && (
              <View style={styles.loadingBadge}>
                <LoadingSpinner variant='gradient' size='small' />
                <Text
                  style={[
                    styles.loadingBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Analyzing...
                </Text>
              </View>
            )}
            {analysisError && (
              <View
                style={[
                  styles.errorBadge,
                  { backgroundColor: theme.colors.warning + '20' },
                ]}
              >
                <Ionicons
                  name='warning-outline'
                  size={16}
                  color={theme.colors.warning}
                />
                <Text
                  style={[styles.errorText, { color: theme.colors.warning }]}
                >
                  Unavailable
                </Text>
              </View>
            )}
          </View>

          {analysisLoading ? (
            <View style={styles.analysisLoadingState}>
              <View
                style={[
                  styles.loadingIndicator,
                  { backgroundColor: theme.colors.primary + '10' },
                ]}
              >
                <LoadingSpinner variant='gradient' size='large' />
                <Text
                  style={[styles.loadingTitle, { color: theme.colors.primary }]}
                >
                  🤖 AI Analysis in Progress
                </Text>
                <Text
                  style={[
                    styles.loadingDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Performing comprehensive fundamental and technical analysis...
                </Text>
              </View>
            </View>
          ) : analysisData ? (
            <View style={styles.analysisContent}>
              {/* Overall Rating Card */}
              <View
                style={[
                  styles.ratingCard,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <Text
                  style={[
                    styles.ratingLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Overall Rating
                </Text>
                <View style={styles.ratingContent}>
                  <Text
                    style={[
                      styles.ratingValue,
                      {
                        color: getRatingColor(
                          displayAnalysisData?.overall_rating || 'hold'
                        ),
                      },
                    ]}
                  >
                    {formatRating(
                      displayAnalysisData?.overall_rating || 'hold'
                    )}
                  </Text>
                  <View
                    style={[
                      styles.ratingBadge,
                      {
                        backgroundColor:
                          getRatingColor(
                            displayAnalysisData?.overall_rating || 'hold'
                          ) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratingBadgeText,
                        {
                          color: getRatingColor(
                            displayAnalysisData?.overall_rating || 'hold'
                          ),
                        },
                      ]}
                    >
                      {(
                        displayAnalysisData?.overall_rating || 'hold'
                      ).toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Analysis Metrics */}
              <View style={styles.metricsGrid}>
                <View
                  style={[
                    styles.metricCard,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <View style={styles.metricHeader}>
                    <Ionicons
                      name='analytics'
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Fundamental
                    </Text>
                  </View>
                  <Text
                    style={[styles.metricValue, { color: theme.colors.text }]}
                  >
                    {displayAnalysisData?.fundamental_score ?? '--'}
                  </Text>
                  <Text
                    style={[
                      styles.metricUnit,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    /100
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricCard,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <View style={styles.metricHeader}>
                    <Ionicons
                      name='trending-up'
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Technical
                    </Text>
                  </View>
                  <Text
                    style={[styles.metricValue, { color: theme.colors.text }]}
                  >
                    {displayAnalysisData?.technical_score ?? '--'}
                  </Text>
                  <Text
                    style={[
                      styles.metricUnit,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    /100
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricCard,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <View style={styles.metricHeader}>
                    <Ionicons
                      name='shield-checkmark'
                      size={18}
                      color={
                        (displayAnalysisData?.risk_score ?? 0) > 70
                          ? theme.colors.error
                          : (displayAnalysisData?.risk_score ?? 0) > 40
                          ? theme.colors.warning
                          : theme.colors.success
                      }
                    />
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Risk Score
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          (displayAnalysisData?.risk_score ?? 0) > 70
                            ? theme.colors.error
                            : (displayAnalysisData?.risk_score ?? 0) > 40
                            ? theme.colors.warning
                            : theme.colors.success,
                      },
                    ]}
                  >
                    {displayAnalysisData?.risk_score ?? '--'}
                  </Text>
                  <Text
                    style={[
                      styles.metricUnit,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    /100
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.analysisErrorState}>
              <View
                style={[
                  styles.errorIndicator,
                  { backgroundColor: theme.colors.warning + '10' },
                ]}
              >
                <Ionicons
                  name='analytics-outline'
                  size={32}
                  color={theme.colors.warning}
                />
                <Text
                  style={[
                    styles.analysisErrorTitle,
                    { color: theme.colors.warning },
                  ]}
                >
                  Analysis Temporarily Unavailable
                </Text>
                <Text
                  style={[
                    styles.errorDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  AI analysis service is currently offline. Stock price data and
                  charts are still available.
                </Text>
              </View>
            </View>
          )}
        </Card>
        {/* AI Predictions */}
        <Card style={styles.predictionCard}>
          <View style={styles.analysisHeader}>
            <View style={styles.analysisHeaderLeft}>
              <View style={styles.aiIconContainer}>
                <Ionicons
                  name='trending-up'
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                AI Price Predictions
              </Text>
            </View>
            {predictionLoading && (
              <View style={styles.loadingBadge}>
                <LoadingSpinner variant='gradient' size='small' />
                <Text
                  style={[
                    styles.loadingBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Training...
                </Text>
              </View>
            )}
            {predictionError && (
              <View
                style={[
                  styles.errorBadge,
                  { backgroundColor: theme.colors.warning + '20' },
                ]}
              >
                <Ionicons
                  name='warning-outline'
                  size={16}
                  color={theme.colors.warning}
                />
                <Text
                  style={[styles.errorText, { color: theme.colors.warning }]}
                >
                  Unavailable
                </Text>
              </View>
            )}
          </View>

          {predictionLoading ? (
            <View style={styles.analysisLoadingState}>
              <View
                style={[
                  styles.loadingIndicator,
                  { backgroundColor: theme.colors.primary + '10' },
                ]}
              >
                <LoadingSpinner variant='gradient' size='small' />
                <Text
                  style={[styles.loadingTitle, { color: theme.colors.primary }]}
                >
                  Training LSTM Model
                </Text>
                <Text
                  style={[
                    styles.loadingDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Neural network analyzing price patterns...
                </Text>
              </View>
            </View>
          ) : displayPredictionData ? (
            <View style={styles.analysisContent}>
              <View style={styles.analysisMetrics}>
                <View style={styles.metricItem}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Model
                  </Text>
                  <Text
                    style={[styles.metricValue, { color: theme.colors.text }]}
                  >
                    {displayPredictionData.model_type} v
                    {displayPredictionData.model_version}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Confidence
                  </Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: theme.colors.success },
                    ]}
                  >
                    {displayPredictionData.predictions.length > 0
                      ? `${(
                          displayPredictionData.predictions[0].confidence * 100
                        ).toFixed(1)}%`
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.predictionList}>
                {displayPredictionData.predictions.length > 0 ? (
                  displayPredictionData.predictions
                    .slice(0, 7)
                    .map((prediction, index) => (
                      <View key={index} style={styles.predictionItem}>
                        <View style={styles.predictionInfo}>
                          <Text
                            style={[
                              styles.predictionDate,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {new Date(prediction.date).toLocaleDateString()}
                          </Text>
                          <Text
                            style={[
                              styles.predictionPrice,
                              { color: theme.colors.text },
                            ]}
                          >
                            ${prediction.predicted_price.toFixed(2)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.confidenceBadge,
                            {
                              backgroundColor:
                                prediction.confidence > 0.8
                                  ? theme.colors.success + '20'
                                  : prediction.confidence > 0.6
                                  ? theme.colors.warning + '20'
                                  : theme.colors.error + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confidenceText,
                              {
                                color:
                                  prediction.confidence > 0.8
                                    ? theme.colors.success
                                    : prediction.confidence > 0.6
                                    ? theme.colors.warning
                                    : theme.colors.error,
                              },
                            ]}
                          >
                            {(prediction.confidence * 100).toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    ))
                ) : (
                  <View style={styles.analysisErrorState}>
                    <View
                      style={[
                        styles.errorIndicator,
                        { backgroundColor: theme.colors.warning + '10' },
                      ]}
                    >
                      <Ionicons
                        name='bar-chart-outline'
                        size={32}
                        color={theme.colors.warning}
                      />
                      <Text
                        style={[
                          styles.analysisErrorTitle,
                          { color: theme.colors.warning },
                        ]}
                      >
                        No Predictions Available
                      </Text>
                      <Text
                        style={[
                          styles.errorDescription,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        ML prediction service returned no data for this stock.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.analysisErrorState}>
              <View
                style={[
                  styles.errorIndicator,
                  { backgroundColor: theme.colors.warning + '10' },
                ]}
              >
                <Ionicons
                  name='cloud-offline-outline'
                  size={32}
                  color={theme.colors.warning}
                />
                <Text
                  style={[
                    styles.analysisErrorTitle,
                    { color: theme.colors.warning },
                  ]}
                >
                  Predictions Unavailable
                </Text>
                <Text
                  style={[
                    styles.errorDescription,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  AI prediction service is temporarily unavailable. Stock price
                  data and charts are still working.
                </Text>
              </View>
            </View>
          )}
        </Card>
        {/* Stock Stats */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Key Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Open
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dailyStats.open ? `$${dailyStats.open.toFixed(2)}` : '--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                High
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dailyStats.high ? `$${dailyStats.high.toFixed(2)}` : '--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Low
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dailyStats.low ? `$${dailyStats.low.toFixed(2)}` : '--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Volume
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dailyStats.volume ? dailyStats.volume.toLocaleString() : '--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Market Cap
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {displayStockData.market_cap
                  ? `$${(displayStockData.market_cap / 1e9).toFixed(2)}B`
                  : '--'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Exchange
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {displayStockData.exchange}
              </Text>
            </View>
          </View>
        </Card>
        {/* News Section - Only show if news is available */}
        {displayNewsData?.news_items &&
          displayNewsData.news_items.length > 0 && (
            <Card style={styles.newsCard}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Latest News
              </Text>
              {displayNewsData.news_items.map((news: any, index: number) => (
                <TouchableOpacity key={index} style={styles.newsItem}>
                  <Text
                    style={[styles.newsTitle, { color: theme.colors.text }]}
                  >
                    {news.title}
                  </Text>
                  <Text
                    style={[
                      styles.newsSource,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {news.source} •
                    {new Date(news.published_at).toLocaleDateString()}
                  </Text>
                  <Text
                    style={[
                      styles.newsSummary,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {news.summary}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          )}
        {/* Action Buttons */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Actions
          </Text>
          <View style={styles.actionButtons}>
            {portfolioPosition ? (
              <Button
                title={`Holdings: ${portfolioPosition.quantity} shares`}
                onPress={() =>
                  navigation.navigate('PortfolioDetail', {
                    portfolioId: portfolioPosition.id.toString(),
                  })
                }
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.secondary },
                ]}
              />
            ) : (
              <Button
                title='Add to Portfolio'
                onPress={handleAddToPortfolio}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.success },
                ]}
              />
            )}
            <Button
              title={
                addingToWatchlist || removingFromWatchlist
                  ? 'Updating...'
                  : isInWatchlist
                  ? 'Remove from Watchlist'
                  : 'Add to Watchlist'
              }
              onPress={handleWatchlistToggle}
              disabled={addingToWatchlist || removingFromWatchlist}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isInWatchlist
                    ? theme.colors.error
                    : theme.colors.primary,
                  opacity: addingToWatchlist || removingFromWatchlist ? 0.6 : 1,
                },
              ]}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Add to Portfolio Modal */}
      <Modal
        visible={addToPortfolioModalVisible}
        transparent
        animationType='slide'
        onRequestClose={() => setAddToPortfolioModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Add {symbol} to Portfolio
            </Text>

            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Number of Shares
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={portfolioModalData.shares}
                onChangeText={(text) =>
                  setPortfolioModalData((prev) => ({ ...prev, shares: text }))
                }
                keyboardType='numeric'
                placeholder='Enter number of shares'
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Purchase Price
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={portfolioModalData.price}
                onChangeText={(text) =>
                  setPortfolioModalData((prev) => ({ ...prev, price: text }))
                }
                keyboardType='decimal-pad'
                placeholder='Enter purchase price'
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title='Cancel'
                onPress={() => setAddToPortfolioModalVisible(false)}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                textStyle={{ color: theme.colors.text }}
              />
              <Button
                title={addingToPortfolio ? 'Adding...' : 'Add to Portfolio'}
                onPress={handleSaveToPortfolio}
                disabled={addingToPortfolio}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: addingToPortfolio ? 0.6 : 1,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  headerButton: {
    padding: 8,
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  stockName: {
    fontSize: 18,
    marginTop: 4,
  },
  stockSector: {
    fontSize: 14,
    marginTop: 2,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    height: 325,
    marginVertical: 16,
    overflow: 'hidden',
    borderRadius: 8,
  },
  analysisCard: {
    marginBottom: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  analysisHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#667eea10',
  },
  loadingBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  analysisLoadingState: {
    marginTop: 8,
  },
  loadingIndicator: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  loadingDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  analysisContent: {
    marginTop: 8,
  },
  ratingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  ratingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 12,
  },
  analysisErrorState: {
    marginTop: 8,
  },
  errorIndicator: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  analysisErrorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  predictionCard: {
    marginBottom: 16,
  },
  predictionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  predictionList: {
    gap: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  predictionPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  analysisMetrics: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
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
  newsCard: {
    marginBottom: 16,
  },
  newsItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  newsSource: {
    fontSize: 12,
    marginBottom: 4,
  },
  newsSummary: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionsCard: {
    marginBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  errorCard: {
    marginBottom: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    padding: 8,
  },
  retryButton: {
    marginTop: 16,
    minWidth: 120,
  },
  rateLimitNotice: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  rateLimitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  rateLimitText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  rateLimitHint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoCard: {
    marginBottom: 16,
    borderWidth: 1,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoMessage: {
    fontSize: 14,
    lineHeight: 18,
  },
});
