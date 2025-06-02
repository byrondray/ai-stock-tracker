/**
 * API Slice
 *
 * RTK Query API slice for making HTTP requests to the backend
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Base API URL - you may need to adjust this based on your backend configuration
const BASE_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Define types for API responses
export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  updated_at: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  total_value: number;
  total_change: number;
  total_change_percent: number;
  positions: PortfolioPosition[];
  created_at: string;
  updated_at: string;
}

export interface PortfolioPosition {
  id: string;
  stock: Stock;
  quantity: number;
  average_price: number;
  current_value: number;
  total_return: number;
  total_return_percent: number;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  stocks: Stock[];
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevance_score?: number;
}

export interface Prediction {
  id: string;
  stock_symbol: string;
  prediction_type: 'price' | 'trend' | 'signal';
  predicted_value: number;
  confidence: number;
  time_horizon: string;
  created_at: string;
  valid_until: string;
}

// Create the API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Add auth token to requests
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Stock', 'Portfolio', 'Watchlist', 'News', 'Prediction'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<
      { access_token: string; refresh_token: string; user: User },
      { email: string; password: string }
    >({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    register: builder.mutation<
      { access_token: string; refresh_token: string; user: User },
      {
        email: string;
        password: string;
        username: string;
        first_name?: string;
        last_name?: string;
      }
    >({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    refreshToken: builder.mutation<
      { access_token: string; refresh_token: string },
      { refresh_token: string }
    >({
      query: (tokenData) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: tokenData,
      }),
    }),

    // User endpoints
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Stock endpoints
    getStocks: builder.query<Stock[], { search?: string; limit?: number }>({
      query: (params) => ({
        url: '/stocks',
        params,
      }),
      providesTags: ['Stock'],
    }),

    getStock: builder.query<Stock, string>({
      query: (symbol) => `/stocks/${symbol}`,
      providesTags: (result, error, symbol) => [{ type: 'Stock', id: symbol }],
    }),

    // Portfolio endpoints
    getPortfolios: builder.query<Portfolio[], void>({
      query: () => '/portfolios',
      providesTags: ['Portfolio'],
    }),

    getPortfolio: builder.query<Portfolio, string>({
      query: (id) => `/portfolios/${id}`,
      providesTags: (result, error, id) => [{ type: 'Portfolio', id }],
    }),

    createPortfolio: builder.mutation<Portfolio, Partial<Portfolio>>({
      query: (portfolio) => ({
        url: '/portfolios',
        method: 'POST',
        body: portfolio,
      }),
      invalidatesTags: ['Portfolio'],
    }),

    updatePortfolio: builder.mutation<
      Portfolio,
      { id: string; portfolio: Partial<Portfolio> }
    >({
      query: ({ id, portfolio }) => ({
        url: `/portfolios/${id}`,
        method: 'PUT',
        body: portfolio,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Portfolio', id }],
    }),

    deletePortfolio: builder.mutation<void, string>({
      query: (id) => ({
        url: `/portfolios/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Portfolio'],
    }),

    // Watchlist endpoints
    getWatchlists: builder.query<Watchlist[], void>({
      query: () => '/watchlists',
      providesTags: ['Watchlist'],
    }),

    getWatchlist: builder.query<Watchlist, string>({
      query: (id) => `/watchlists/${id}`,
      providesTags: (result, error, id) => [{ type: 'Watchlist', id }],
    }),

    createWatchlist: builder.mutation<Watchlist, Partial<Watchlist>>({
      query: (watchlist) => ({
        url: '/watchlists',
        method: 'POST',
        body: watchlist,
      }),
      invalidatesTags: ['Watchlist'],
    }),

    updateWatchlist: builder.mutation<
      Watchlist,
      { id: string; watchlist: Partial<Watchlist> }
    >({
      query: ({ id, watchlist }) => ({
        url: `/watchlists/${id}`,
        method: 'PUT',
        body: watchlist,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Watchlist', id }],
    }),

    deleteWatchlist: builder.mutation<void, string>({
      query: (id) => ({
        url: `/watchlists/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Watchlist'],
    }),

    // News endpoints
    getNews: builder.query<NewsArticle[], { symbol?: string; limit?: number }>({
      query: (params) => ({
        url: '/news',
        params,
      }),
      providesTags: ['News'],
    }),

    // Prediction endpoints
    getPredictions: builder.query<
      Prediction[],
      { symbol?: string; type?: string }
    >({
      query: (params) => ({
        url: '/predictions',
        params,
      }),
      providesTags: ['Prediction'],
    }),

    createPrediction: builder.mutation<
      Prediction,
      { symbol: string; type: string; horizon: string }
    >({
      query: (predictionRequest) => ({
        url: '/predictions',
        method: 'POST',
        body: predictionRequest,
      }),
      invalidatesTags: ['Prediction'],
    }),
  }),
});

// Export hooks for each endpoint
export const {
  // Auth hooks
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,

  // User hooks
  useGetCurrentUserQuery,

  // Stock hooks
  useGetStocksQuery,
  useGetStockQuery,

  // Portfolio hooks
  useGetPortfoliosQuery,
  useGetPortfolioQuery,
  useCreatePortfolioMutation,
  useUpdatePortfolioMutation,
  useDeletePortfolioMutation,

  // Watchlist hooks
  useGetWatchlistsQuery,
  useGetWatchlistQuery,
  useCreateWatchlistMutation,
  useUpdateWatchlistMutation,
  useDeleteWatchlistMutation,

  // News hooks
  useGetNewsQuery,

  // Prediction hooks
  useGetPredictionsQuery,
  useCreatePredictionMutation,
} = apiSlice;
