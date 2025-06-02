/**
 * Watchlist Slice
 *
 * Manages watchlist state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Watchlist } from '../api/apiSlice';

interface WatchlistState {
  watchlists: Watchlist[];
  items: any[]; // Watchlist items for backward compatibility
  selectedWatchlistId: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: WatchlistState = {
  watchlists: [],
  items: [], // Backward compatibility
  selectedWatchlistId: null,
  isLoading: false,
  error: null,
};

export const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    setWatchlists: (state, action: PayloadAction<Watchlist[]>) => {
      state.watchlists = action.payload;
      state.isLoading = false;
      state.error = null;

      // Set default selected watchlist if none selected
      if (state.selectedWatchlistId === null && action.payload.length > 0) {
        state.selectedWatchlistId = action.payload[0].id;
      }
    },
    setSelectedWatchlist: (state, action: PayloadAction<number | null>) => {
      state.selectedWatchlistId = action.payload;
    },
    addWatchlist: (state, action: PayloadAction<Watchlist>) => {
      state.watchlists.push(action.payload);
      if (state.selectedWatchlistId === null) {
        state.selectedWatchlistId = action.payload.id;
      }
    },
    updateWatchlist: (state, action: PayloadAction<Watchlist>) => {
      const index = state.watchlists.findIndex(
        (w) => w.id === action.payload.id
      );
      if (index !== -1) {
        state.watchlists[index] = action.payload;
      }
    },
    removeWatchlist: (state, action: PayloadAction<number>) => {
      state.watchlists = state.watchlists.filter(
        (w) => w.id !== action.payload
      );
      if (state.selectedWatchlistId === action.payload) {
        state.selectedWatchlistId =
          state.watchlists.length > 0 ? state.watchlists[0].id : null;
      }
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
    // Individual stock actions for backward compatibility
    addToWatchlist: (state, action: PayloadAction<any>) => {
      state.items.push(action.payload);
    },
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (item) => item.symbol !== action.payload
      );
    },
  },
});

export const {
  setWatchlists,
  setSelectedWatchlist,
  addWatchlist,
  updateWatchlist,
  removeWatchlist,
  setLoading,
  setError,
  clearError,
  addToWatchlist,
  removeFromWatchlist,
} = watchlistSlice.actions;

export default watchlistSlice.reducer;
