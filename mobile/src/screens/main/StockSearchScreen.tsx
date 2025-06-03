import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import _ from 'lodash';
import { useTheme } from '../../hooks/useTheme';
import {
  useSearchStocksQuery,
  useGetStockDetailsQuery,
  useAddToWatchlistMutation,
  type StockSearchResult,
} from '../../store/api/apiSlice';

const StockSearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
  } = useSearchStocksQuery(searchQuery, {
    skip: searchQuery.length < 2,
  });

  const { data: stockDetails, isLoading: detailsLoading } =
    useGetStockDetailsQuery(selectedStock!, {
      skip: !selectedStock,
    });

  const [addToWatchlist, { isLoading: addingToWatchlist }] =
    useAddToWatchlistMutation();

  const debouncedSearch = useCallback(
    _.debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  const handleSearchInputChange = (text: string) => {
    debouncedSearch(text);
  };

  const handleStockPress = (symbol: string) => {
    setSelectedStock(symbol);
  };
  const handleAddToWatchlist = async (symbol: string) => {
    try {
      await addToWatchlist({ stock_symbol: symbol }).unwrap();
      Alert.alert('Success', `${symbol} added to watchlist`);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.data?.detail || 'Failed to add stock to watchlist'
      );
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

  const renderSearchResult = ({ item }: { item: StockSearchResult }) => (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        { backgroundColor: theme.colors.surface },
      ]}
      onPress={() => handleStockPress(item.symbol)}
      activeOpacity={0.7}
    >
      <View style={styles.stockInfo}>
        <Text style={[styles.stockSymbol, { color: theme.colors.text }]}>
          {item.symbol}
        </Text>
        <Text style={[styles.stockName, { color: theme.colors.textSecondary }]}>
          {item.name}
        </Text>
        <Text
          style={[styles.stockExchange, { color: theme.colors.textSecondary }]}
        >
          {item.exchange}{' '}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => handleAddToWatchlist(item.symbol)}
        disabled={addingToWatchlist}
      >
        <Text style={[styles.addButtonText, { color: theme.colors.surface }]}>
          +
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStockDetails = () => {
    if (!stockDetails) return null;

    return (
      <View
        style={[styles.detailsCard, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.detailsHeader}>
          <View>
            <Text style={[styles.detailsSymbol, { color: theme.colors.text }]}>
              {stockDetails.symbol}
            </Text>
            <Text
              style={[
                styles.detailsName,
                { color: theme.colors.textSecondary },
              ]}
            >
              {stockDetails.name}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.watchlistButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => handleAddToWatchlist(stockDetails.symbol)}
            disabled={addingToWatchlist}
          >
            <Text
              style={[
                styles.watchlistButtonText,
                { color: theme.colors.surface },
              ]}
            >
              Add to Watchlist
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceSection}>
          {' '}
          <Text style={[styles.currentPrice, { color: theme.colors.text }]}>
            {formatCurrency(stockDetails.current_price || 0)}
          </Text>
          <View style={styles.changeInfo}>
            <Text
              style={[
                styles.changeAmount,
                { color: getChangeColor(stockDetails.change_amount || 0) },
              ]}
            >
              {(stockDetails.change_amount || 0) >= 0 ? '+' : ''}
              {formatCurrency(Math.abs(stockDetails.change_amount || 0))}
            </Text>
            <Text
              style={[
                styles.changePercent,
                { color: getChangeColor(stockDetails.change_percent || 0) },
              ]}
            >
              ({formatPercentage(stockDetails.change_percent || 0)})
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Open
            </Text>{' '}
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(stockDetails.open_price || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              High
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(stockDetails.high_price || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Low
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(stockDetails.low_price || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              Volume
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stockDetails.volume?.toLocaleString() || 'N/A'}
            </Text>
          </View>
        </View>

        {stockDetails.market_cap && (
          <View style={styles.additionalInfo}>
            <Text
              style={[styles.marketCap, { color: theme.colors.textSecondary }]}
            >
              Market Cap: {stockDetails.market_cap.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder='Search stocks...'
          placeholderTextColor={theme.colors.textSecondary}
          onChangeText={handleSearchInputChange}
          autoCorrect={false}
          autoCapitalize='characters'
        />
      </View>

      {/* Stock Details */}
      {detailsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading stock details...
          </Text>
        </View>
      ) : (
        stockDetails && renderStockDetails()
      )}

      {/* Search Results */}
      {searchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Searching...
          </Text>
        </View>
      ) : searchError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Error searching stocks
          </Text>
        </View>
      ) : searchResults &&
        searchResults.results &&
        searchResults.results.length > 0 ? (
        <FlatList
          data={searchResults.results}
          keyExtractor={(item) => item.symbol}
          renderItem={renderSearchResult}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery.length >= 2 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            No stocks found for "{searchQuery}"
          </Text>
        </View>
      ) : (
        <View style={styles.instructionContainer}>
          <Text
            style={[
              styles.instructionText,
              { color: theme.colors.textSecondary },
            ]}
          >
            Enter a stock symbol or company name to search
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 60,
  },
  searchInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  instructionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: 2,
  },
  stockExchange: {
    fontSize: 12,
  },
  priceInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailsSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsName: {
    fontSize: 16,
  },
  watchlistButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watchlistButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: 20,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  changeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeAmount: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  additionalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  marketCap: {
    fontSize: 14,
  },
});

export default StockSearchScreen;
