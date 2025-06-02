/**
 * API Slice with RTK Query
 *
 * Defines all API endpoints and handles data fetching/caching
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// API types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Stock {
  symbol: string;
  name: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  market_cap?: number;
  volume?: number;
  pe_ratio?: number;
  sector?: string;
  industry?: string;
}

export interface StockAnalysis {
  symbol: string;
  fundamental_score: number;
  technical_score: number;
  sentiment_score: number;
  overall_score: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  analysis_date: string;
}

export interface Prediction {
  id: number;
  symbol: string;
  current_price: number;
  predicted_price: number;
  price_change: number;
  price_change_percent: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_score: number;
  days_ahead: number;
  prediction_date: string;
  target_date: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance_score: number;
  tags: string[];
}

export interface Portfolio {
  id: number;
  name: string;
  total_value: number;
  total_cost: number;
  total_return: number;
  total_return_percent: number;
  holdings: PortfolioHolding[];
  created_at: string;
  updated_at: string;
}

export interface PortfolioHolding {
  id: number;
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  total_value: number;
  unrealized_return: number;
  unrealized_return_percent: number;
}

export interface Watchlist {
  id: number;
  name: string;
  stocks: WatchlistStock[];
  created_at: string;
  updated_at: string;
}

export interface WatchlistStock {
  symbol: string;
  name: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  added_at: string;
}

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:8000/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'User',
    'Stock',
    'Portfolio',
    'Watchlist',
    'Prediction',
    'News',
    'Analysis',
  ],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    refreshToken: builder.mutation<AuthResponse, { refresh_token: string }>({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: data,
      }),
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Stock endpoints
    searchStocks: builder.query<Stock[], string>({
      query: (query) => `/stocks/search?q=${encodeURIComponent(query)}`,
      providesTags: ['Stock'],
    }),

    getStock: builder.query<Stock, string>({
      query: (symbol) => `/stocks/${symbol}`,
      providesTags: (result, error, symbol) => [{ type: 'Stock', id: symbol }],
    }),

    getStockPrice: builder.query<
      { symbol: string; price: number; change: number; change_percent: number },
      string
    >({
      query: (symbol) => `/stocks/${symbol}/price`,
      providesTags: (result, error, symbol) => [{ type: 'Stock', id: symbol }],
    }),

    getStockHistory: builder.query<
      Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>,
      { symbol: string; period?: string }
    >({
      query: ({ symbol, period = '1y' }) =>
        `/stocks/${symbol}/history?period=${period}`,
      providesTags: (result, error, { symbol }) => [
        { type: 'Stock', id: symbol },
      ],
    }),

    getStockAnalysis: builder.query<StockAnalysis, string>({
      query: (symbol) => `/stocks/${symbol}/analysis`,
      providesTags: (result, error, symbol) => [
        { type: 'Analysis', id: symbol },
      ],
    }),

    // Portfolio endpoints
    getPortfolios: builder.query<Portfolio[], void>({
      query: () => '/portfolio',
      providesTags: ['Portfolio'],
    }),

    getPortfolio: builder.query<Portfolio, number>({
      query: (id) => `/portfolio/${id}`,
      providesTags: (result, error, id) => [{ type: 'Portfolio', id }],
    }),

    createPortfolio: builder.mutation<Portfolio, { name: string }>({
      query: (data) => ({
        url: '/portfolio',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Portfolio'],
    }),

    updatePortfolio: builder.mutation<Portfolio, { id: number; name: string }>({
      query: ({ id, ...data }) => ({
        url: `/portfolio/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Portfolio', id }],
    }),

    deletePortfolio: builder.mutation<void, number>({
      query: (id) => ({
        url: `/portfolio/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Portfolio'],
    }),

    addPortfolioHolding: builder.mutation<
      Portfolio,
      {
        portfolio_id: number;
        symbol: string;
        quantity: number;
        cost_per_share: number;
      }
    >({
      query: ({ portfolio_id, ...data }) => ({
        url: `/portfolio/${portfolio_id}/holdings`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { portfolio_id }) => [
        { type: 'Portfolio', id: portfolio_id },
      ],
    }),

    updatePortfolioHolding: builder.mutation<
      Portfolio,
      {
        portfolio_id: number;
        holding_id: number;
        quantity: number;
        cost_per_share: number;
      }
    >({
      query: ({ portfolio_id, holding_id, ...data }) => ({
        url: `/portfolio/${portfolio_id}/holdings/${holding_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { portfolio_id }) => [
        { type: 'Portfolio', id: portfolio_id },
      ],
    }),

    deletePortfolioHolding: builder.mutation<
      Portfolio,
      { portfolio_id: number; holding_id: number }
    >({
      query: ({ portfolio_id, holding_id }) => ({
        url: `/portfolio/${portfolio_id}/holdings/${holding_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { portfolio_id }) => [
        { type: 'Portfolio', id: portfolio_id },
      ],
    }),

    // Watchlist endpoints
    getWatchlists: builder.query<Watchlist[], void>({
      query: () => '/watchlist',
      providesTags: ['Watchlist'],
    }),

    getWatchlist: builder.query<Watchlist, number>({
      query: (id) => `/watchlist/${id}`,
      providesTags: (result, error, id) => [{ type: 'Watchlist', id }],
    }),

    createWatchlist: builder.mutation<Watchlist, { name: string }>({
      query: (data) => ({
        url: '/watchlist',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Watchlist'],
    }),

    updateWatchlist: builder.mutation<Watchlist, { id: number; name: string }>({
      query: ({ id, ...data }) => ({
        url: `/watchlist/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Watchlist', id }],
    }),

    deleteWatchlist: builder.mutation<void, number>({
      query: (id) => ({
        url: `/watchlist/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Watchlist'],
    }),

    addStockToWatchlist: builder.mutation<
      Watchlist,
      { watchlist_id: number; symbol: string }
    >({
      query: ({ watchlist_id, ...data }) => ({
        url: `/watchlist/${watchlist_id}/stocks`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { watchlist_id }) => [
        { type: 'Watchlist', id: watchlist_id },
      ],
    }),

    removeStockFromWatchlist: builder.mutation<
      Watchlist,
      { watchlist_id: number; symbol: string }
    >({
      query: ({ watchlist_id, symbol }) => ({
        url: `/watchlist/${watchlist_id}/stocks/${symbol}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { watchlist_id }) => [
        { type: 'Watchlist', id: watchlist_id },
      ],
    }),

    // Prediction endpoints
    getPrediction: builder.query<
      Prediction,
      { symbol: string; days_ahead?: number }
    >({
      query: ({ symbol, days_ahead = 30 }) =>
        `/predictions/${symbol}?days_ahead=${days_ahead}`,
      providesTags: (result, error, { symbol }) => [
        { type: 'Prediction', id: symbol },
      ],
    }),

    // News endpoints
    getStockNews: builder.query<NewsItem[], { symbol: string; limit?: number }>(
      {
        query: ({ symbol, limit = 20 }) =>
          `/news/stocks/${symbol}?limit=${limit}`,
        providesTags: (result, error, { symbol }) => [
          { type: 'News', id: symbol },
        ],
      }
    ),

    getMarketNews: builder.query<
      NewsItem[],
      { category?: string; limit?: number }
    >({
      query: ({ category = 'general', limit = 50 }) =>
        `/news/market?category=${category}&limit=${limit}`,
      providesTags: [{ type: 'News', id: 'market' }],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Auth
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,

  // Stocks
  useSearchStocksQuery,
  useLazySearchStocksQuery,
  useGetStockQuery,
  useGetStockPriceQuery,
  useGetStockHistoryQuery,
  useGetStockAnalysisQuery,

  // Portfolio
  useGetPortfoliosQuery,
  useGetPortfolioQuery,
  useCreatePortfolioMutation,
  useUpdatePortfolioMutation,
  useDeletePortfolioMutation,
  useAddPortfolioHoldingMutation,
  useUpdatePortfolioHoldingMutation,
  useDeletePortfolioHoldingMutation,

  // Watchlist
  useGetWatchlistsQuery,
  useGetWatchlistQuery,
  useCreateWatchlistMutation,
  useUpdateWatchlistMutation,
  useDeleteWatchlistMutation,
  useAddStockToWatchlistMutation,
  useRemoveStockFromWatchlistMutation,

  // Predictions
  useGetPredictionQuery,

  // News
  useGetStockNewsQuery,
  useGetMarketNewsQuery,
} = apiSlice;
