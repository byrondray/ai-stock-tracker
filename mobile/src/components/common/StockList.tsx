import React from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { StockCard } from '../ui/StockCard';

interface Stock {
  symbol: string;
  name: string;
  current_price: number;
  change_amount: number;
  change_percent: number;
  volume?: number;
}

interface StockListProps {
  stocks: Stock[];
  loading?: boolean;
  onStockPress?: (symbol: string) => void;
  emptyMessage?: string;
}

export const StockList: React.FC<StockListProps> = ({
  stocks,
  loading = false,
  onStockPress,
  emptyMessage = 'No stocks available',
}) => {
  const { theme } = useTheme();

  const renderStockItem = ({ item }: { item: Stock }) => (
    <StockCard
      symbol={item.symbol}
      name={item.name}
      price={item.current_price}
      change={item.change_amount}
      changePercent={item.change_percent}
      volume={item.volume}
      onPress={onStockPress}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {emptyMessage}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading stocks...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={stocks}
      renderItem={renderStockItem}
      keyExtractor={(item) => item.symbol}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmpty}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
  },
});

export default StockList;
