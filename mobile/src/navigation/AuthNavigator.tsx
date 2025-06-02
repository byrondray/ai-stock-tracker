/**
 * Authentication Navigator
 *
 * Navigation for login/register flow
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen, RegisterScreen, WelcomeScreen } from '../screens/auth';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName='Welcome'
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {' '}
      <Stack.Screen name='Welcome' component={WelcomeScreen} />
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='Register' component={RegisterScreen} />
    </Stack.Navigator>
  );
}
