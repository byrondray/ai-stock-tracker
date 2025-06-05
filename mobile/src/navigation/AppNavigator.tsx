/**
 * App Navigator
 *
 * Main navigation component that handles authentication flow and tab navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import { useAppSelector } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { PortfolioDetailScreen } from '../screens/PortfolioDetailScreen';
import { WatchlistDetailScreen } from '../screens/WatchlistDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  StockDetail: { symbol: string };
  PortfolioDetail: { portfolioId: number };
  WatchlistDetail: { watchlistId: number };
  Settings: undefined;
  Notifications: undefined;
  Home: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder screen components
function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>AI Stock Analyzer Home</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

export function AppNavigator() {
  const { isAuthenticated, user, token } = useAppSelector(
    (state) => state.auth
  );

  // Enhanced authentication check - need both isAuthenticated flag AND valid user/token
  const isFullyAuthenticated = isAuthenticated && user && token;

  console.log('🔐 AppNavigator Authentication Check:');
  console.log('- isAuthenticated (redux):', isAuthenticated);
  console.log('- user exists:', !!user);
  console.log('- token exists:', !!token);
  console.log('- final auth status:', isFullyAuthenticated ? token : null);

  if (!isFullyAuthenticated) {
    console.log('❌ User not authenticated - navigating to WelcomeScreen');
  } else {
    console.log('✅ User authenticated - navigating to Main');
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isFullyAuthenticated ? 'Main' : 'Auth'}
      >
        {!isFullyAuthenticated ? (
          // Auth Stack - when user is not authenticated
          <Stack.Screen name='Auth' component={AuthNavigator} />
        ) : (
          // Main App Stack - when user is authenticated
          <>
            <Stack.Screen name='Main' component={MainTabNavigator} />
            <Stack.Screen
              name='StockDetail'
              component={StockDetailScreen}
              options={{ headerShown: true, title: 'Stock Details' }}
            />
            <Stack.Screen
              name='PortfolioDetail'
              component={PortfolioDetailScreen}
              options={{ headerShown: true, title: 'Portfolio Details' }}
            />
            <Stack.Screen
              name='WatchlistDetail'
              component={WatchlistDetailScreen}
              options={{ headerShown: true, title: 'Watchlist Details' }}
            />
            <Stack.Screen
              name='Settings'
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings' }}
            />
            <Stack.Screen
              name='Notifications'
              component={NotificationsScreen}
              options={{ headerShown: true, title: 'Notifications' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
