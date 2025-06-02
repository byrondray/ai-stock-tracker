/**
 * Redux Store Configuration
 *
 * Configures the Redux store with RTK Query and persistence
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import { authSlice } from './slices/authSlice';
import { stockSlice } from './slices/stockSlice';
import { portfolioSlice } from './slices/portfolioSlice';
import { watchlistSlice } from './slices/watchlistSlice';
import { uiSlice } from './slices/uiSlice';
import { apiSlice } from './api/apiSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
};

// Root reducer
const rootReducer = {
  auth: authSlice.reducer,
  stocks: stockSlice.reducer,
  portfolio: portfolioSlice.reducer,
  watchlist: watchlistSlice.reducer,
  ui: uiSlice.reducer,
  api: apiSlice.reducer,
};

// Apply persistence to the combined reducer
const persistedReducer = persistReducer(persistConfig, (state = {}, action) => {
  return Object.keys(rootReducer).reduce((acc, key) => {
    acc[key] = rootReducer[key as keyof typeof rootReducer](state[key], action);
    return acc;
  }, {} as any);
});

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware),
  devTools: __DEV__,
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
