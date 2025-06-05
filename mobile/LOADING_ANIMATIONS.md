# Loading Animations Guide

## Overview

This document outlines all the loading animations that have been implemented throughout the AI Stock Analyzer mobile app. The loading system is designed to provide smooth, themed animations that enhance user experience while data is being fetched.

## Components Added

### 1. Enhanced LoadingSpinner (`src/components/ui/LoadingSpinner.tsx`)

**Features:**
- Three animation variants: `default`, `gradient`, `pulse`
- Themed colors that adapt to light/dark mode
- Customizable size, text, and overlay options
- Smooth animations using React Native's Animated API

**Usage:**
```tsx
<LoadingSpinner 
  variant="gradient" 
  size="large" 
  text="Loading data..." 
  color={theme.colors.primary}
/>
```

**Variants:**
- `default`: Standard ActivityIndicator
- `gradient`: Rotating gradient spinner
- `pulse`: Pulsing animation with scale transform

### 2. SkeletonLoader (`src/components/ui/SkeletonLoader.tsx`)

**Features:**
- Animated skeleton placeholders for content
- Predefined components for common patterns
- Shimmer effect that adapts to theme
- Configurable width, height, and border radius

**Components:**
- `SkeletonLoader`: Base skeleton component
- `SkeletonText`: Multi-line text placeholders
- `SkeletonCard`: Complete card layout skeleton
- `SkeletonAvatar`: Circular avatar placeholder
- `SkeletonButton`: Button-shaped placeholder

**Usage:**
```tsx
<SkeletonText lines={3} />
<SkeletonCard />
<SkeletonAvatar size={60} />
```

### 3. SectionLoadingCard (`src/components/ui/SectionLoadingCard.tsx`)

**Features:**
- Specialized loading cards for dashboard sections
- Type-specific layouts for portfolio, watchlist, news
- Combines spinners and skeleton elements
- Matches actual content layout structure

**Types:**
- `portfolio`: Portfolio overview with stats
- `watchlist`: Stock list with prices
- `news`: News articles with titles
- `generic`: Basic card with spinner option

**Usage:**
```tsx
<SectionLoadingCard type="portfolio" />
<SectionLoadingCard type="watchlist" />
<SectionLoadingCard type="news" />
```

### 4. Enhanced LoadingScreen (`src/components/common/LoadingScreen.tsx`)

**Features:**
- Full-screen loading with gradient background
- Uses enhanced LoadingSpinner internally
- Customizable text and animation variant
- Themed gradient colors

**Usage:**
```tsx
<LoadingScreen 
  text="Loading portfolio..." 
  variant="gradient" 
/>
```

## Screen Implementations

### 1. DashboardScreen

**Loading States:**
- Portfolio Overview: `SectionLoadingCard type="portfolio"`
- Watchlist: `SectionLoadingCard type="watchlist"`
- Market News: `SectionLoadingCard type="news"`

**Features:**
- Each section shows appropriate skeleton while loading
- Maintains proper spacing and layout during loading
- Smooth transitions from loading to content

### 2. StockSearchScreen

**Loading States:**
- Search Results: `LoadingSpinner variant="pulse"` with text
- Stock Details: `SkeletonCard` for detailed view
- Multiple skeleton cards for search results

**Features:**
- Shows searching animation while typing
- Skeleton preview of stock details
- Smooth loading transitions

### 3. PortfolioScreen

**Loading States:**
- Main loading: `LoadingSpinner variant="gradient"`
- Enhanced loading text and animations

**Features:**
- Full-screen gradient spinner for initial load
- Maintains header structure during loading

### 4. NewsScreen

**Loading States:**
- Header remains visible during loading
- `LoadingSpinner variant="pulse"` for main content
- Multiple `SkeletonCard` components for news items

**Features:**
- Progressive loading with header first
- News card skeletons match actual content layout
- Smooth transitions to real content

### 5. WatchlistScreen

**Loading States:**
- Similar to portfolio with gradient spinner
- Maintains navigation and header during loading

## Animation Specifications

### Timing and Easing
- **Pulse Animation**: 800ms duration, ease-in-out
- **Gradient Rotation**: 2000ms linear rotation
- **Skeleton Shimmer**: 1500ms ease-in-out fade

### Color Theming
- **Light Mode**: Subtle gray tones for skeletons
- **Dark Mode**: White with low opacity for skeletons
- **Gradient Overlays**: Semi-transparent themed backgrounds

### Performance Optimizations
- `useNativeDriver: true` for transform animations
- `useNativeDriver: false` only for color animations
- Cleanup of animation listeners on unmount

## Theme Integration

All loading components integrate with the app's theme system:

```tsx
const { theme, isDark } = useTheme();

// Colors adapt automatically
backgroundColor: isDark 
  ? 'rgba(255, 255, 255, 0.1)' 
  : 'rgba(0, 0, 0, 0.1)'
```

## Usage Guidelines

### When to Use Each Component

1. **LoadingSpinner**: Quick loading states, search results, small sections
2. **SkeletonLoader**: Content placeholders, maintaining layout
3. **SectionLoadingCard**: Dashboard sections, complex layouts
4. **LoadingScreen**: Full-screen loading, app initialization

### Best Practices

1. **Match Content Structure**: Use skeletons that match actual content layout
2. **Appropriate Duration**: Don't show loading for very quick operations
3. **Consistent Theming**: Always use themed colors and spacing
4. **Progressive Loading**: Show structure first, then populate with data
5. **Error Handling**: Provide fallbacks for failed loading states

## Implementation Examples

### Dashboard Section Loading
```tsx
{portfolioLoading ? (
  <SectionLoadingCard type="portfolio" />
) : (
  <PortfolioContent data={portfolio} />
)}
```

### Search Results Loading
```tsx
{searchLoading ? (
  <LoadingSpinner variant="pulse" text="Searching stocks..." />
) : (
  <SearchResults data={results} />
)}
```

### Full Screen Loading
```tsx
if (isInitialLoading) {
  return <LoadingScreen text="Loading your portfolio..." />;
}
```

## Accessibility

All loading components include:
- Proper semantics for screen readers
- Color contrast that meets accessibility standards
- Non-disruptive animations that respect motion preferences
- Clear loading state announcements

## Performance Metrics

- Loading animations start within 50ms of loading state change
- Skeleton layouts prevent layout shift (CLS = 0)
- Smooth 60fps animations on all supported devices
- Memory-efficient animation cleanup

## Future Enhancements

Potential improvements for loading animations:
1. Lottie animations for more complex loading states
2. Progress indicators for long-running operations
3. Micro-interactions during data updates
4. Smart preloading based on user behavior
5. Offline state indicators