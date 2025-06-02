/**
 * Main Tab Navigator
 *
 * Bottom tab navigation for the main app screens
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import {
  DashboardScreen,
  StockSearchScreen,
  PortfolioScreen,
  WatchlistScreen,
  NewsScreen,
} from '../screens/main';
import { useTheme } from '../hooks/useTheme';

export type MainTabParamList = {
  Dashboard: undefined;
  Search: undefined;
  Portfolio: undefined;
  Watchlist: undefined;
  News: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Portfolio':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Watchlist':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'News':
              iconName = focused ? 'newspaper' : 'newspaper-outline';
              break;            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name='Dashboard'
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name='Search'
        component={StockSearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name='Portfolio'
        component={PortfolioScreen}
        options={{ title: 'Portfolio' }}
      />
      <Tab.Screen
        name='Watchlist'
        component={WatchlistScreen}
        options={{ title: 'Watchlist' }}
      />
      <Tab.Screen
        name='News'
        component={NewsScreen}
        options={{ title: 'News' }}
      />
    </Tab.Navigator>
  );
}
