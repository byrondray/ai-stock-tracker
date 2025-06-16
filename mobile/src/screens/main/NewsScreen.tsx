import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useGetMarketNewsQuery, type NewsItem } from '../../store/api/apiSlice';
import {
  LoadingSpinner,
  SkeletonCard,
  SkeletonText,
} from '../../components/ui';

type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';

const NewsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SentimentFilter>('all');
  const {
    data: news,
    isLoading,
    refetch,
  } = useGetMarketNewsQuery({
    limit: 50,
  });

  // Filter news based on sentiment
  const filteredNews = useMemo(() => {
    if (!news?.news_items) return [];

    if (selectedFilter === 'all') {
      return news.news_items;
    }

    return news.news_items.filter((item) => {
      const score = item.sentiment_score || 0;

      switch (selectedFilter) {
        case 'positive':
          return score > 0.1;
        case 'negative':
          return score < -0.1;
        case 'neutral':
          return score >= -0.1 && score <= 0.1;
        default:
          return true;
      }
    });
  }, [news?.news_items, selectedFilter]);

  // Get sentiment category from score
  const getSentimentCategory = (score?: number): SentimentFilter => {
    if (!score) return 'neutral';
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  };

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

  const getSentimentColor = (score?: number) => {
    if (!score) return theme.colors.textSecondary;
    if (score > 0.1) return theme.colors.success;
    if (score < -0.1) return theme.colors.error;
    return theme.colors.warning;
  };
  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Neutral';
    if (score > 0.3) return 'Very Positive';
    if (score > 0.1) return 'Positive';
    if (score < -0.3) return 'Very Negative';
    if (score < -0.1) return 'Negative';
    return 'Neutral';
  };
  const renderFilterTabs = () => {
    const filters: Array<{
      key: SentimentFilter;
      label: string;
      count: number;
      color?: string;
    }> = [
      {
        key: 'all',
        label: 'All',
        count: news?.news_items?.length || 0,
      },
      {
        key: 'positive',
        label: 'Positive',
        count:
          news?.news_items?.filter(
            (item) => getSentimentCategory(item.sentiment_score) === 'positive'
          ).length || 0,
        color: theme.colors.success,
      },
      {
        key: 'neutral',
        label: 'Neutral',
        count:
          news?.news_items?.filter(
            (item) => getSentimentCategory(item.sentiment_score) === 'neutral'
          ).length || 0,
        color: theme.colors.warning,
      },
      {
        key: 'negative',
        label: 'Negative',
        count:
          news?.news_items?.filter(
            (item) => getSentimentCategory(item.sentiment_score) === 'negative'
          ).length || 0,
        color: theme.colors.error,
      },
    ];

    return (
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                {
                  backgroundColor:
                    selectedFilter === filter.key
                      ? filter.color || theme.colors.primary
                      : theme.colors.surface,
                  borderColor: filter.color || theme.colors.border,
                },
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              {filter.color && (
                <View
                  style={[
                    styles.filterColorDot,
                    {
                      backgroundColor:
                        selectedFilter === filter.key
                          ? theme.colors.surface
                          : filter.color,
                    },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color:
                      selectedFilter === filter.key
                        ? theme.colors.surface
                        : theme.colors.text,
                  },
                ]}
              >
                {filter.label}
              </Text>
              <Text
                style={[
                  styles.filterTabCount,
                  {
                    color:
                      selectedFilter === filter.key
                        ? theme.colors.surface
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderNewsItem = ({
    item,
    index,
  }: {
    item: NewsItem;
    index: number;
  }) => (
    <TouchableOpacity
      style={[
        styles.newsCard,
        { backgroundColor: theme.colors.surface },
        index === 0 && styles.featuredCard,
      ]}
      onPress={() => handleArticlePress(item.url)}
      activeOpacity={0.7}
    >
      {(item as any).image_url && (
        <Image
          source={{ uri: (item as any).image_url }}
          style={[styles.newsImage, index === 0 && styles.featuredImage]}
          resizeMode='cover'
        />
      )}

      <View style={[styles.newsContent, index === 0 && styles.featuredContent]}>
        <View style={styles.newsHeader}>
          <Text style={[styles.newsSource, { color: theme.colors.primary }]}>
            {item.source}
          </Text>
          <Text
            style={[styles.newsTime, { color: theme.colors.textSecondary }]}
          >
            {formatTimeAgo(item.published_at)}
          </Text>
        </View>
        <Text
          style={[
            styles.newsTitle,
            { color: theme.colors.text },
            index === 0 && styles.featuredTitle,
          ]}
          numberOfLines={index === 0 ? 3 : 2}
        >
          {item.title}
        </Text>
        {item.summary && (
          <Text
            style={[
              styles.newsSummary,
              { color: theme.colors.textSecondary },
              index === 0 && styles.featuredSummary,
            ]}
            numberOfLines={index === 0 ? 4 : 2}
          >
            {item.summary}
          </Text>
        )}
        <View style={styles.newsFooter}>
          {(item as any).symbols && (item as any).symbols.length > 0 && (
            <View style={styles.symbolsContainer}>
              {(item as any).symbols
                .slice(0, 3)
                .map((symbol: string, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.symbolTag,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.symbolText,
                        { color: theme.colors.surface },
                      ]}
                    >
                      {symbol}
                    </Text>
                  </View>
                ))}
              {(item as any).symbols.length > 3 && (
                <Text
                  style={[
                    styles.moreSymbols,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  +{(item as any).symbols.length - 3}
                </Text>
              )}
            </View>
          )}

          {item.sentiment_score !== undefined && (
            <View style={styles.sentimentContainer}>
              <View
                style={[
                  styles.sentimentDot,
                  { backgroundColor: getSentimentColor(item.sentiment_score) },
                ]}
              />
              <Text
                style={[
                  styles.sentimentText,
                  { color: getSentimentColor(item.sentiment_score) },
                ]}
              >
                {getSentimentLabel(item.sentiment_score)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLoadingNews = () => (
    <View style={styles.loadingContainer}>
      <LoadingSpinner
        variant='pulse'
        size='large'
        text='Loading market news...'
      />
      <View style={styles.loadingSkeletons}>
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={index} style={styles.skeletonNewsCard} />
        ))}
      </View>
    </View>
  );

  if (isLoading) {
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
            Market News
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: theme.colors.surface }]}
          >
            Stay updated with the latest market insights
          </Text>
        </LinearGradient>

        {renderLoadingNews()}
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
          Market News
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.surface }]}>
          Stay updated with the latest market insights
        </Text>
      </LinearGradient>

      {/* Filter Tabs */}
      {news &&
        news.news_items &&
        news.news_items.length > 0 &&
        renderFilterTabs()}

      {/* News List */}
      {filteredNews && filteredNews.length > 0 ? (
        <FlatList
          data={filteredNews}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          renderItem={renderNewsItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : news && news.news_items && news.news_items.length > 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            {selectedFilter === 'all'
              ? 'No News Found'
              : `No ${
                  selectedFilter.charAt(0).toUpperCase() +
                  selectedFilter.slice(1)
                } News Found`}
          </Text>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            {selectedFilter === 'all'
              ? 'Check back later for the latest market updates'
              : `Try selecting a different filter or check back later for more ${selectedFilter} news`}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No News Available
          </Text>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            Check back later for the latest market updates
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
  loadingContainer: {
    flex: 1,
    padding: 16,
  },
  loadingSkeletons: {
    marginTop: 20,
  },
  skeletonNewsCard: {
    marginBottom: 12,
    height: 120,
  },
  listContent: {
    padding: 16,
  },
  newsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredCard: {
    marginBottom: 8,
  },
  newsImage: {
    width: '100%',
    height: 120,
  },
  featuredImage: {
    height: 200,
  },
  newsContent: {
    padding: 16,
  },
  featuredContent: {
    padding: 20,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsSource: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  newsTime: {
    fontSize: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 22,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  newsSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredSummary: {
    fontSize: 16,
    lineHeight: 22,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  symbolTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  symbolText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreSymbols: {
    fontSize: 12,
    fontWeight: '500',
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  filterTabCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});

export default NewsScreen;
