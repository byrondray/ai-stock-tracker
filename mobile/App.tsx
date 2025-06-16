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
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/providers/ThemeProvider';
import { useAppDispatch } from './src/store';
import { setOnlineStatus } from './src/store/slices/uiSlice';
import { ToastContainer } from './src/components/ui';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Simple loading component that doesn't use theme context
function SimpleLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size='large' color='#007AFF' />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

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
        <AppNavigator />
        <ToastContainer />
        <StatusBar style='auto' />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<SimpleLoadingScreen />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
  },
});
