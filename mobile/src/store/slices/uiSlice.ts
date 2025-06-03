/**
 * UI Slice
 *
 * Manages UI state and preferences
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  activeTab: string;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  refreshing: boolean;
  notifications: Notification[];
  settings: Settings;
  modal: ModalState;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface Settings {
  currency: string;
  priceAlerts: boolean;
  newsNotifications: boolean;
  darkMode: boolean;
  biometricAuth: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
}

interface ModalState {
  isVisible: boolean;
  type: string | null;
  data: any;
}

const initialState: UIState = {
  theme: 'system',
  activeTab: 'dashboard',
  isOnline: true,
  isLoading: false,
  error: null,
  refreshing: false,
  notifications: [],
  settings: {
    currency: 'USD',
    priceAlerts: true,
    newsNotifications: true,
    darkMode: false,
    biometricAuth: false,
    autoRefresh: true,
    refreshInterval: 60,
  },
  modal: {
    isVisible: false,
    type: null,
    data: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      state.settings.darkMode = state.theme === 'dark';
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>
    ) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(notification);

      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach((notification) => {
        notification.read = true;
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    updateSettings: (state, action: PayloadAction<Partial<Settings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    showModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.modal = {
        isVisible: true,
        type: action.payload.type,
        data: action.payload.data || null,
      };
    },
    hideModal: (state) => {
      state.modal = {
        isVisible: false,
        type: null,
        data: null,
      };
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setActiveTab,
  setOnlineStatus,
  setLoading,
  setRefreshing,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearNotifications,
  updateSettings,
  showModal,
  hideModal,
  setError,
  clearError,
} = uiSlice.actions;

export default uiSlice.reducer;
