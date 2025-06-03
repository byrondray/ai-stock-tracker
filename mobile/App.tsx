/**
 * Main App Component
 *
 * Root component that sets up navigation, Redux store, and global providers
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';

import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/providers/ThemeProvider';
import { NotificationProvider } from './src/providers/NotificationProvider';
import { LoadingScreen } from './src/components/common/LoadingScreen';
import { useAppDispatch } from './src/store';
import { setOnlineStatus } from './src/store/slices/uiSlice';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      dispatch(setOnlineStatus(state.isConnected ?? false));
    });

    // Hide splash screen after setup
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AppNavigator />
          <StatusBar style='auto' />
        </NotificationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}
