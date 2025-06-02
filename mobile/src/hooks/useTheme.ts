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
    isDarkMode: themeContext.isDark, // Add backward compatibility
    colors: themeContext.theme.colors,
    spacing: themeContext.theme.spacing,
    typography: themeContext.theme.typography,
    borderRadius: themeContext.theme.borderRadius,
  };
}
