/**
 * App Navigator
 *
 * Main navigation component that handles authentication flow and tab navigation
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';

import { useAppSelector } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { PortfolioDetailScreen } from '../screens/PortfolioDetailScreen';
import { WatchlistDetailScreen } from '../screens/WatchlistDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../hooks/useTheme';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  StockDetail: { symbol: string };
  PortfolioDetail: { portfolioId: number };
  WatchlistDetail: { watchlistId: number };
  Settings: undefined;
  Home: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Authentication Guard Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const { isAuthenticated, user, token } = useAppSelector(
    (state) => state.auth
  );

  const isActuallyAuthenticated = isAuthenticated && user && token;

  if (!isActuallyAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            color: theme.colors.text,
            fontSize: 16,
          }}
        >
          Checking authentication...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

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
  const { theme } = useTheme();
  const navigationRef = React.useRef<any>(null);

  // More robust authentication check
  const isActuallyAuthenticated = isAuthenticated && user && token;

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 AppNavigator Authentication Check:');
    console.log('- isAuthenticated (redux):', isAuthenticated);
    console.log('- user exists:', !!user);
    console.log('- token exists:', !!token);
    console.log('- final auth status:', isActuallyAuthenticated);
  }, [isAuthenticated, user, token, isActuallyAuthenticated]);

  // Handle authentication state changes
  useEffect(() => {
    if (navigationRef.current) {
      if (isActuallyAuthenticated) {
        // User is fully authenticated, navigate to main app
        console.log('✅ User authenticated - navigating to Main');
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          })
        );
      } else {
        // User is not authenticated, navigate to auth flow (Welcome screen)
        console.log('❌ User not authenticated - navigating to WelcomeScreen');
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          })
        );
      }
    }
  }, [isActuallyAuthenticated]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            color: theme.colors.text,
            fontWeight: '600',
          },
        }}
        initialRouteName={isActuallyAuthenticated ? 'Main' : 'Auth'}
      >
        <Stack.Screen name='Auth' component={AuthNavigator} />
        <Stack.Screen name='Main' component={MainTabNavigator} />
        <Stack.Screen
          name='StockDetail'
          component={StockDetailScreen}
          options={{
            headerShown: true,
            title: 'Stock Details',
            headerBackTitle: 'Home',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              color: theme.colors.text,
              fontWeight: '600',
            },
          }}
        />
        <Stack.Screen
          name='PortfolioDetail'
          component={PortfolioDetailScreen}
          options={{
            headerShown: true,
            title: 'Portfolio Details',
            headerBackTitle: 'Home',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              color: theme.colors.text,
              fontWeight: '600',
            },
          }}
        />
        <Stack.Screen
          name='WatchlistDetail'
          component={WatchlistDetailScreen}
          options={{
            headerShown: true,
            title: 'Watchlist Details',
            headerBackTitle: 'Home',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              color: theme.colors.text,
              fontWeight: '600',
            },
          }}
        />
        <Stack.Screen
          name='Settings'
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: 'Settings',
            headerBackTitle: 'Home',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              color: theme.colors.text,
              fontWeight: '600',
            },
          }}
        />
        <Stack.Screen name='Home' component={HomeScreen} />
        <Stack.Screen name='Profile' component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
