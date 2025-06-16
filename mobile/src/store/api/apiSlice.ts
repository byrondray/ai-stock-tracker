import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { ReactNode } from 'react';
import { configService } from '../../services/config';
import { logout, updateToken } from '../slices/authSlice';

// Base URL from config service
const baseUrl = configService.buildApiUrl('');

// Enhanced base query with 401 error handling
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Wrapper that handles 401 errors with token refresh attempt
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQueryWithAuth(args, api, extraOptions);

  // If we get a 401 Unauthorized response, try to refresh the token
  if (result.error && result.error.status === 401) {
    console.log('🔐 401 Unauthorized detected - attempting token refresh');

    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (refreshToken) {
      try {
        // Attempt to refresh the token
        const refreshResult = await fetchBaseQuery({
          baseUrl,
          prepareHeaders: (headers) => {
            headers.set('content-type', 'application/json');
            return headers;
          },
        })(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refresh_token: refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          // Refresh successful - update tokens
          const newTokenData = refreshResult.data as any;
          api.dispatch(
            updateToken({
              token: newTokenData.access_token,
              refreshToken: newTokenData.refresh_token,
            })
          );

          console.log(
            '✅ Token refresh successful - retrying original request'
          );

          // Retry the original request with the new token
          result = await baseQueryWithAuth(args, api, extraOptions);
        } else {
          // Refresh failed - logout user
          console.log('❌ Token refresh failed - logging out');
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        console.log('❌ Token refresh error - logging out:', error);

        // Dispatch logout action to clear auth state
        api.dispatch(logout());
      }
    } else {
      // No refresh token available - logout immediately
      console.log('❌ No refresh token available - logging out');

      // Dispatch logout action to clear auth state
      api.dispatch(logout());
    }
  }

  return result;
};

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
  // Additional properties used in screens
  open_price?: number;
  high_price?: number;
  low_price?: number;
  volume?: number;
  change_amount?: number;
  change_percent?: number;
}

export interface PortfolioItem {
  averagePrice: any;
  name: ReactNode;
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
  // Additional properties used in screens
  symbol?: string; // For backward compatibility
  name?: string; // For backward compatibility
  change?: number; // For backward compatibility
  changePercent?: number; // For backward compatibility
  addedAt?: string; // For backward compatibility
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
  symbol?: string;
  news_items: NewsItem[];
  overall_sentiment?: number;
  total_count: number;
  error?: string;
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
  user: User;
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
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  change: number;
  change_percent: number;
  last_updated: string;
}

export interface PriceHistoryResponse {
  symbol: string;
  timeframe: string;
  prices: StockPrice[];
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
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
        body: credentials,
      }),
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    refreshToken: builder.mutation<AuthResponse, RefreshTokenRequest>({
      query: (refreshData) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: refreshData,
      }),
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Stock endpoints
    searchStocks: builder.query<SearchResponse, string>({
      query: (query) => `/stocks/search?q=${encodeURIComponent(query)}`,
      providesTags: ['Stock'],
    }),
    getStock: builder.query<Stock, string>({
      query: (symbol) => `/stocks/${symbol}`,
      providesTags: (result, error, symbol) => [{ type: 'Stock', id: symbol }],
    }),
    getStockPrice: builder.query<StockPrice, string>({
      query: (symbol) => `/stocks/${symbol}/price`,
    }),

    // Portfolio endpoints
    getPortfolio: builder.query<Portfolio, void>({
      query: () => '/portfolio/',
      providesTags: ['Portfolio'],
    }),
    addToPortfolio: builder.mutation<PortfolioItem, PortfolioItemCreate>({
      query: (item) => ({
        url: '/portfolio/',
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
        url: `/portfolio/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Portfolio'],
    }),
    removeFromPortfolio: builder.mutation<void, number>({
      query: (id) => ({
        url: `/portfolio/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Portfolio'],
    }),

    // Watchlist endpoints
    getWatchlist: builder.query<WatchlistItem[], void>({
      query: () => '/watchlist/',
      providesTags: ['Watchlist'],
    }),
    addToWatchlist: builder.mutation<WatchlistItem, WatchlistItemCreate>({
      query: (item) => ({
        url: '/watchlist/',
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
        url: `/watchlist/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Watchlist'],
    }),
    removeFromWatchlist: builder.mutation<void, string>({
      query: (symbol) => ({
        url: `/watchlist/${symbol}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Watchlist'],
    }),

    // News endpoints
    getStockNews: builder.query<
      NewsResponse,
      { symbol: string; limit?: number }
    >({
      query: ({ symbol, limit = 10 }) => `/news/${symbol}?limit=${limit}`,
      providesTags: (result, error, { symbol }) => [
        { type: 'News', id: symbol },
      ],
    }),
    getGeneralNews: builder.query<NewsResponse, { limit?: number }>({
      query: ({ limit = 20 }) => `/news/?limit=${limit}`,
      providesTags: ['News'],
    }),

    // Price history endpoint
    getStockPriceHistory: builder.query<
      { symbol: string; days: number; data: any[] },
      { symbol: string; timeframe: string }
    >({
      query: ({ symbol, timeframe }) => {
        // Convert timeframe to days - more robust conversion
        const timeframeToDays: Record<string, number> = {
          '1d': 1,
          '1D': 1,
          '1w': 7,
          '1W': 7,
          '1m': 30,
          '1M': 30,
          '3m': 90,
          '3M': 90,
          '6m': 180,
          '6M': 180,
          '1y': 365,
          '1Y': 365,
        };

        const days = timeframeToDays[timeframe] || 30;

        console.log(
          `📊 Price History Query: ${symbol}, timeframe: ${timeframe}, days: ${days}`
        );

        return `/stocks/${symbol}/history?days=${days}`;
      },
      providesTags: (result, error, { symbol }) => [
        { type: 'Stock', id: symbol },
      ],
    }),

    // Prediction endpoints
    getStockPrediction: builder.query<
      StockPrediction,
      { symbol: string; days?: number }
    >({
      query: ({ symbol, days = 7 }) => `/predictions/${symbol}?days=${days}`,
      providesTags: (result, error, { symbol }) => [
        { type: 'Prediction', id: symbol },
      ],
    }),

    // Analysis endpoints
    getStockAnalysis: builder.query<StockAnalysisResponse, string>({
      query: (symbol) => `/stocks/${symbol}/analysis`,
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
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useSearchStocksQuery,
  useGetStockQuery,
  useGetStockPriceQuery,
  useGetStockPriceHistoryQuery,
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

// Add aliases for backward compatibility
export const useGetStockDetailsQuery = useGetStockQuery;
export const useUpdatePortfolioHoldingMutation = useUpdatePortfolioItemMutation;
export const useDeletePortfolioItemMutation = useRemoveFromPortfolioMutation;
export const useDeleteWatchlistItemMutation = useRemoveFromWatchlistMutation;
export const useGetMarketNewsQuery = useGetGeneralNewsQuery;
