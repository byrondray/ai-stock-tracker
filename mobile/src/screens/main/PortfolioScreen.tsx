import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import {
  useGetPortfolioQuery,
  useAddToPortfolioMutation,
  useUpdatePortfolioHoldingMutation,
  useRemoveFromPortfolioMutation,
  PortfolioItem,
} from '../../store/api/apiSlice';
import { ChangeIndicator } from '../../components/ui/ChangeIndicator';

const PortfolioScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);  const [editingHolding, setEditingHolding] = useState<PortfolioItem | null>(
    null
  );
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    price: '',
  });

  const { data: portfolio, isLoading, refetch } = useGetPortfolioQuery();

  const [addToPortfolio, { isLoading: adding }] = useAddToPortfolioMutation();
  const [updateHolding, { isLoading: updating }] =
    useUpdatePortfolioHoldingMutation();
  const [removeFromPortfolio, { isLoading: removing }] =
    useRemoveFromPortfolioMutation();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddStock = () => {
    setEditingHolding(null);
    setFormData({ symbol: '', quantity: '', price: '' });
    setModalVisible(true);
  };
  const handleEditHolding = (holding: PortfolioItem) => {
    setEditingHolding(holding);
    setFormData({
      symbol: holding.stock_symbol,
      quantity: holding.quantity.toString(),
      price: holding.average_cost.toString(),
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    const { symbol, quantity, price } = formData;

    if (!symbol.trim() || !quantity || !price) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (
      isNaN(quantityNum) ||
      isNaN(priceNum) ||
      quantityNum <= 0 ||
      priceNum <= 0
    ) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }    try {
      if (editingHolding) {
        await updateHolding({
          id: editingHolding.id,
          data: {
            quantity: quantityNum,
            average_cost: priceNum,
          }
        }).unwrap();
        Alert.alert('Success', 'Holding updated successfully');
      } else {
        await addToPortfolio({
          stock_symbol: symbol.toUpperCase(),
          quantity: quantityNum,
          average_cost: priceNum,
          purchase_date: new Date().toISOString(),
        }).unwrap();
        Alert.alert('Success', 'Stock added to portfolio');
      }
      setModalVisible(false);
      setFormData({ symbol: '', quantity: '', price: '' });
    } catch (error: any) {
      Alert.alert('Error', error?.data?.detail || 'Failed to update portfolio');
    }
  };

  const handleRemoveHolding = (symbol: string) => {
    Alert.alert(
      'Remove Stock',
      `Are you sure you want to remove ${symbol} from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',          onPress: async () => {
            try {
              // Find the holding by symbol to get the ID
              const holdingToRemove = portfolio?.items.find(item => item.stock_symbol === symbol);
              if (holdingToRemove) {
                await removeFromPortfolio(holdingToRemove.id).unwrap();
                Alert.alert('Success', 'Stock removed from portfolio');
              }
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.data?.detail || 'Failed to remove stock'
              );
            }
          },
        },
      ]
    );
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
  };  const renderHolding = (holding: PortfolioItem) => (
    <TouchableOpacity
      key={holding.stock_symbol}
      style={[styles.holdingCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleEditHolding(holding)}
      onLongPress={() => handleRemoveHolding(holding.stock_symbol)}
      activeOpacity={0.7}
    >
      <View style={styles.holdingHeader}>
        <View>
          <Text style={[styles.holdingSymbol, { color: theme.colors.text }]}>
            {holding.stock_symbol}
          </Text>
          <Text
            style={[styles.holdingName, { color: theme.colors.textSecondary }]}
          >
            {holding.stock?.name || holding.stock_symbol}
          </Text>
        </View>
        <View style={styles.holdingValue}>
          <Text style={[styles.valueText, { color: theme.colors.text }]}>
            {formatCurrency(holding.current_value || 0)}
          </Text>
          <ChangeIndicator
            value={holding.total_return || 0}
            percentage={holding.return_percentage || 0}
          />
        </View>
      </View>
      <View style={styles.holdingDetails}>
        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Shares
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {holding.quantity}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Avg. Cost
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatCurrency(holding.average_cost)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Current Price
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatCurrency(holding.stock?.current_price || 0)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading portfolio...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.surface }]}>
          Portfolio
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleAddStock}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
            + Add Stock
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Summary */}
        {portfolio && (
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
              Total Portfolio Value
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.text }]}>
              {formatCurrency(portfolio.total_value)}
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    { color: getChangeColor(portfolio.total_return) },
                  ]}
                >
                  {formatCurrency(portfolio.total_return)}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Total Gain/Loss
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    { color: getChangeColor(portfolio.return_percentage) },
                  ]}
                >
                  {formatPercentage(portfolio.return_percentage)}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Return %
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Holdings */}
        <View style={styles.holdingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Holdings
          </Text>          {portfolio?.items && portfolio.items.length > 0 ? (
            portfolio.items.map(renderHolding)
          ) : (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Holdings Yet
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Add your first stock to start building your portfolio
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text
                style={[
                  styles.modalCancelText,
                  { color: theme.colors.primary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingHolding ? 'Edit Holding' : 'Add Stock'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={adding || updating}
            >
              <Text
                style={[styles.modalSaveText, { color: theme.colors.primary }]}
              >
                {adding || updating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Symbol
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
                value={formData.symbol}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, symbol: text }))
                }
                placeholder='AAPL'
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize='characters'
                editable={!editingHolding}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Quantity
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
                value={formData.quantity}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, quantity: text }))
                }
                placeholder='100'
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType='numeric'
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                {editingHolding ? 'Average Price' : 'Purchase Price'}
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
                value={formData.price}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, price: text }))
                }
                placeholder='150.00'
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType='numeric'
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  holdingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  holdingCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  holdingName: {
    fontSize: 14,
  },  holdingValue: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gainText: {
    fontSize: 14,
    fontWeight: '500',
  },
  holdingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
});

export default PortfolioScreen;
