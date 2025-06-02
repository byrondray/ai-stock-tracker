/**
 * Stock Slice
 *
 * Manages stock-related state including search results and cached data
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Stock } from '../api/apiSlice';

interface StockState {
  searchResults: Stock[];
  searchQuery: string;
  recentSearches: string[];
  favoriteStocks: string[];
  isSearching: boolean;
  selectedStock: Stock | null;
  priceAlerts: PriceAlert[];
}

interface PriceAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below';
  price: number;
  isActive: boolean;
  createdAt: string;
}

const initialState: StockState = {
  searchResults: [],
  searchQuery: '',
  recentSearches: [],
  favoriteStocks: [],
  isSearching: false,
  selectedStock: null,
  priceAlerts: [],
};

export const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<Stock[]>) => {
      state.searchResults = action.payload;
      state.isSearching = false;
    },
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.isSearching = action.payload;
    },
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const symbol = action.payload.toUpperCase();
      state.recentSearches = [
        symbol,
        ...state.recentSearches.filter((s) => s !== symbol),
      ].slice(0, 10); // Keep only last 10 searches
    },
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },
    setSelectedStock: (state, action: PayloadAction<Stock | null>) => {
      state.selectedStock = action.payload;
    },
    addFavoriteStock: (state, action: PayloadAction<string>) => {
      const symbol = action.payload.toUpperCase();
      if (!state.favoriteStocks.includes(symbol)) {
        state.favoriteStocks.push(symbol);
      }
    },
    removeFavoriteStock: (state, action: PayloadAction<string>) => {
      const symbol = action.payload.toUpperCase();
      state.favoriteStocks = state.favoriteStocks.filter((s) => s !== symbol);
    },
    addPriceAlert: (
      state,
      action: PayloadAction<Omit<PriceAlert, 'id' | 'createdAt'>>
    ) => {
      const alert: PriceAlert = {
        ...action.payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      state.priceAlerts.push(alert);
    },
    removePriceAlert: (state, action: PayloadAction<string>) => {
      state.priceAlerts = state.priceAlerts.filter(
        (alert) => alert.id !== action.payload
      );
    },
    togglePriceAlert: (state, action: PayloadAction<string>) => {
      const alert = state.priceAlerts.find(
        (alert) => alert.id === action.payload
      );
      if (alert) {
        alert.isActive = !alert.isActive;
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
      state.isSearching = false;
    },
  },
});

export const {
  setSearchQuery,
  setSearchResults,
  setSearching,
  addRecentSearch,
  clearRecentSearches,
  setSelectedStock,
  addFavoriteStock,
  removeFavoriteStock,
  addPriceAlert,
  removePriceAlert,
  togglePriceAlert,
  clearSearchResults,
} = stockSlice.actions;

export default stockSlice.reducer;
