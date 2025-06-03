/**
 * Portfolio Slice
 *
 * Manages portfolio state and operations
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PortfolioItem {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  average_cost: number;
  purchase_date: string;
  current_price: number;
  value: number;
  gain: number;
  gainPercent: number;
}

export interface Portfolio {
  id: number;
  name: string;
  items: PortfolioItem[];
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
}

interface PortfolioState {
  portfolio: Portfolio | null;
  portfolios: Portfolio[];
  loading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  portfolio: null,
  portfolios: [],
  loading: false,
  error: null,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setPortfolio: (state, action: PayloadAction<Portfolio>) => {
      state.portfolio = action.payload;
    },
    setPortfolios: (state, action: PayloadAction<Portfolio[]>) => {
      state.portfolios = action.payload;
    },
    addPortfolioItem: (state, action: PayloadAction<PortfolioItem>) => {
      if (state.portfolio) {
        state.portfolio.items.push(action.payload);
      }
    },
    removePortfolioItem: (state, action: PayloadAction<number>) => {
      if (state.portfolio) {
        state.portfolio.items = state.portfolio.items.filter(
          (item) => item.id !== action.payload
        );
      }
    },
    updatePortfolioItem: (state, action: PayloadAction<PortfolioItem>) => {
      if (state.portfolio) {
        const index = state.portfolio.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          state.portfolio.items[index] = action.payload;
        }
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
  setPortfolio,
  setPortfolios,
  addPortfolioItem,
  removePortfolioItem,
  updatePortfolioItem,
  setLoading,
  setError,
} = portfolioSlice.actions;

export default portfolioSlice.reducer;
