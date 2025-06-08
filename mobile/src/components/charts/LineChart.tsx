import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart as RNChartKitLineChart } from 'react-native-chart-kit';
import { useTheme } from '../../hooks/useTheme';

interface LineChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      color?: (opacity?: number) => string;
      strokeWidth?: number;
    }[];
  };
  width?: number;
  height?: number;
  chartConfig?: any;
  bezier?: boolean;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

const LineChart: React.FC<LineChartProps> = ({
  data,
  width = screenWidth - 32,
  height = 220,
  chartConfig,
  bezier = true,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  // Calculate stats for display
  const maxValue = Math.max(...data.datasets[0].data);
  const minValue = Math.min(...data.datasets[0].data);
  const firstValue = data.datasets[0].data[0];
  const lastValue = data.datasets[0].data[data.datasets[0].data.length - 1];
  const change = lastValue - firstValue;
  const changePercent = (change / firstValue) * 100;

  // Default chart configuration
  const defaultChartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 2,
    color: (opacity = 1) =>
      theme.colors.primary.replace('rgb', 'rgba').replace(')', `, ${opacity})`),
    labelColor: (opacity = 1) =>
      theme.colors.textSecondary
        .replace('rgb', 'rgba')
        .replace(')', `, ${opacity})`),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: theme.colors.border || theme.colors.textSecondary,
      strokeOpacity: 0.3,
    },
    formatYLabel: (value: string) => `$${parseFloat(value).toFixed(0)}`,
    formatXLabel: (value: string) => {
      // More aggressive label shortening to prevent overlap
      if (value.length > 5) {
        return value.substring(0, 5);
      }
      return value;
    },
  };

  const mergedChartConfig = { ...defaultChartConfig, ...chartConfig };

  // Fallback to placeholder if no data
  if (!data.datasets[0] || data.datasets[0].data.length === 0) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <View style={styles.placeholderContainer}>
          <Text
            style={[styles.placeholder, { color: theme.colors.textSecondary }]}
          >
            No Chart Data Available
          </Text>
          <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
            Historical data will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Chart Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Current
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${lastValue.toFixed(2)}
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

      {/* Chart */}
      <RNChartKitLineChart
        data={data}
        width={width}
        height={height}
        chartConfig={mergedChartConfig}
        bezier={bezier}
        style={styles.chart}
        transparent={true}
        withShadow={false}
        withInnerLines={true}
        withOuterLines={false}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        withDots={false}
        horizontalLabelRotation={0}
        verticalLabelRotation={0}
        segments={3}
        {...props}
      />

      {/* Chart Stats Footer */}
      <View style={styles.statsFooter}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            High
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${maxValue.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Low
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            ${minValue.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            Points
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {data.datasets[0].data.length}
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
  chart: {
    alignSelf: 'center',
  },
});

export default LineChart;
