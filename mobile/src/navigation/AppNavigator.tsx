/**
 * App Navigator
 *
 * Main navigation component that handles authentication flow and tab navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name='Auth' component={AuthNavigator} />
        ) : (
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
