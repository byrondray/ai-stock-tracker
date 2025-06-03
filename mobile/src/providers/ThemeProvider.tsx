/**
 * Theme Provider
 *
 * Provides theme context and dark/light mode support
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

interface Theme {
  colors: ThemeColors;
  mode: 'light' | 'dark';
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E1E1E1',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#1A1A2E',
    surface: '#2D2D44',
    card: '#353559',
    text: '#FFFFFF',
    textSecondary: '#B8B8CC',
    border: '#4A4A6A',
    error: '#FF6B6B',
    success: '#51CF66',
    warning: '#FFD43B',
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = React.useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
