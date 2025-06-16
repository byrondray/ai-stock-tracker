/**
 * Auth Slice
 *
 * Manages authentication state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import { isValidToken } from '../../utils/tokenUtils';

interface User {
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

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string; user: User }>
    ) => {
      state.isLoading = false;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    updateToken: (
      state,
      action: PayloadAction<{ token: string; refreshToken?: string }>
    ) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string; user: User }>
    ) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    restoreAuthState: (state) => {
      // Called when app rehydrates - if we have a token, consider user authenticated
      if (state.token && state.user) {
        state.isAuthenticated = true;
      } else {
        state.isAuthenticated = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: any) => {
      // When redux-persist rehydrates the state, restore auth status
      if (action.payload && action.payload.auth) {
        const authState = action.payload.auth;
        if (
          authState.token &&
          authState.user &&
          isValidToken(authState.token)
        ) {
          state.isAuthenticated = true;
        } else if (authState.token && !isValidToken(authState.token)) {
          // Token is expired, clear auth state
          state.token = null;
          state.refreshToken = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      }
    });
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateToken,
  clearError,
  setCredentials,
  restoreAuthState,
} = authSlice.actions;

export default authSlice.reducer;
