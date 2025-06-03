import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Base URL - adjust according to your backend
const baseUrl = 'http://localhost:8000/api/v1';

// Types matching backend schemas exactly
export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Stock {
  symbol: string;
  name: string;
  current_price?: number;
  sector?: string;
  industry?: string;
  market_cap?: number;
  currency: string;
  exchange?: string;
  country?: string;
  website?: string;
  description?: string;
  employees?: number;
  founded_year?: number;
  last_updated: string;
}

export interface PortfolioItem {
  id: number;
  stock_symbol: string;
  quantity: number;
  average_cost: number;
  purchase_date: string;
  notes?: string;
  current_price?: number;
  current_value?: number;
  total_return?: number;
  return_percentage?: number;
  created_at: string;
  updated_at?: string;
  stock: Stock;
}

export interface Portfolio {
  items: PortfolioItem[];
  total_value: number;
  total_cost: number;
  total_return: number;
  return_percentage: number;
  risk_score?: number;
}

export interface WatchlistItem {
  id: number;
  stock_symbol: string;
  notes?: string;
  alert_price_target?: number;
  alert_percentage_change?: number;
  added_at: string;
  stock: Stock;
  current_price?: number;
  price_change?: number;
  price_change_percent?: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type: string;
  currency?: string;
}

export interface SearchResponse {
  query: string;
  results: StockSearchResult[];
  total_count: number;
}

export interface NewsItem {
  title: string;
  summary?: string;
  url: string;
  source: string;
  published_at: string;
  sentiment_score?: number;
  relevance_score?: number;
}

export interface NewsResponse {
  symbol: string;
  news_items: NewsItem[];
  overall_sentiment?: number;
  total_count: number;
}

export interface PredictionPoint {
  date: string;
  predicted_price: number;
  confidence: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface StockPrediction {
  symbol: string;
  predictions: PredictionPoint[];
  model_version: string;
  model_type: string;
  created_at: string;
}

export interface StockAnalysisResponse {
  symbol: string;
  fundamental_score: number;
  technical_score: number;
  sentiment_score: number;
  overall_rating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  risk_score: number;
  analysis_date: string;
  analyst_consensus?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
  risk_profile?: 'conservative' | 'moderate' | 'aggressive';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PortfolioItemCreate {
  stock_symbol: string;
  quantity: number;
  average_cost: number;
  purchase_date: string;
  notes?: string;
}

export interface PortfolioItemUpdate {
  quantity?: number;
  average_cost?: number;
  notes?: string;
}

export interface WatchlistItemCreate {
  stock_symbol: string;
  notes?: string;
  alert_price_target?: number;
  alert_percentage_change?: number;
}

export interface WatchlistItemUpdate {
  notes?: string;
  alert_price_target?: number;
  alert_percentage_change?: number;
}

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume?: number;
  last_updated: string;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
  tagTypes: [
    'User',
    'Stock',
    'Portfolio',
    'Watchlist',
    'News',
    'Prediction',
    'Analysis',
  ],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: new URLSearchParams({
          username: credentials.username,
          password: credentials.password,
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      }),
    }),
    register: builder.mutation<User, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Stock endpoints
    searchStocks: builder.query<SearchResponse, string>({
      query: (query) => `/stocks/search?q=\${encodeURIComponent(query)}`,
    }),
    getStock: builder.query<Stock, string>({
      query: (symbol) => `/stocks/\${symbol}`,
      providesTags: (result, error, symbol) => [{ type: 'Stock', id: symbol }],
    }),
    getStockPrice: builder.query<StockPrice, string>({
      query: (symbol) => `/stocks/\${symbol}/price`,
    }),

    // Portfolio endpoints
    getPortfolio: builder.query<Portfolio, void>({
      query: () => '/portfolio',
      providesTags: ['Portfolio'],
    }),
    addToPortfolio: builder.mutation<PortfolioItem, PortfolioItemCreate>({
      query: (item) => ({
        url: '/portfolio',
        method: 'POST',
        body: item,
      }),
      invalidatesTags: ['Portfolio'],
    }),
    updatePortfolioItem: builder.mutation<
      PortfolioItem,
      { id: number; data: PortfolioItemUpdate }
    >({
      query: ({ id, data }) => ({
        url: `/portfolio/\${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Portfolio'],
    }),
    removeFromPortfolio: builder.mutation<void, number>({
      query: (id) => ({
        url: `/portfolio/\${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Portfolio'],
    }),

    // Watchlist endpoints
    getWatchlist: builder.query<WatchlistItem[], void>({
      query: () => '/watchlist',
      providesTags: ['Watchlist'],
    }),
    addToWatchlist: builder.mutation<WatchlistItem, WatchlistItemCreate>({
      query: (item) => ({
        url: '/watchlist',
        method: 'POST',
        body: item,
      }),
      invalidatesTags: ['Watchlist'],
    }),
    updateWatchlistItem: builder.mutation<
      WatchlistItem,
      { id: number; data: WatchlistItemUpdate }
    >({
      query: ({ id, data }) => ({
        url: `/watchlist/\${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Watchlist'],
    }),
    removeFromWatchlist: builder.mutation<void, number>({
      query: (id) => ({
        url: `/watchlist/\${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Watchlist'],
    }),

    // News endpoints
    getStockNews: builder.query<
      NewsResponse,
      { symbol: string; limit?: number }
    >({
      query: ({ symbol, limit = 10 }) => `/news/\${symbol}?limit=\${limit}`,
      providesTags: (result, error, { symbol }) => [
        { type: 'News', id: symbol },
      ],
    }),
    getGeneralNews: builder.query<NewsResponse, { limit?: number }>({
      query: ({ limit = 20 }) => `/news?limit=\${limit}`,
      providesTags: ['News'],
    }),

    // Prediction endpoints
    getStockPrediction: builder.query<
      StockPrediction,
      { symbol: string; days?: number }
    >({
      query: ({ symbol, days = 7 }) => `/predictions/\${symbol}?days=\${days}`,
      providesTags: (result, error, { symbol }) => [
        { type: 'Prediction', id: symbol },
      ],
    }),

    // Analysis endpoints
    getStockAnalysis: builder.query<StockAnalysisResponse, string>({
      query: (symbol) => `/stocks/\${symbol}/analysis`,
      providesTags: (result, error, symbol) => [
        { type: 'Analysis', id: symbol },
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useSearchStocksQuery,
  useGetStockQuery,
  useGetStockPriceQuery,
  useGetPortfolioQuery,
  useAddToPortfolioMutation,
  useUpdatePortfolioItemMutation,
  useRemoveFromPortfolioMutation,
  useGetWatchlistQuery,
  useAddToWatchlistMutation,
  useUpdateWatchlistItemMutation,
  useRemoveFromWatchlistMutation,
  useGetStockNewsQuery,
  useGetGeneralNewsQuery,
  useGetStockPredictionQuery,
  useGetStockAnalysisQuery,
} = apiSlice;
