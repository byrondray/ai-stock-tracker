import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from './LoadingSpinner';
import { SkeletonText, SkeletonCard } from './SkeletonLoader';

interface SectionLoadingCardProps {
  type?: 'portfolio' | 'watchlist' | 'news' | 'generic';
  style?: any;
  showSpinner?: boolean;
}

const SectionLoadingCard: React.FC<SectionLoadingCardProps> = ({
  type = 'generic',
  style,
  showSpinner = false,
}) => {
  const { theme } = useTheme();

  const renderPortfolioSkeleton = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <View style={styles.header}>
        <SkeletonText lines={1} style={{ width: 140 }} />
        <SkeletonText lines={1} style={{ width: 60 }} />
      </View>
      
      <View style={styles.portfolioValue}>
        <SkeletonText lines={1} style={{ width: 180, height: 32, marginBottom: 8 }} />
        <View style={styles.changeRow}>
          <SkeletonText lines={1} style={{ width: 80, height: 18, marginRight: 8 }} />
          <SkeletonText lines={1} style={{ width: 100, height: 18 }} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <SkeletonText lines={1} style={{ width: 60, height: 14, marginBottom: 4 }} />
          <SkeletonText lines={1} style={{ width: 40, height: 18 }} />
        </View>
        <View style={styles.statItem}>
          <SkeletonText lines={1} style={{ width: 70, height: 14, marginBottom: 4 }} />
          <SkeletonText lines={1} style={{ width: 80, height: 18 }} />
        </View>
      </View>
    </View>
  );

  const renderWatchlistSkeleton = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <View style={styles.header}>
        <SkeletonText lines={1} style={{ width: 100 }} />
        <SkeletonText lines={1} style={{ width: 60 }} />
      </View>
      
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.watchlistItem}>
          <View style={styles.stockInfo}>
            <SkeletonText lines={1} style={{ width: 60, height: 16, marginBottom: 4 }} />
            <SkeletonText lines={1} style={{ width: 120, height: 14 }} />
          </View>
          <View style={styles.priceInfo}>
            <SkeletonText lines={1} style={{ width: 70, height: 16, marginBottom: 4 }} />
            <SkeletonText lines={1} style={{ width: 50, height: 14 }} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderNewsSkeleton = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      <View style={styles.header}>
        <SkeletonText lines={1} style={{ width: 120 }} />
        <SkeletonText lines={1} style={{ width: 60 }} />
      </View>
      
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.newsItem}>
          <SkeletonText lines={2} style={{ marginBottom: 8 }} />
          <SkeletonText lines={1} style={{ width: 150, height: 12 }} />
        </View>
      ))}
    </View>
  );

  const renderGenericSkeleton = () => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      {showSpinner ? (
        <LoadingSpinner variant="pulse" size="large" />
      ) : (
        <>
          <View style={styles.header}>
            <SkeletonText lines={1} style={{ width: 120 }} />
            <SkeletonText lines={1} style={{ width: 60 }} />
          </View>
          <SkeletonText lines={3} style={{ marginTop: 16 }} />
        </>
      )}
    </View>
  );

  switch (type) {
    case 'portfolio':
      return renderPortfolioSkeleton();
    case 'watchlist':
      return renderWatchlistSkeleton();
    case 'news':
      return renderNewsSkeleton();
    default:
      return renderGenericSkeleton();
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  portfolioValue: {
    marginBottom: 20,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  watchlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockInfo: {
    flex: 1,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  newsItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
});

export default SectionLoadingCard;