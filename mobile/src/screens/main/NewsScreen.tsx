import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGetMarketNewsQuery } from '../../store/api/apiSlice';
import {
  LoadingSpinner,
  SkeletonLoader,
  SkeletonCard,
  SkeletonText,
} from '../../components/ui';

const NewsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const {
    data: news,
    isLoading,
    refetch,
  } = useGetMarketNewsQuery({
    limit: 50,
  });

  // Filter news items by sentiment
  const allNewsItems = news?.news_items || [];
  const newsItems =
    selectedSentiment === 'all'
      ? allNewsItems
      : allNewsItems.filter((item) => item.sentiment === selectedSentiment);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleArticlePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this article');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open article');
    }
  };
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#10B981'; // Green
      case 'negative':
        return '#EF4444'; // Red
      case 'neutral':
        return '#6B7280'; // Gray
      default:
        return theme.colors.primary;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'trending-up';
      case 'negative':
        return 'trending-down';
      case 'neutral':
        return 'remove-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const renderSentimentFilters = () => {
    const filters = [
      {
        key: 'all',
        label: 'All',
        count: allNewsItems.length,
        icon: 'list-outline',
      },
      {
        key: 'positive',
        label: 'Positive',
        count: allNewsItems.filter((item) => item.sentiment === 'positive')
          .length,
        icon: 'trending-up',
      },
      {
        key: 'neutral',
        label: 'Neutral',
        count: allNewsItems.filter((item) => item.sentiment === 'neutral')
          .length,
        icon: 'remove-outline',
      },
      {
        key: 'negative',
        label: 'Negative',
        count: allNewsItems.filter((item) => item.sentiment === 'negative')
          .length,
        icon: 'trending-down',
      },
    ];

    return (
      <View style={styles.filtersContainer}>
        {filters.map((filter) => {
          const isSelected = selectedSentiment === filter.key;
          const sentimentColor =
            filter.key === 'all'
              ? theme.colors.primary
              : getSentimentColor(filter.key);

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                {
                  backgroundColor: isSelected
                    ? sentimentColor + '20'
                    : 'transparent',
                  borderColor: isSelected
                    ? sentimentColor
                    : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedSentiment(filter.key)}
            >
              <View style={styles.filterContent}>
                <Ionicons
                  name={filter.icon as any}
                  size={14}
                  color={
                    isSelected ? sentimentColor : theme.colors.textSecondary
                  }
                  style={styles.filterIcon}
                />
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isSelected
                        ? sentimentColor
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {filter.label} ({filter.count})
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  const renderNewsItem = ({ item }: { item: any }) => {
    // Debug log to check if sentiment_score is available
    if (item.sentiment) {
      console.log('News item sentiment data:', {
        title: item.title.substring(0, 50) + '...',
        sentiment: item.sentiment,
        sentiment_score: item.sentiment_score,
      });
    }

    return (
      <TouchableOpacity
        style={[styles.newsCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleArticlePress(item.url)}
        activeOpacity={0.7}
      >
        <View style={styles.newsContent}>
          <View style={styles.newsTitleRow}>
            <Text style={[styles.newsTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            {item.sentiment && (
              <View style={styles.sentimentContainer}>
                <View
                  style={[
                    styles.sentimentIndicator,
                    {
                      backgroundColor: getSentimentColor(item.sentiment) + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={getSentimentIcon(item.sentiment) as any}
                    size={12}
                    color={getSentimentColor(item.sentiment)}
                  />
                </View>
                {item.sentiment_score !== undefined &&
                  item.sentiment_score !== null && (
                    <Text
                      style={[
                        styles.sentimentScore,
                        { color: getSentimentColor(item.sentiment) },
                      ]}
                    >
                      {Math.abs(item.sentiment_score * 100).toFixed(0)}%
                    </Text>
                  )}
              </View>
            )}
          </View>

          {item.summary && (
            <Text
              style={[
                styles.newsSummary,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={3}
            >
              {item.summary}
            </Text>
          )}

          <View style={styles.newsFooter}>
            <View style={styles.newsMetadata}>
              <Text
                style={[styles.newsSource, { color: theme.colors.primary }]}
              >
                {item.source}
              </Text>
              {item.published_at && (
                <Text
                  style={[
                    styles.newsTime,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  • {formatTimeAgo(item.published_at)}
                </Text>
              )}
            </View>
            {item.symbol && (
              <View style={styles.symbolContainer}>
                <Text
                  style={[styles.symbolText, { color: theme.colors.primary }]}
                >
                  ${item.symbol}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {Array.from({ length: 10 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonItem,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <SkeletonLoader width='80%' height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width='60%' height={14} style={{ marginBottom: 8 }} />
          <SkeletonLoader width='40%' height={12} />
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name='newspaper-outline'
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No News Available
      </Text>
      <Text
        style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}
      >
        Pull down to refresh or check back later
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
            Market News
          </Text>
          <Text style={[styles.headerSubtitle, { color: '#FFFFFF' }]}>
            Stay updated with the latest market insights
          </Text>
        </LinearGradient>
        {renderLoadingState()}
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
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          Market News
        </Text>
        <Text style={[styles.headerSubtitle, { color: '#FFFFFF' }]}>
          Stay updated with the latest market insights
        </Text>
      </LinearGradient>
      {/* Sentiment Filters */}
      {allNewsItems.length > 0 && renderSentimentFilters()}
      {/* News List */}
      {newsItems.length > 0 ? (
        <FlatList
          data={newsItems}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          renderItem={renderNewsItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  listContent: {
    padding: 16,
  },
  newsCard: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newsContent: {
    flex: 1,
  },
  newsTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sentimentIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  sentimentScore: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  newsSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  newsSource: {
    fontSize: 12,
    fontWeight: '600',
  },
  newsTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  symbolContainer: {
    backgroundColor: '#667eea20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  symbolText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skeletonContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NewsScreen;
