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
  useGetStockAnalysisQuery,
  useGetStockPredictionQuery,
  useGetStockNewsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
  useAddToPortfolioMutation,
} from '../store/api/apiSlice';
import {
  addItem as addToWatchlist,
  removeItem as removeFromWatchlist,
} from '../store/slices/watchlistSlice';
import { addPortfolioItem } from '../store/slices/portfolioSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChangeIndicator } from '../components/ui/ChangeIndicator';
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

  // Fallback data for when API is not available
  const fallbackStockData = {
    symbol: symbol,
    name: `${symbol} Inc.`,
    current_price: 150.0 + Math.random() * 50,
    change_amount: (Math.random() - 0.5) * 10,
    change_percent: (Math.random() - 0.5) * 5,
    open_price: 145.0,
    high_price: 155.0,
    low_price: 142.0,
    volume: 1500000,
    market_cap: 2500000000000,
    sector: 'Technology',
    exchange: 'NASDAQ',
    currency: 'USD',
    last_updated: new Date().toISOString(),
  };

  const fallbackAnalysisData = {
    symbol: symbol,
    overall_rating: 'buy' as const,
    fundamental_score: 78,
    technical_score: 82,
    sentiment_score: 75,
    risk_score: 45,
    analysis_date: new Date().toISOString(),
  };

  const fallbackPredictionData = {
    symbol: symbol,
    model_type: 'LSTM',
    model_version: '2.1',
    created_at: new Date().toISOString(),
    predictions: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
      predicted_price:
        (fallbackStockData.current_price || 150) + (Math.random() - 0.5) * 20,
      confidence: 0.6 + Math.random() * 0.3,
      lower_bound: undefined,
      upper_bound: undefined,
    })),
  };

  // Use real data if available, fallback to mock data
  const displayStockData = stockData || fallbackStockData;
  const displayAnalysisData = analysisData || fallbackAnalysisData;
  const displayPredictionData = predictionData || fallbackPredictionData;

  const newsData = {
    news_items: [
      {
        title: `${symbol} reports strong quarterly earnings`,
        summary:
          'Company beats analyst expectations with record revenue growth.',
        source: 'Financial Times',
        published_at: new Date().toISOString(),
      },
      {
        title: `${symbol} announces new product launch`,
        summary:
          'Revolutionary new technology expected to drive future growth.',
        source: 'TechCrunch',
        published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  };

  // Local state
  const watchlistItems = useAppSelector((state) => state.watchlist.items);
  const portfolioItems = useAppSelector(
    (state) => state.portfolio.portfolio?.items || []
  );

  const isInWatchlist = watchlistItems.some(
    (item) => item.stock_symbol === symbol
  );
  const portfolioPosition = portfolioItems.find(
    (item) => item.symbol === symbol
  );

  const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  useEffect(() => {
    navigation.setOptions({
      title: symbol,
      headerRight: () => (
        <TouchableOpacity
          onPress={handleWatchlistToggle}
          style={styles.headerButton}
        >
          <Ionicons
            name={isInWatchlist ? 'heart' : 'heart-outline'}
            size={24}
            color={isInWatchlist ? theme.colors.error : theme.colors.text}
          />
        </TouchableOpacity>
      ),
    });
  }, [isInWatchlist, symbol, theme.colors]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refetch all data
      await Promise.all([
        refetchStock(),
        refetchAnalysis(),
        refetchPrediction(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleWatchlistToggle = async () => {
    try {
      if (isInWatchlist) {
        const watchlistItem = watchlistItems.find(
          (item) => item.stock_symbol === symbol
        );
        if (watchlistItem) {
          dispatch(removeFromWatchlist(watchlistItem.id));
        }
      } else {
        dispatch(
          addToWatchlist({
            id: Date.now(),
            stock_symbol: symbol,
            stock: displayStockData.name || '',
            current_price: displayStockData.current_price || 0,
            price_change: displayStockData.change_amount || 0,
            price_change_percent: displayStockData.change_percent || 0,
            added_at: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      Alert.alert('Error', 'Failed to update watchlist. Please try again.');
    }
  };

  const handleAddToPortfolio = () => {
    setPortfolioModalData({
      shares: '',
      price: (displayStockData.current_price || 0).toString(),
    });
    setAddToPortfolioModalVisible(true);
  };

  const handleSaveToPortfolio = async () => {
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
      dispatch(
        addPortfolioItem({
          id: Date.now(),
          symbol: symbol,
          name: displayStockData?.name || '',
          quantity: shares,
          average_cost: price,
          purchase_date: new Date().toISOString(),
          current_price: displayStockData.current_price || 0,
          value: shares * (displayStockData.current_price || 0),
          gain: shares * ((displayStockData.current_price || 0) - price),
          gainPercent:
            (((displayStockData.current_price || 0) - price) / price) * 100,
        })
      );

      setAddToPortfolioModalVisible(false);
      Alert.alert(
        'Success',
        `Added ${shares} shares of ${symbol} to your portfolio.`
      );
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

  // Show loading state while data is being fetched
  if (stockLoading || analysisLoading || predictionLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading stock data...
        </Text>
      </View>
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
                ${(displayStockData.current_price || 0).toFixed(2)}
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
            <LineChart
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                datasets: [
                  {
                    data: [
                      (displayStockData.current_price || 150) - 5,
                      (displayStockData.current_price || 150) - 2,
                      (displayStockData.current_price || 150) + 1,
                      (displayStockData.current_price || 150) - 1,
                      displayStockData.current_price || 150,
                    ],
                  },
                ],
              }}
            />
          </View>
        </Card>

        {/* AI Analysis */}
        <Card style={styles.analysisCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            AI Analysis
          </Text>
          <View style={styles.analysisGrid}>
            <View style={styles.analysisItem}>
              <Text
                style={[
                  styles.analysisLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Overall Rating
              </Text>
              <Text
                style={[
                  styles.analysisValue,
                  { color: getRatingColor(displayAnalysisData.overall_rating) },
                ]}
              >
                {formatRating(displayAnalysisData.overall_rating)}
              </Text>
            </View>
            <View style={styles.analysisItem}>
              <Text
                style={[
                  styles.analysisLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Fundamental
              </Text>
              <Text
                style={[styles.analysisValue, { color: theme.colors.text }]}
              >
                {displayAnalysisData.fundamental_score}/100
              </Text>
            </View>
            <View style={styles.analysisItem}>
              <Text
                style={[
                  styles.analysisLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Technical
              </Text>
              <Text
                style={[styles.analysisValue, { color: theme.colors.text }]}
              >
                {displayAnalysisData.technical_score}/100
              </Text>
            </View>
            <View style={styles.analysisItem}>
              <Text
                style={[
                  styles.analysisLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Sentiment
              </Text>
              <Text
                style={[styles.analysisValue, { color: theme.colors.text }]}
              >
                {displayAnalysisData.sentiment_score}/100
              </Text>
            </View>
            <View style={styles.analysisItem}>
              <Text
                style={[
                  styles.analysisLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Risk Score
              </Text>
              <Text
                style={[
                  styles.analysisValue,
                  {
                    color:
                      displayAnalysisData.risk_score > 70
                        ? theme.colors.error
                        : displayAnalysisData.risk_score > 40
                        ? theme.colors.warning
                        : theme.colors.success,
                  },
                ]}
              >
                {displayAnalysisData.risk_score}/100
              </Text>
            </View>
          </View>
        </Card>

        {/* AI Predictions */}
        <Card style={styles.predictionCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            AI Price Predictions
          </Text>
          <Text
            style={[
              styles.predictionSubtitle,
              { color: theme.colors.textSecondary },
            ]}
          >
            Model: {displayPredictionData.model_type} v
            {displayPredictionData.model_version}
          </Text>
          <View style={styles.predictionList}>
            {displayPredictionData.predictions
              .slice(0, 7)
              .map((prediction, index) => (
                <View key={index} style={styles.predictionItem}>
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
                  <Text
                    style={[
                      styles.predictionConfidence,
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
              ))}
          </View>
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
                ${(displayStockData.open_price || 0).toFixed(2)}
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
                ${(displayStockData.high_price || 0).toFixed(2)}
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
                ${(displayStockData.low_price || 0).toFixed(2)}
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
                {(displayStockData.volume || 0).toLocaleString()}
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
                ${((displayStockData.market_cap || 0) / 1e9).toFixed(2)}B
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

        {/* News Section */}
        <Card style={styles.newsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Latest News
          </Text>
          {newsData.news_items.map((news, index) => (
            <TouchableOpacity key={index} style={styles.newsItem}>
              <Text style={[styles.newsTitle, { color: theme.colors.text }]}>
                {news.title}
              </Text>
              <Text
                style={[
                  styles.newsSource,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {news.source}
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
                isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'
              }
              onPress={handleWatchlistToggle}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isInWatchlist
                    ? theme.colors.error
                    : theme.colors.primary,
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
                title='Add to Portfolio'
                onPress={handleSaveToPortfolio}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
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
    height: 200,
    marginVertical: 16,
  },
  analysisCard: {
    marginBottom: 16,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  analysisItem: {
    width: '48%',
    marginBottom: 16,
  },
  analysisLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  analysisValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingVertical: 8,
  },
  predictionDate: {
    fontSize: 12,
    flex: 1,
  },
  predictionPrice: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  predictionConfidence: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
});
