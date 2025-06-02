/**
 * Theme Provider
 *
 * Provides theme context and dark/light mode support
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store';

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    textInverted: string;
    border: string;
    placeholder: string;
    shadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    fontWeight: {
      normal: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    secondary: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    textInverted: '#FFFFFF',
    border: '#E2E8F0',
    placeholder: '#94A3B8',
    shadow: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    secondary: '#94A3B8',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textInverted: '#1E293B',
    border: '#334155',
    placeholder: '#64748B',
    shadow: '#000000',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const userTheme = useAppSelector((state) => state.ui.theme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    switch (userTheme) {
      case 'dark':
        setIsDark(true);
        break;
      case 'light':
        setIsDark(false);
        break;
      case 'system':
      default:
        setIsDark(systemColorScheme === 'dark');
        break;
    }
  }, [userTheme, systemColorScheme]);

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
