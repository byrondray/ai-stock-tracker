/**
 * Notification Provider
 *
 * Provides notification handling and push notification setup
 */

import React, { createContext, useContext, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { addNotification } from '../store/slices/uiSlice';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationContextType {
  requestPermissions: () => Promise<boolean>;
  scheduleNotification: (
    title: string,
    body: string,
    trigger?: Date
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.ui.settings);

  useEffect(() => {
    // Request permissions on mount
    requestPermissions();

    // Listen for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (settings.newsNotifications) {
          dispatch(
            addNotification({
              type: 'info',
              title: notification.request.content.title || 'Notification',
              message: notification.request.content.body || '',
            })
          );
        }
      }
    );

    // Listen for notification responses (when user taps notification)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Handle notification tap
        console.log('Notification tapped:', response);
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [dispatch, settings.newsNotifications]);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are required for price alerts and news updates.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const scheduleNotification = async (
    title: string,
    body: string,
    trigger?: Date
  ): Promise<void> => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: trigger ? { date: trigger } : null,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const value: NotificationContextType = {
    requestPermissions,
    scheduleNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
