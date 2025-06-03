import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../store';
import { useTheme } from '../hooks/useTheme';
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useDeleteNotificationMutation,
  Notification,
} from '../store/api/apiSlice';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useGetNotificationsQuery();

  const [markAsReadMutation] = useMarkNotificationAsReadMutation();
  const [deleteNotificationMutation] = useDeleteNotificationMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation(notificationId).unwrap();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await deleteNotificationMutation(notificationId).unwrap();
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification. Please try again.');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    try {
      await Promise.all(
        unreadNotifications.map((n) => markAsReadMutation(n.id).unwrap())
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert(
        'Error',
        'Failed to mark all notifications as read. Please try again.'
      );
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(
                notifications.map((n) =>
                  deleteNotificationMutation(n.id).unwrap()
                )
              );
            } catch (error) {
              console.error('Error clearing all notifications:', error);
              Alert.alert(
                'Error',
                'Failed to clear all notifications. Please try again.'
              );
            }
          },
        },
      ]
    );
  };
  const getNotificationIcon = (
    type: 'info' | 'warning' | 'error' | 'success'
  ) => {
    switch (type) {
      case 'info':
        return '📱';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return '📱';
    }
  };

  const getNotificationColor = (
    type: 'info' | 'warning' | 'error' | 'success'
  ) => {
    switch (type) {
      case 'info':
        return theme.colors.primary;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') {
      return !notification.isRead;
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading && notifications.length === 0) {
    return (
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading notifications...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.container}
    >
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Notifications
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {unreadCount} unread
            </Text>
          </View>
          <View style={styles.filterContainer}>
            <Text
              style={[
                styles.filterLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Unread Only
            </Text>
            <Switch
              value={filter === 'unread'}
              onValueChange={(value) => setFilter(value ? 'unread' : 'all')}
              trackColor={{
                false: theme.colors.surface,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.background}
            />
          </View>
        </View>

        {notifications.length > 0 && (
          <View style={styles.actionButtons}>
            <Button
              title='Mark All Read'
              onPress={handleMarkAllAsRead}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              disabled={unreadCount === 0}
            />
            <Button
              title='Clear All'
              onPress={handleClearAll}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.error },
              ]}
            />
          </View>
        )}
      </Card>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text
              style={[styles.emptyIcon, { color: theme.colors.textSecondary }]}
            >
              📭
            </Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {filter === 'unread'
                ? 'No Unread Notifications'
                : 'No Notifications'}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {filter === 'unread'
                ? 'All caught up! You have no unread notifications.'
                : "You have no notifications yet. We'll notify you about important updates."}
            </Text>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              style={[
                styles.notificationCard,
                ...(!notification.isRead
                  ? [
                      {
                        borderLeftWidth: 4,
                        borderLeftColor: theme.colors.primary,
                      },
                    ]
                  : []),
              ]}
            >
              <View style={styles.notificationHeader}>
                <View style={styles.notificationIcon}>
                  <Text style={styles.iconText}>
                    {getNotificationIcon(notification.type)}
                  </Text>
                </View>
                <View style={styles.notificationContent}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      { color: theme.colors.text },
                      !notification.isRead && { fontWeight: 'bold' },
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={[
                      styles.notificationMessage,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {notification.message}
                  </Text>
                  <Text
                    style={[
                      styles.notificationTime,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                </View>
                {!notification.isRead && (
                  <View
                    style={[
                      styles.unreadIndicator,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </View>

              {notification.data && (
                <View style={styles.notificationData}>
                  {notification.data.symbol && (
                    <Text
                      style={[styles.dataText, { color: theme.colors.text }]}
                    >
                      Symbol: {notification.data.symbol}
                    </Text>
                  )}
                  {notification.data.price && (
                    <Text
                      style={[styles.dataText, { color: theme.colors.text }]}
                    >
                      Price: ${notification.data.price.toFixed(2)}
                    </Text>
                  )}
                  {notification.data.targetPrice && (
                    <Text
                      style={[styles.dataText, { color: theme.colors.text }]}
                    >
                      Target: ${notification.data.targetPrice.toFixed(2)}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.notificationActions}>
                {!notification.isRead && (
                  <Button
                    title='Mark as Read'
                    onPress={() => handleMarkAsRead(notification.id)}
                    style={[
                      styles.smallButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    textStyle={styles.smallButtonText}
                  />
                )}
                <Button
                  title='Delete'
                  onPress={() => handleDeleteNotification(notification.id)}
                  style={[
                    styles.smallButton,
                    { backgroundColor: theme.colors.error },
                  ]}
                  textStyle={styles.smallButtonText}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationCard: {
    marginBottom: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 8,
  },
  notificationData: {
    marginTop: 12,
    paddingLeft: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dataText: {
    fontSize: 12,
    marginRight: 16,
    marginBottom: 4,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingLeft: 52,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  smallButtonText: {
    fontSize: 12,
  },
});
