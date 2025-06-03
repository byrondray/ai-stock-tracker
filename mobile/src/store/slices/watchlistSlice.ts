/**
 * Watchlist Slice
 *
 * Manages watchlist state and operations
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WatchlistItem {
  id: number;
  stock_symbol: string;
  stock: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  added_at: string;
}

export interface Watchlist {
  id: number;
  name: string;
  description?: string;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  watchlists: Watchlist[];
  currentWatchlist: Watchlist | null;
  loading: boolean;
  error: string | null;
}

const initialState: WatchlistState = {
  items: [],
  watchlists: [],
  currentWatchlist: null,
  loading: false,
  error: null,
};

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<WatchlistItem[]>) => {
      state.items = action.payload;
    },
    setWatchlists: (state, action: PayloadAction<Watchlist[]>) => {
      state.watchlists = action.payload;
    },
    setCurrentWatchlist: (state, action: PayloadAction<Watchlist>) => {
      state.currentWatchlist = action.payload;
    },
    addItem: (state, action: PayloadAction<WatchlistItem>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateItem: (state, action: PayloadAction<WatchlistItem>) => {
      const index = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    addWatchlist: (state, action: PayloadAction<Watchlist>) => {
      state.watchlists.push(action.payload);
    },
    removeWatchlist: (state, action: PayloadAction<number>) => {
      state.watchlists = state.watchlists.filter(
        (watchlist) => watchlist.id !== action.payload
      );
    },
    updateWatchlist: (state, action: PayloadAction<Watchlist>) => {
      const index = state.watchlists.findIndex(
        (watchlist) => watchlist.id === action.payload.id
      );
      if (index !== -1) {
        state.watchlists[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setItems,
  setWatchlists,
  setCurrentWatchlist,
  addItem,
  removeItem,
  updateItem,
  addWatchlist,
  removeWatchlist,
  updateWatchlist,
  setLoading,
  setError,
} = watchlistSlice.actions;

export default watchlistSlice.reducer;
