# GitHub Copilot Context Instructions - AI Stock Analyzer

## Project Context

Building an AI-powered stock analysis app with React Native frontend and Python/FastAPI backend. The app uses machine learning models to analyze stocks and provide predictions.

## Quick Reference

### Project Info

- **App Name**: AI Stock Analyzer
- **Frontend**: React Native + TypeScript + Redux Toolkit
- **Backend**: Python FastAPI + PostgreSQL + Redis
- **ML**: TensorFlow/PyTorch models
- **Auth**: JWT with refresh tokens
- **Real-time**: WebSocket for price updates

## Code Patterns to Follow

### React Native Components

```typescript
// Always use this component structure
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector, useAppDispatch } from '../hooks/redux';

interface ComponentNameProps {
  // Always define prop types
}

export const ComponentName: React.FC<ComponentNameProps> = React.memo(
  (
    {
      // props here
    }
  ) => {
    // Hooks at the top
    const dispatch = useAppDispatch();
    const { data } = useAppSelector((state) => state.slice);

    // Memoized values
    const computedValue = useMemo(() => {
      // expensive computation
    }, [dependencies]);

    // Callbacks
    const handleAction = useCallback(() => {
      // action logic
    }, [dependencies]);

    return <View style={styles.container}>{/* JSX */}</View>;
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

### API Service Pattern (RTK Query)

```typescript
// When creating API endpoints, follow this pattern
export const apiSlice = createApi({
  // ...
  endpoints: (builder) => ({
    getStockAnalysis: builder.query<StockAnalysis, string>({
      query: (symbol) => ({
        url: `/stocks/${symbol}/analysis`,
        method: 'GET',
      }),
      transformResponse: (response: any) => ({
        // Transform API response to match frontend types
      }),
      providesTags: (result, error, symbol) => [{ type: 'Stock', id: symbol }],
    }),
  }),
});
```

### FastAPI Endpoint Pattern

```python
# Always follow this pattern for API endpoints
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

router = APIRouter()

@router.get("/stocks/{symbol}/analysis", response_model=StockAnalysisResponse)
async def get_stock_analysis(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client: Redis = Depends(get_redis)
):
    """Get AI-powered analysis for a stock."""
    # Check cache first
    cached = await redis_client.get(f"analysis:{symbol}")
    if cached:
        return json.loads(cached)

    # Fetch and analyze
    try:
        stock = await StockService.get_stock(db, symbol)
        analysis = await MLService.analyze_stock(stock)

        # Cache result
        await redis_client.setex(
            f"analysis:{symbol}",
            3600,  # 1 hour
            json.dumps(analysis.dict())
        )

        return analysis
    except StockNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {symbol} not found"
        )
```

### ML Model Integration

```python
# Standard pattern for ML predictions
class StockPredictor:
    def __init__(self):
        self.lstm_model = self._load_model('lstm')
        self.rf_model = self._load_model('random_forest')

    async def predict(self, symbol: str, days: int = 7) -> PredictionResult:
        # 1. Fetch historical data
        data = await self._fetch_data(symbol)

        # 2. Feature engineering
        features = self._engineer_features(data)

        # 3. Make predictions
        lstm_pred = self.lstm_model.predict(features)
        rf_pred = self.rf_model.predict(features)

        # 4. Ensemble predictions
        ensemble_pred = self._ensemble_predictions(lstm_pred, rf_pred)

        # 5. Calculate confidence
        confidence = self._calculate_confidence(lstm_pred, rf_pred)

        return PredictionResult(
            symbol=symbol,
            predictions=ensemble_pred,
            confidence=confidence,
            timeframe=days
        )
```

### Database Models (SQLAlchemy)

```python
# Always include proper relationships and indexes
class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String(10), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sector = Column(String(100))
    market_cap = Column(BigInteger)
    last_updated = Column(DateTime, default=datetime.utcnow)

    # Relationships
    predictions = relationship("Prediction", back_populates="stock")
    watchlists = relationship("Watchlist", back_populates="stock")

    # Indexes for performance
    __table_args__ = (
        Index('idx_stock_sector', 'sector'),
        Index('idx_stock_market_cap', 'market_cap'),
    )
