/**
 * Watchlist Slice
 *
 * Manages watchlist state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WatchlistItem } from '../api/apiSlice';

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WatchlistState = {
  items: [],
  isLoading: false,
  error: null,
};

export const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    setWatchlistItems: (state, action: PayloadAction<WatchlistItem[]>) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    addWatchlistItem: (state, action: PayloadAction<WatchlistItem>) => {
      state.items.push(action.payload);
    },
    updateWatchlistItem: (state, action: PayloadAction<WatchlistItem>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeWatchlistItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearWatchlist: (state) => {
      state.items = [];
      state.error = null;
    },
  },
});

export const {
  setWatchlistItems,
  addWatchlistItem,
  updateWatchlistItem,
  removeWatchlistItem,
  setLoading,
  setError,
  clearError,
  clearWatchlist,
} = watchlistSlice.actions;

export default watchlistSlice.reducer;
