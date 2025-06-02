import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
  style,
  ...props
}) => {
  const { theme } = useTheme();

  // Simple placeholder implementation
  // In a real app, you'd use a proper charting library like react-native-chart-kit
  const maxValue = Math.max(...data.datasets[0].data);
  const minValue = Math.min(...data.datasets[0].data);
  const range = maxValue - minValue;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={styles.chart}>
        <Text style={[styles.placeholder, { color: theme.colors.textSecondary }]}>
          Chart View
        </Text>
        <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
          {data.datasets[0].data.length} data points
        </Text>
        <View style={styles.stats}>
          <Text style={[styles.statText, { color: theme.colors.text }]}>
            High: ${maxValue.toFixed(2)}
          </Text>
          <Text style={[styles.statText, { color: theme.colors.text }]}>
            Low: ${minValue.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
  },
  chart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default LineChart;
