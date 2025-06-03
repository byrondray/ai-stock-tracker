/**
 * Push Notification Service
 * Handles push notifications for price alerts, portfolio updates, and news
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
}

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  type: 'above' | 'below';
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize notification service
   */
  private async initialize(): Promise<void> {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Get permission and token
    await this.registerForPushNotificationsAsync();

    // Set up listeners
    this.setupListeners();
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.log('Project ID not found');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // This listener is fired whenever a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // This listener is fired whenever a user taps on or interacts with a notification
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      });
  }

  /**
   * Handle received notification
   */
  private handleNotificationReceived(
    notification: Notifications.Notification
  ): void {
    const { data } = notification.request.content;

    // Handle different types of notifications
    if (data?.type === 'price_alert') {
      this.handlePriceAlert(data);
    } else if (data?.type === 'portfolio_update') {
      this.handlePortfolioUpdate(data);
    } else if (data?.type === 'news') {
      this.handleNewsUpdate(data);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const { data } = response.notification.request.content;

    // Navigate to appropriate screen based on notification type
    if (data?.type === 'price_alert' && data?.symbol) {
      // Navigate to stock detail screen
      console.log('Navigate to stock detail:', data.symbol);
    } else if (data?.type === 'portfolio_update') {
      // Navigate to portfolio screen
      console.log('Navigate to portfolio');
    } else if (data?.type === 'news') {
      // Navigate to news screen
      console.log('Navigate to news');
    }
  }

  /**
   * Handle price alert notification
   */
  private handlePriceAlert(data: any): void {
    console.log('Price alert triggered:', data);
    // Update local state or trigger callbacks
  }

  /**
   * Handle portfolio update notification
   */
  private handlePortfolioUpdate(data: any): void {
    console.log('Portfolio update:', data);
    // Update portfolio data or trigger refresh
  }

  /**
   * Handle news update notification
   */
  private handleNewsUpdate(data: any): void {
    console.log('News update:', data);
    // Update news data or trigger refresh
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound || 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(
    notificationData: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound || 'default',
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Send price alert notification
   */
  async sendPriceAlert(alert: PriceAlert): Promise<void> {
    const title = `${alert.symbol} Price Alert`;
    const body = `${alert.symbol} has ${
      alert.type === 'above' ? 'risen above' : 'fallen below'
    } $${alert.targetPrice.toFixed(
      2
    )}. Current price: $${alert.currentPrice.toFixed(2)}`;

    await this.sendLocalNotification({
      title,
      body,
      data: {
        type: 'price_alert',
        symbol: alert.symbol,
        targetPrice: alert.targetPrice,
        currentPrice: alert.currentPrice,
        alertType: alert.type,
      },
    });
  }

  /**
   * Send portfolio update notification
   */
  async sendPortfolioUpdate(
    change: number,
    changePercent: number
  ): Promise<void> {
    const isPositive = change >= 0;
    const title = `Portfolio Update`;
    const body = `Your portfolio is ${isPositive ? 'up' : 'down'} ${Math.abs(
      changePercent
    ).toFixed(2)}% (${isPositive ? '+' : ''}$${change.toFixed(2)}) today`;

    await this.sendLocalNotification({
      title,
      body,
      data: {
        type: 'portfolio_update',
        change,
        changePercent,
      },
    });
  }

  /**
   * Send news notification
   */
  async sendNewsNotification(
    title: string,
    summary: string,
    symbol?: string
  ): Promise<void> {
    await this.sendLocalNotification({
      title: symbol ? `${symbol} News` : 'Market News',
      body: summary,
      data: {
        type: 'news',
        symbol,
        title,
      },
    });
  }

  /**
   * Get expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