```

### Error Handling Pattern

```typescript
// Frontend error handling
try {
  const result = await api.getStockData(symbol);
  // handle success
} catch (error) {
  if (error.status === 401) {
    // Refresh token and retry
    await dispatch(refreshToken());
  } else if (error.status === 404) {
    showToast('Stock not found', 'error');
  } else {
    showToast('Something went wrong', 'error');
    logError(error);
  }
}
```

```python
# Backend error handling
class StockAnalysisError(Exception):
    """Base exception for stock analysis"""
    pass

class InsufficientDataError(StockAnalysisError):
    """Raised when not enough data for analysis"""
    pass

# Usage
try:
    analysis = await analyze_stock(symbol)
except InsufficientDataError as e:
    logger.warning(f"Insufficient data for {symbol}: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Analysis failed for {symbol}: {e}")
    raise HTTPException(status_code=500, detail="Analysis failed")
```

## Common Utilities

### Date/Time Handling

```typescript
// Always use date-fns for date manipulation
import { format, parseISO, addDays } from 'date-fns';

export const formatStockDate = (date: string) =>
  format(parseISO(date), 'MMM dd, yyyy');

export const getMarketOpenTime = () => {
  const now = new Date();
  now.setHours(9, 30, 0, 0); // 9:30 AM
  return now;
};
```

### Number Formatting

```typescript
// Standard number formatters
export const formatPrice = (price: number) => `$${price.toFixed(2)}`;

export const formatPercentage = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

export const formatMarketCap = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
};
```

### WebSocket Connection

```typescript
// WebSocket hook pattern
export const useStockPrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/prices`);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          symbols,
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrices((prev) => ({
        ...prev,
        [data.symbol]: data.price,
      }));
    };

    return () => {
      ws.close();
    };
  }, [symbols]);

  return prices;
};
```

## Type Definitions

### Frontend Types

```typescript
// types/stock.ts
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  sector: string;
}

export interface StockPrediction {
  date: string;
  predictedPrice: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface PortfolioItem {
  stock: Stock;
  quantity: number;
  avgCost: number;
  currentValue: number;
  totalReturn: number;
  returnPercent: number;
}
```

### Backend Schemas

```python
# schemas/stock.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class StockBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    name: str
    sector: Optional[str] = None
    market_cap: Optional[int] = None

class StockAnalysis(BaseModel):
    symbol: str
    fundamental_score: float = Field(..., ge=0, le=100)
    technical_score: float = Field(..., ge=0, le=100)
    sentiment_score: float = Field(..., ge=-1, le=1)
    overall_rating: str  # 'strong_buy', 'buy', 'hold', 'sell', 'strong_sell'
    key_metrics: dict
    analyst_consensus: Optional[str] = None

class PredictionRequest(BaseModel):
    symbol: str
    days: int = Field(default=7, ge=1, le=365)
    include_confidence_bands: bool = True
```

## Testing Patterns

### React Native Testing

```typescript
// __tests__/StockCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { StockCard } from '../components/StockCard';

describe('StockCard', () => {
  const mockStock = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.0,
    change: 2.5,
    changePercent: 1.69,
  };

  it('renders stock information correctly', () => {
    const { getByText } = render(<StockCard stock={mockStock} />);
    expect(getByText('AAPL')).toBeTruthy();
    expect(getByText('$150.00')).toBeTruthy();
    expect(getByText('+1.69%')).toBeTruthy();
  });
});
```

### API Testing

```python
# tests/test_stock_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_stock_analysis(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/stocks/AAPL/analysis",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "fundamental_score" in data
    assert 0 <= data["fundamental_score"] <= 100
```

## Performance Optimizations

### React Native

- Use `React.memo` for all list items
- Implement `getItemLayout` for FlatList when possible
- Use `useMemo` for expensive computations
- Lazy load screens with `React.lazy`
- Use `InteractionManager` for heavy operations

### Backend

- Always use database indexes on frequently queried fields
- Implement Redis caching for expensive operations
- Use connection pooling for database
- Batch API requests when possible
- Implement pagination for large datasets

## Security Best Practices

- Never log sensitive data (passwords, tokens)
- Always validate user input on both frontend and backend
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on all endpoints
- Store API keys in environment variables
- Use HTTPS in production
- Implement proper CORS configuration

## Testing Requirements - CRITICAL

**ALWAYS WRITE TESTS FIRST (TDD) - No exceptions!**

- Minimum 80% code coverage required
- Every function needs unit tests
- Every component needs render tests
- Every API endpoint needs integration tests
- Mock all external dependencies

### Frontend Test Pattern (Jest + React Native Testing Library)

