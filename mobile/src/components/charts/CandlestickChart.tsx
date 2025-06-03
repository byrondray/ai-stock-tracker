import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  width?: number;
  height?: number;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  width = screenWidth - 32,
  height = 220,
  style,
}) => {
  const { theme } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <View style={styles.placeholderContainer}>
          <Text
            style={[styles.placeholder, { color: theme.colors.textSecondary }]}
          >
            No Candlestick Data Available
          </Text>
          <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
            OHLC data will appear here
          </Text>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions and scales
  const chartWidth = width - 32;
  const chartHeight = height - 100; // Leave space for labels and stats
  const candleWidth = Math.max(8, Math.min(20, chartWidth / data.length - 2));
  const candleSpacing = 2;

  // Find price range
  const allPrices = data.flatMap((d) => [d.open, d.high, d.low, d.close]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1; // 10% padding

  // Scale function for prices
  const scalePrice = (price: number) => {
    return (
      ((maxPrice + padding - price) / (priceRange + 2 * padding)) * chartHeight
    );
  };

  // Calculate stats
  const firstCandle = data[0];
  const lastCandle = data[data.length - 1];
  const change = lastCandle.close - firstCandle.open;
  const changePercent = (change / firstCandle.open) * 100;

  const renderCandle = (candleData: CandlestickData, index: number) => {
    const { open, high, low, close } = candleData;
    const isGreen = close >= open;
    const candleColor = isGreen ? theme.colors.success : theme.colors.error;

    const bodyTop = scalePrice(Math.max(open, close));
    const bodyBottom = scalePrice(Math.min(open, close));
    const bodyHeight = Math.max(2, bodyBottom - bodyTop);

    const wickTop = scalePrice(high);
    const wickBottom = scalePrice(low);

    const x = index * (candleWidth + candleSpacing) + 16;

    return (
      <View key={index} style={[styles.candleContainer, { left: x }]}>
        {/* Upper wick */}
        <View
          style={[
            styles.wick,
            {
              top: wickTop,
              height: bodyTop - wickTop,
              backgroundColor: candleColor,
              left: candleWidth / 2 - 1,
            },
          ]}
        />

        {/* Candle body */}
        <View
          style={[
            styles.candleBody,
            {
              top: bodyTop,
              height: bodyHeight,
              width: candleWidth,
              backgroundColor: isGreen
                ? theme.colors.success
                : theme.colors.error,
              borderColor: candleColor,
              opacity: isGreen ? 0.8 : 1,
            },
          ]}
        />

        {/* Lower wick */}
        <View
          style={[
            styles.wick,
            {
              top: bodyBottom,
              height: wickBottom - bodyBottom,
              backgroundColor: candleColor,
              left: candleWidth / 2 - 1,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Current
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${lastCandle.close.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Change
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color: change >= 0 ? theme.colors.success : theme.colors.error,
              },
            ]}
          >
            {change >= 0 ? '+' : ''}${change.toFixed(2)} (
            {changePercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* Chart Area */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chartScrollView}
        contentContainerStyle={{
          width: Math.max(
            width,
            data.length * (candleWidth + candleSpacing) + 32
          ),
        }}
      >
        <View
          style={[
            styles.chartContainer,
            {
              width: Math.max(
                chartWidth,
                data.length * (candleWidth + candleSpacing)
              ),
              height: chartHeight,
            },
          ]}
        >
          {/* Background grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <View
              key={ratio}
              style={[
                styles.gridLine,
                {
                  top: ratio * chartHeight,
                  backgroundColor:
                    theme.colors.border || theme.colors.textSecondary,
                },
              ]}
            />
          ))}

          {/* Price labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price =
              maxPrice + padding - ratio * (priceRange + 2 * padding);
            return (
              <Text
                key={ratio}
                style={[
                  styles.priceLabel,
                  {
                    top: ratio * chartHeight - 8,
                    color: theme.colors.textSecondary,
                  },
                ]}
              >
                ${price.toFixed(0)}
              </Text>
            );
          })}

          {/* Render candlesticks */}
          {data.map(renderCandle)}
        </View>
      </ScrollView>

      {/* Stats Footer */}
      <View style={styles.statsFooter}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            High
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${maxPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Low
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${minPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Period
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {data.length}D
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholder: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    textAlign: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartScrollView: {
    flex: 1,
  },
  chartContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.2,
  },
  priceLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 10,
    fontWeight: '500',
  },
  candleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  candleBody: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 1,
  },
  wick: {
    position: 'absolute',
    width: 2,
  },
});

export default CandlestickChart;
