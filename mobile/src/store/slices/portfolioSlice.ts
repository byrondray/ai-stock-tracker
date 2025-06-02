/**
 * Portfolio Slice
 *
 * Manages portfolio state and calculations
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Portfolio } from '../api/apiSlice';

interface PortfolioState {
  portfolios: Portfolio[];
  items: any[]; // Portfolio items for backward compatibility  
  selectedPortfolioId: number | null;
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  isLoading: boolean;
  error: string | null;
  performanceData: PerformanceData[];
}

interface PerformanceData {
  date: string;
  value: number;
  return: number;
  returnPercent: number;
}

const initialState: PortfolioState = {
  portfolios: [],
  items: [], // Backward compatibility
  selectedPortfolioId: null,
  totalValue: 0,
  totalReturn: 0,
  totalReturnPercent: 0,
  isLoading: false,
  error: null,
  performanceData: [],
};

export const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setPortfolios: (state, action: PayloadAction<Portfolio[]>) => {
      state.portfolios = action.payload;
      state.isLoading = false;
      state.error = null;

      // Calculate totals
      const totals = action.payload.reduce(
        (acc, portfolio) => ({
          value: acc.value + portfolio.total_value,
          return: acc.return + portfolio.total_return,
        }),
        { value: 0, return: 0 }
      );

      state.totalValue = totals.value;
      state.totalReturn = totals.return;
      state.totalReturnPercent =
        totals.value > 0
          ? (totals.return / (totals.value - totals.return)) * 100
          : 0;
    },
    setSelectedPortfolio: (state, action: PayloadAction<number | null>) => {
      state.selectedPortfolioId = action.payload;
    },
    addPortfolio: (state, action: PayloadAction<Portfolio>) => {
      state.portfolios.push(action.payload);
      if (state.selectedPortfolioId === null) {
        state.selectedPortfolioId = action.payload.id;
      }
    },
    updatePortfolio: (state, action: PayloadAction<Portfolio>) => {
      const index = state.portfolios.findIndex(
        (p) => p.id === action.payload.id
      );
      if (index !== -1) {
        state.portfolios[index] = action.payload;
      }
    },
    removePortfolio: (state, action: PayloadAction<number>) => {
      state.portfolios = state.portfolios.filter(
        (p) => p.id !== action.payload
      );
      if (state.selectedPortfolioId === action.payload) {
        state.selectedPortfolioId =
          state.portfolios.length > 0 ? state.portfolios[0].id : null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setPerformanceData: (state, action: PayloadAction<PerformanceData[]>) => {
      state.performanceData = action.payload;
    },    clearError: (state) => {
      state.error = null;
    },
    addToPortfolio: (state, action: PayloadAction<Portfolio>) => {
      state.portfolios.push(action.payload);
      if (state.selectedPortfolioId === null) {
        state.selectedPortfolioId = action.payload.id;
      }
    },
    updatePortfolioItem: (state, action: PayloadAction<Portfolio>) => {
      const index = state.portfolios.findIndex(
        (p) => p.id === action.payload.id
      );
      if (index !== -1) {
        state.portfolios[index] = action.payload;
      }
    },
    removeFromPortfolio: (state, action: PayloadAction<number>) => {
      state.portfolios = state.portfolios.filter(
        (p) => p.id !== action.payload
      );
      if (state.selectedPortfolioId === action.payload) {
        state.selectedPortfolioId =
          state.portfolios.length > 0 ? state.portfolios[0].id : null;
      }
    },
  },
});

export const {
  setPortfolios,
  setSelectedPortfolio,
  addPortfolio,
  updatePortfolio,
  removePortfolio,
  setLoading,
  setError,
  setPerformanceData,
  clearError,
  addToPortfolio,
  updatePortfolioItem,
  removeFromPortfolio,
} = portfolioSlice.actions;

export default portfolioSlice.reducer;
