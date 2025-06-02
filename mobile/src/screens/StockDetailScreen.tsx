import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { useTheme } from '../hooks/useTheme';
import {
  useGetStockDetailsQuery,
  useGetStockPriceHistoryQuery,
  useGetStockAnalysisQuery,
  useGetStockPredictionQuery,
} from '../store/api/apiSlice';
import {
  addToWatchlist,
  removeFromWatchlist,
} from '../store/slices/watchlistSlice';
import { addToPortfolio } from '../store/slices/portfolioSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChangeIndicator } from '../components/ui/ChangeIndicator';
import LineChart from '../components/charts/LineChart';

type RootStackParamList = {
  StockDetail: { symbol: string };
};

type StockDetailScreenRouteProp = RouteProp<RootStackParamList, 'StockDetail'>;
type StockDetailScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const { width: screenWidth } = Dimensions.get('window');

export const StockDetailScreen: React.FC = () => {
  const route = useRoute<StockDetailScreenRouteProp>();
  const navigation = useNavigation<StockDetailScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { symbol } = route.params;

  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>(
    '1M'
  );
  const [refreshing, setRefreshing] = useState(false);

  const watchlist = useAppSelector((state) => state.watchlist.items);
  const isInWatchlist = watchlist.some((item) => item.symbol === symbol);

  const {
    data: stockDetails,
    isLoading: detailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useGetStockDetailsQuery(symbol);

  const {
    data: priceHistory,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useGetStockPriceHistoryQuery({ symbol, timeframe });

  const {
    data: analysis,
    isLoading: analysisLoading,
    error: analysisError,
    refetch: refetchAnalysis,
  } = useGetStockAnalysisQuery(symbol);

  const {
    data: prediction,
    isLoading: predictionLoading,
    error: predictionError,
    refetch: refetchPrediction,
  } = useGetStockPredictionQuery(symbol);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDetails(),
        refetchHistory(),
        refetchAnalysis(),
        refetchPrediction(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleWatchlist = () => {
    if (isInWatchlist) {
      dispatch(removeFromWatchlist(symbol));
    } else {
      dispatch(
        addToWatchlist({
          id: Date.now().toString(),
          symbol,
          name: stockDetails?.name || symbol,
          currentPrice: stockDetails?.currentPrice || 0,
          change: stockDetails?.change || 0,
          changePercent: stockDetails?.changePercent || 0,
          addedAt: new Date().toISOString(),
        })
      );
    }
  };

  const handleAddToPortfolio = () => {
    Alert.prompt(
      'Add to Portfolio',
      'Enter the number of shares:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (shares) => {
            const numShares = parseInt(shares || '0', 10);
            if (numShares > 0 && stockDetails) {
              dispatch(
                addToPortfolio({
                  id: Date.now().toString(),
                  symbol,
                  name: stockDetails.name,
                  shares: numShares,
                  averagePrice: stockDetails.currentPrice,
                  totalValue: stockDetails.currentPrice * numShares,
                  purchaseDate: new Date().toISOString(),
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

  const renderChart = () => {
    if (historyLoading || !priceHistory || priceHistory.length === 0) {
      return (
        <View
          style={[
            styles.chartContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <ActivityIndicator size='large' color={theme.colors.primary} />
        </View>
      );
    }

    const chartData = {
      labels: priceHistory.map((item) =>
        new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      ),
      datasets: [
        {
          data: priceHistory.map((item) => item.close),
          color: () => theme.colors.primary,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            Price Chart
          </Text>
          <View style={styles.timeframeButtons}>
            {(['1D', '1W', '1M', '3M', '1Y'] as const).map((tf) => (
              <Button
                key={tf}
                title={tf}
                onPress={() => setTimeframe(tf)}
                style={[
                  styles.timeframeButton,
                  timeframe === tf && { backgroundColor: theme.colors.primary },
                ]}
                textStyle={[
                  styles.timeframeButtonText,
                  {
                    color:
                      timeframe === tf
                        ? theme.colors.background
                        : theme.colors.text,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <LineChart
          data={chartData}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            backgroundColor: theme.colors.card,
            backgroundGradientFrom: theme.colors.card,
            backgroundGradientTo: theme.colors.card,
            decimalPlaces: 2,
            color: (opacity = 1) =>
              `rgba(${theme.colors.primary.replace('#', '')}, ${opacity})`,
            labelColor: () => theme.colors.text,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '0',
            },
          }}
          bezier
          style={styles.chart}
        />
      </Card>
    );
  };

  const renderAnalysis = () => {
    if (analysisLoading) {
      return <ActivityIndicator size='small' color={theme.colors.primary} />;
    }

    if (!analysis) return null;

    return (
      <Card style={styles.analysisCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          AI Analysis
        </Text>
        <View style={styles.analysisScores}>
          <View style={styles.scoreItem}>
            <Text
              style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}
            >
              Technical Score
            </Text>
            <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>
              {analysis.technicalScore}/100
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text
              style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}
            >
              Fundamental Score
            </Text>
            <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>
              {analysis.fundamentalScore}/100
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text
              style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}
            >
              Sentiment Score
            </Text>
            <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>
              {analysis.sentimentScore}/100
            </Text>
          </View>
        </View>
        <Text style={[styles.recommendation, { color: theme.colors.text }]}>
          Recommendation: {analysis.recommendation}
        </Text>
        <Text
          style={[styles.analysisText, { color: theme.colors.textSecondary }]}
        >
          {analysis.summary}
        </Text>
      </Card>
    );
  };

  const renderPrediction = () => {
    if (predictionLoading) {
      return <ActivityIndicator size='small' color={theme.colors.primary} />;
    }

    if (!prediction) return null;

    return (
      <Card style={styles.predictionCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Price Prediction
        </Text>
        <View style={styles.predictionValues}>
          <View style={styles.predictionItem}>
            <Text
              style={[
                styles.predictionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              1 Week
            </Text>
            <Text
              style={[styles.predictionPrice, { color: theme.colors.text }]}
            >
              ${prediction.oneWeek.toFixed(2)}
            </Text>
            <ChangeIndicator
              value={prediction.oneWeek - (stockDetails?.currentPrice || 0)}
              showIcon={false}
            />
          </View>
          <View style={styles.predictionItem}>
            <Text
              style={[
                styles.predictionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              1 Month
            </Text>
            <Text
              style={[styles.predictionPrice, { color: theme.colors.text }]}
            >
              ${prediction.oneMonth.toFixed(2)}
            </Text>
            <ChangeIndicator
              value={prediction.oneMonth - (stockDetails?.currentPrice || 0)}
              showIcon={false}
            />
          </View>
          <View style={styles.predictionItem}>
            <Text
              style={[
                styles.predictionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              3 Months
            </Text>
            <Text
              style={[styles.predictionPrice, { color: theme.colors.text }]}
            >
              ${prediction.threeMonths.toFixed(2)}
            </Text>
            <ChangeIndicator
              value={prediction.threeMonths - (stockDetails?.currentPrice || 0)}
              showIcon={false}
            />
          </View>
        </View>
        <Text
          style={[styles.confidenceText, { color: theme.colors.textSecondary }]}
        >
          Confidence: {(prediction.confidence * 100).toFixed(1)}%
        </Text>
      </Card>
    );
  };

  if (detailsLoading && !stockDetails) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading stock details...
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
        {stockDetails && (
          <Card style={styles.headerCard}>
            <View style={styles.stockHeader}>
              <View style={styles.stockInfo}>
                <Text
                  style={[styles.stockSymbol, { color: theme.colors.text }]}
                >
                  {stockDetails.symbol}
                </Text>
                <Text
                  style={[
                    styles.stockName,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {stockDetails.name}
                </Text>
              </View>
              <View style={styles.priceInfo}>
                <Text
                  style={[styles.currentPrice, { color: theme.colors.text }]}
                >
                  ${stockDetails.currentPrice.toFixed(2)}
                </Text>
                <ChangeIndicator
                  value={stockDetails.change}
                  percentage={stockDetails.changePercent}
                />
              </View>
            </View>
            <View style={styles.actionButtons}>
              <Button
                title={
                  isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'
                }
                onPress={handleToggleWatchlist}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isInWatchlist
                      ? theme.colors.error
                      : theme.colors.primary,
                  },
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
          </Card>
        )}

        {renderChart()}
        {renderAnalysis()}
        {renderPrediction()}

        {stockDetails && (
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
                  Market Cap
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  ${stockDetails.marketCap?.toLocaleString() || 'N/A'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  P/E Ratio
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {stockDetails.peRatio?.toFixed(2) || 'N/A'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  52W High
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  ${stockDetails.high52w?.toFixed(2) || 'N/A'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  52W Low
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  ${stockDetails.low52w?.toFixed(2) || 'N/A'}
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
                  {stockDetails.volume?.toLocaleString() || 'N/A'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Avg Volume
                </Text>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {stockDetails.avgVolume?.toLocaleString() || 'N/A'}
                </Text>
              </View>
            </View>
          </Card>
        )}
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
  headerCard: {
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeframeButtons: {
    flexDirection: 'row',
  },
  timeframeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    borderRadius: 8,
  },
  timeframeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  analysisCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  analysisScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recommendation: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 20,
  },
  predictionCard: {
    marginBottom: 16,
  },
  predictionValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  predictionItem: {
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  predictionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 12,
    textAlign: 'center',
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
});
