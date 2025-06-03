import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Portfolio, PortfolioItem } from '../api/apiSlice';

interface PortfolioState {
  portfolio: Portfolio | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  portfolio: null,
  isLoading: false,
  error: null,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setPortfolio: (state, action: PayloadAction<Portfolio>) => {
      state.portfolio = action.payload;
      state.error = null;
    },
    addToPortfolio: (state, action: PayloadAction<PortfolioItem>) => {
      if (state.portfolio) {
        state.portfolio.items.push(action.payload);
      }
    },
    updatePortfolioItem: (state, action: PayloadAction<PortfolioItem>) => {
      if (state.portfolio) {
        const index = state.portfolio.items.findIndex(
          item => item.id === action.payload.id
        );
        if (index !== -1) {
          state.portfolio.items[index] = action.payload;
        }
      }
    },
    removeFromPortfolio: (state, action: PayloadAction<number>) => {
      if (state.portfolio) {
        state.portfolio.items = state.portfolio.items.filter(
          item => item.id !== action.payload
        );
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearPortfolio: (state) => {
      state.portfolio = null;
      state.error = null;
    },
  },
});

export const {
  setPortfolio,
  addToPortfolio,
  updatePortfolioItem,
  removeFromPortfolio,
  setLoading,
  setError,
  clearPortfolio,
} = portfolioSlice.actions;

export default portfolioSlice.reducer;
export { portfolioSlice };