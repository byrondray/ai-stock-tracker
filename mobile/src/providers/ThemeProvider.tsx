/**
 * Theme Provider
 *
 * Provides theme context and dark/light mode support
 * Automatically follows the device's system theme
 */

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

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
    textSecondary: '#FFFFFF', // Changed from gray to white for better contrast
    border: '#4A4A6A',
    error: '#FF6B6B',
    success: '#51CF66',
    warning: '#FFD43B',
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setSystemTheme: (enabled: boolean) => void;
  isSystemTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [isSystemTheme, setIsSystemTheme] = useState(true);

  // Get initial system theme
  useEffect(() => {
    const getInitialTheme = () => {
      const systemColorScheme = Appearance.getColorScheme();
      if (isSystemTheme) {
        setMode(systemColorScheme === 'dark' ? 'dark' : 'light');
      }
    };

    getInitialTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (isSystemTheme) {
        setMode(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isSystemTheme]);

  const toggleTheme = () => {
    setIsSystemTheme(false);
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setSystemTheme = (enabled: boolean) => {
    setIsSystemTheme(enabled);
    if (enabled) {
      const systemColorScheme = Appearance.getColorScheme();
      setMode(systemColorScheme === 'dark' ? 'dark' : 'light');
    }
  };

  const theme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setSystemTheme, isSystemTheme }}
    >
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
