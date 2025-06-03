/**
 * Theme Hook
 *
 * Custom hook for accessing theme values
 */

import { useContext } from 'react';
import { useAppSelector } from '../store';
import { useTheme as useThemeContext } from '../providers/ThemeProvider';

export function useTheme() {
  const themeContext = useThemeContext();
  return {
    ...themeContext,
    isDark: themeContext.theme.mode === 'dark',
    isDarkMode: themeContext.theme.mode === 'dark', // Add backward compatibility
    colors: themeContext.theme.colors,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    typography: {
      h1: { fontSize: 32, fontWeight: 'bold' },
      h2: { fontSize: 24, fontWeight: 'bold' },
      h3: { fontSize: 20, fontWeight: 'bold' },
      body: { fontSize: 16 },
      caption: { fontSize: 12 },
    },
    borderRadius: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
  };
}
