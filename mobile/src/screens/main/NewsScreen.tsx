import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { useGetMarketNewsQuery, type NewsItem } from '../../store/api/apiSlice';

const NewsScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: news,
    isLoading,
    refetch,
  } = useGetMarketNewsQuery({
    limit: 50,
  });

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
          Loading market news...
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
          Market News
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.surface }]}>
          Stay updated with the latest market insights
        </Text>
      </LinearGradient>
      {/* News List */}
      {news && news.news_items && news.news_items.length > 0 ? (
        <FlatList
          data={news.news_items}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          renderItem={renderNewsItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
});

export default NewsScreen;
