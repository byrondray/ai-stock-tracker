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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { useTheme } from '../hooks/useTheme';
import {
  useGetPortfolioQuery,
  useUpdatePortfolioItemMutation,
  useDeletePortfolioItemMutation,
} from '../store/api/apiSlice';
import {
  updatePortfolioItem,
  removeFromPortfolio,
} from '../store/slices/portfolioSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChangeIndicator } from '../components/ui/ChangeIndicator';

type RootStackParamList = {
  PortfolioDetail: { portfolioId: string };
};

type PortfolioDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'PortfolioDetail'
>;

interface EditModalData {
  shares: string;
  averagePrice: string;
}

export const PortfolioDetailScreen: React.FC = () => {
  const route = useRoute<PortfolioDetailScreenRouteProp>();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { portfolioId } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalData, setEditModalData] = useState<EditModalData>({
    shares: '',
    averagePrice: '',
  });

  const portfolioItems = useAppSelector((state) => state.portfolio.items);
  const portfolioItem = portfolioItems.find((item) => item.id === portfolioId);

  const {
    data: portfolioData,
    isLoading,
    error,
    refetch,
  } = useGetPortfolioQuery();

  const [updatePortfolioItemMutation] = useUpdatePortfolioItemMutation();
  const [deletePortfolioItemMutation] = useDeletePortfolioItemMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditPortfolio = () => {
    if (!portfolioItem) return;

    setEditModalData({
      shares: portfolioItem.shares.toString(),
      averagePrice: portfolioItem.averagePrice.toString(),
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!portfolioItem) return;

    const shares = parseInt(editModalData.shares, 10);
    const averagePrice = parseFloat(editModalData.averagePrice);

    if (isNaN(shares) || shares <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of shares.');
      return;
    }

    if (isNaN(averagePrice) || averagePrice <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid average price.');
      return;
    }

    try {
      const updatedItem = {
        ...portfolioItem,
        shares,
        averagePrice,
        totalValue: shares * (portfolioItem.currentPrice || averagePrice),
      };

      await updatePortfolioItemMutation({
        id: portfolioId,
        data: updatedItem,
      }).unwrap();

      dispatch(
        updatePortfolioItem({
          id: portfolioId,
          updates: updatedItem,
        })
      );

      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating portfolio item:', error);
      Alert.alert(
        'Error',
        'Failed to update portfolio item. Please try again.'
      );
    }
  };

  const handleDeletePortfolio = () => {
    Alert.alert(
      'Delete Position',
      'Are you sure you want to delete this position from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePortfolioItemMutation(portfolioId).unwrap();
              dispatch(removeFromPortfolio(portfolioId));
              // Navigate back
            } catch (error) {
              console.error('Error deleting portfolio item:', error);
              Alert.alert(
                'Error',
                'Failed to delete portfolio item. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading portfolio details...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!portfolioItem) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Portfolio item not found
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const currentValue =
    portfolioItem.shares *
    (portfolioItem.currentPrice || portfolioItem.averagePrice);
  const totalGainLoss =
    currentValue - portfolioItem.shares * portfolioItem.averagePrice;
  const gainLossPercent =
    (totalGainLoss / (portfolioItem.shares * portfolioItem.averagePrice)) * 100;

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
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockSymbol, { color: theme.colors.text }]}>
                {portfolioItem.symbol}
              </Text>
              <Text
                style={[
                  styles.stockName,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {portfolioItem.name}
              </Text>
            </View>
            <View style={styles.priceInfo}>
              <Text style={[styles.currentPrice, { color: theme.colors.text }]}>
                $
                {portfolioItem.currentPrice?.toFixed(2) ||
                  portfolioItem.averagePrice.toFixed(2)}
              </Text>
              {portfolioItem.change !== undefined && (
                <ChangeIndicator
                  value={portfolioItem.change}
                  percentage={portfolioItem.changePercent}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Position Summary */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Position Summary
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Shares Owned
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {portfolioItem.shares.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Average Price
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                ${portfolioItem.averagePrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Invested
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                $
                {(portfolioItem.shares * portfolioItem.averagePrice).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Current Value
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                ${currentValue.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Performance Card */}
        <Card style={styles.performanceCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Performance
          </Text>
          <View style={styles.performanceContent}>
            <View style={styles.performanceItem}>
              <Text
                style={[
                  styles.performanceLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Gain/Loss
              </Text>
              <View style={styles.performanceValueContainer}>
                <Text
                  style={[
                    styles.performanceValue,
                    {
                      color:
                        totalGainLoss >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  ${totalGainLoss.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.performancePercent,
                    {
                      color:
                        totalGainLoss >= 0
                          ? theme.colors.success
                          : theme.colors.error,
                    },
                  ]}
                >
                  ({gainLossPercent >= 0 ? '+' : ''}
                  {gainLossPercent.toFixed(2)}%)
                </Text>
              </View>
            </View>
            <View style={styles.performanceItem}>
              <Text
                style={[
                  styles.performanceLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Purchase Date
              </Text>
              <Text
                style={[styles.performanceValue, { color: theme.colors.text }]}
              >
                {new Date(portfolioItem.purchaseDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Actions
          </Text>
          <View style={styles.actionButtons}>
            <Button
              title='Edit Position'
              onPress={handleEditPortfolio}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.primary },
              ]}
            />
            <Button
              title='Delete Position'
              onPress={handleDeletePortfolio}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.error },
              ]}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType='slide'
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Edit Position
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
                value={editModalData.shares}
                onChangeText={(text) =>
                  setEditModalData((prev) => ({ ...prev, shares: text }))
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
                Average Price
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
                value={editModalData.averagePrice}
                onChangeText={(text) =>
                  setEditModalData((prev) => ({ ...prev, averagePrice: text }))
                }
                keyboardType='decimal-pad'
                placeholder='Enter average price'
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title='Cancel'
                onPress={() => setEditModalVisible(false)}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                textStyle={{ color: theme.colors.text }}
              />
              <Button
                title='Save'
                onPress={handleSaveEdit}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
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
  summaryCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  performanceCard: {
    marginBottom: 16,
  },
  performanceContent: {
    gap: 16,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 14,
  },
  performanceValueContainer: {
    alignItems: 'flex-end',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  performancePercent: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
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
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