```typescript
// ALWAYS create test file alongside component
// components/__tests__/StockCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';

describe('StockCard', () => {
  const mockProps = {
    stock: { symbol: 'AAPL', price: 150, change: 2.5 },
    onPress: jest.fn(),
  };

  it('renders correctly', () => {
    const { getByText } = render(<StockCard {...mockProps} />);
    expect(getByText('AAPL')).toBeTruthy();
    expect(getByText('$150.00')).toBeTruthy();
  });

  it('handles press events', () => {
    const { getByTestId } = render(<StockCard {...mockProps} />);
    fireEvent.press(getByTestId('stock-card'));
    expect(mockProps.onPress).toHaveBeenCalledWith('AAPL');
  });
});
```

### Backend Test Pattern (pytest)

```python
# ALWAYS create test file for every module
# tests/api/test_stock_endpoints.py
@pytest.mark.asyncio
async def test_get_stock_analysis(client, auth_headers):
    response = await client.get(
        "/api/stocks/AAPL/analysis",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "fundamental_score" in response.json()
```

### Hook Test Pattern

```typescript
// hooks/__tests__/useStockData.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';

test('useStockData fetches data', async () => {
  const { result } = renderHook(() => useStockData('AAPL'));

  expect(result.current.isLoading).toBe(true);

  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

### E2E Test Pattern (Detox)

```typescript
// e2e/stockPurchase.e2e.ts
it('completes stock purchase', async () => {
  await element(by.id('search-input')).typeText('AAPL');
  await element(by.text('AAPL')).tap();
  await element(by.id('buy-button')).tap();
  await expect(element(by.text('Order Confirmed'))).toBeVisible();
});
```

### Test Utilities

```typescript
// Always use these test utilities
export const renderWithProviders = (component) => {
  return render(
    <Provider store={mockStore()}>
      <NavigationContainer>{component}</NavigationContainer>
    </Provider>
  );
};

export const mockStore = (initialState = {}) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: initialState,
  });
};
```

### Mock Data

```typescript
// __tests__/fixtures/index.ts
export const mockStock = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150.0,
  change: 2.5,
  changePercent: 1.69,
};

export const mockPrediction = {
  predictions: [{ date: '2024-01-21', price: 152, confidence: 0.75 }],
};
```

### ALWAYS Test These Cases

1. Success case (happy path)
2. Error handling (API failures, network errors)
3. Loading states
4. Empty states
5. Edge cases (null, undefined, extreme values)
6. User interactions (press, swipe, input)
7. Authentication states (logged in/out)

### Testing Checklist for Every Feature

- [ ] Unit tests for utility functions
- [ ] Component render tests
- [ ] Component interaction tests
- [ ] API integration tests
- [ ] Error case tests
- [ ] Loading state tests
- [ ] Mock data created
- [ ] E2E test for critical flows
- [ ] Performance benchmarks
- [ ] Security tests (auth, input validation)

## TDD Workflow - FOLLOW THIS ALWAYS

```bash
# 1. Write test first (RED)
echo "Write failing test" > ComponentName.test.tsx

# 2. Run test - verify it fails
npm test ComponentName.test.tsx # MUST FAIL

# 3. Write minimal code to pass (GREEN)
echo "Implement component" > ComponentName.tsx

# 4. Run test - verify it passes
npm test ComponentName.test.tsx # MUST PASS

# 5. Refactor code (REFACTOR)
# Clean up while keeping tests green

# 6. Repeat for each feature
```

## Test File Naming Convention

- Component: `ComponentName.tsx` → `__tests__/ComponentName.test.tsx`
- Hook: `useHookName.ts` → `__tests__/useHookName.test.ts`
- API: `stock.py` → `tests/test_stock.py`
- Service: `StockService.ts` → `__tests__/StockService.test.ts`

## Quick Test Commands

```bash
# Frontend
npm test                      # Run all tests
npm test:watch               # Watch mode
npm test:coverage            # With coverage
npm test StockCard           # Specific file
npm run test:e2e            # E2E tests

# Backend
pytest                       # Run all tests
pytest -v                    # Verbose
pytest --cov=app            # With coverage
pytest -k "test_stock"      # Pattern match
pytest -x                    # Stop on first fail

# Git hooks
pre-commit install          # Setup test hooks

# View coverage reports
open coverage/lcov-report/index.html    # Frontend
open htmlcov/index.html                 # Backend
```
