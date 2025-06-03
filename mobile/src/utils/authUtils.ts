/**
 * Authentication Utilities
 *
 * Helper functions for authentication and storage management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistor } from '../store';
import { logout } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';

/**
 * Perform complete logout - clears Redux state and persisted storage
 */
export const performLogout = async (dispatch: AppDispatch): Promise<void> => {
  try {
    // 1. Dispatch logout action to clear Redux state
    dispatch(logout());

    // 2. Purge the persistor to clear all persisted data
    await persistor.purge();

    // 3. Clear specific AsyncStorage keys as backup
    await AsyncStorage.multiRemove([
      'persist:root',
      'persist:auth',
      'userToken',
      'refreshToken',
    ]);

    console.log('✅ Logout completed - all data cleared');
  } catch (error) {
    console.error('❌ Error during logout:', error);
    // Even if there's an error, dispatch logout to clear Redux state
    dispatch(logout());
  }
};

/**
 * Clear all app data (useful for debugging)
 */
export const clearAllAppData = async (): Promise<void> => {
  try {
    await persistor.purge();
    await AsyncStorage.clear();
    console.log('✅ All app data cleared');
  } catch (error) {
    console.error('❌ Error clearing app data:', error);
  }
};

/**
 * Check what's stored in AsyncStorage (for debugging)
 */
export const debugStorage = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('📦 AsyncStorage keys:', keys);

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`📦 ${key}:`, value);
    }
  } catch (error) {
    console.error('❌ Error reading storage:', error);
  }
};
