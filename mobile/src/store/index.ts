/**
 * Redux Store Configuration
 *
 * Configures the Redux store with RTK Query and persistence
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import your slices here
import uiSlice from './slices/uiSlice';
import authSlice from './slices/authSlice';
import portfolioSlice from './slices/portfolioSlice';
import watchlistSlice from './slices/watchlistSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['ui', 'auth', 'portfolio', 'watchlist'], // Add slices you want to persist
};

const rootReducer = combineReducers({
  ui: uiSlice,
  auth: authSlice,
  portfolio: portfolioSlice,
  watchlist: watchlistSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';
