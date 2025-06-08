from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import Optional, List
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd

from app.models import Stock, PriceHistory
from app.schemas import StockCreate, StockUpdate, StockSearchResult, StockPrice


class StockService:
    """Service for stock operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_symbol(self, symbol: str) -> Optional[Stock]:
        """Get stock by symbol."""
        return self.db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    
    async def create(self, stock_data: StockCreate) -> Stock:
        """Create a new stock entry."""
        db_stock = Stock(
            symbol=stock_data.symbol.upper(),
            name=stock_data.name,
            sector=stock_data.sector,
            industry=stock_data.industry,
            market_cap=stock_data.market_cap,
            currency=stock_data.currency,
            exchange=stock_data.exchange,
            country=stock_data.country
        )
        
        self.db.add(db_stock)
        self.db.commit()
        self.db.refresh(db_stock)
        return db_stock
    
    async def update(self, symbol: str, stock_data: StockUpdate) -> Optional[Stock]:
        """Update stock information."""
        db_stock = await self.get_by_symbol(symbol)
        if not db_stock:
            return None
        
        update_data = stock_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_stock, field, value)
        
        db_stock.last_updated = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_stock)
        return db_stock
    
    async def search(self, query: str, limit: int = 10) -> List[StockSearchResult]:
        """Search stocks by symbol or name."""
        # First check local database
        stocks = self.db.query(Stock).filter(
            or_(
                Stock.symbol.ilike(f"%{query.upper()}%"),
                Stock.name.ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        results = []
        for stock in stocks:
            results.append(StockSearchResult(
                symbol=stock.symbol,
                name=stock.name,
                exchange=stock.exchange,
                type="stock",
                currency=stock.currency
            ))
        
        # If no local results, try external search
        if not results:
            results = await self._search_external(query, limit)
        
        return results
    
    async def get_current_price(self, symbol: str) -> Optional[StockPrice]:
        """Get current stock price using yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="2d")
            
            if hist.empty:
                return None
            
            current_price = hist['Close'].iloc[-1]
            previous_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
            
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100 if previous_close > 0 else 0
            
            return StockPrice(
                symbol=symbol,
                price=current_price,
                change=change,
                change_percent=change_percent,
                volume=int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else None,
                last_updated=datetime.utcnow()
            )
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
            return None
    
    async def get_price_history(self, symbol: str, days: int = 30) -> List[dict]:
        """Get historical price data with appropriate intervals for different timeframes."""
        # Determine the appropriate yfinance period and interval
        if days <= 1:
            period = "1d"
            interval = "5m"  # 5-minute intervals for intraday
        elif days <= 7:
            period = f"{days}d"
            interval = "1h"  # Hourly intervals for weekly data
        elif days <= 30:
            period = f"{days}d"
            interval = "1d"  # Daily intervals for monthly data
        elif days <= 365:
            period = f"{days}d"
            interval = "1d"  # Daily intervals for yearly data
        else:
            period = "2y"  # Maximum period for yfinance
            interval = "1wk"  # Weekly intervals for longer periods
        
        print(f"📊 Fetching {symbol} history: days={days}, period={period}, interval={interval}")
        
        # For intraday data (1 day), always fetch fresh from API as DB only stores daily data
        if days <= 1:
            print(f"🔄 Fetching intraday data for {symbol}")
            return await self._fetch_intraday_data(symbol, interval)
        
        # For longer periods, check database first
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        db_history = self.db.query(PriceHistory).filter(
            PriceHistory.stock_symbol == symbol,
            PriceHistory.date >= start_date,
            PriceHistory.date <= end_date
        ).order_by(PriceHistory.date).all()
        
        # If we have recent daily data, return it
        if db_history and len(db_history) >= min(days * 0.7, 5):  # At least 70% of requested days or 5 days minimum
            print(f"✅ Using cached data: {len(db_history)} records")
            return [
                {
                    "date": item.date.isoformat(),
                    "open": float(item.open_price),
                    "high": float(item.high_price),
                    "low": float(item.low_price),
                    "close": float(item.close_price),
                    "close_price": float(item.close_price),  # Add alias for frontend compatibility
                    "volume": item.volume
                }
                for item in db_history
            ]
        
        # Otherwise fetch from API and cache
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                print(f"❌ No data returned from yfinance for {symbol}")
                return []
            
            print(f"✅ Fetched {len(hist)} records from yfinance")
            
            # Only cache daily data to avoid database bloat
            if interval == "1d":
                await self._cache_daily_data(symbol, hist)
            
            # Return formatted data
            result = []
            for date, row in hist.iterrows():
                result.append({
                    "date": date.isoformat(),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "close_price": float(row['Close']),  # Add alias for frontend compatibility
                    "volume": int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else None
                })
            
            return result
            
        except Exception as e:
            print(f"❌ Error fetching history for {symbol}: {e}")
            # Return cached data if available, even if incomplete
            if db_history:
                print(f"🔄 Falling back to cached data: {len(db_history)} records")
                return [
                    {
                        "date": item.date.isoformat(),
                        "open": float(item.open_price),
                        "high": float(item.high_price),
                        "low": float(item.low_price),
                        "close": float(item.close_price),
                        "close_price": float(item.close_price),
                        "volume": item.volume
                    }
                    for item in db_history
                ]
            return []

    async def _fetch_intraday_data(self, symbol: str, interval: str) -> List[dict]:
        """Fetch intraday data that shouldn't be cached."""
        try:
            ticker = yf.Ticker(symbol)
            
            # For intraday data, try different approaches
            # 1. Try intraday data first
            periods_to_try = ["1d", "2d"]
            intervals_to_try = ["5m", "15m", "30m", "1h"]
            hist = None
            
            # Try intraday intervals first
            for period in periods_to_try:
                for test_interval in intervals_to_try:
                    try:
                        hist = ticker.history(period=period, interval=test_interval)
                        if not hist.empty:
                            print(f"✅ Got intraday data with period={period}, interval={test_interval}: {len(hist)} points")
                            break
                    except Exception as e:
                        print(f"❌ Failed with period={period}, interval={test_interval}: {e}")
                        continue
                if hist is not None and not hist.empty:
                    break
            
            # If intraday fails, fall back to recent daily data
            if hist is None or hist.empty:
                print(f"⚠️ No intraday data available for {symbol}, falling back to daily data")
                try:
                    hist = ticker.history(period="5d", interval="1d")
                    if not hist.empty:
                        print(f"✅ Got fallback daily data: {len(hist)} points")
                except Exception as e:
                    print(f"❌ Even daily fallback failed: {e}")
                    
                if hist is None or hist.empty:
                    print(f"❌ No data available at all for {symbol}")
                    return []
            
            # Filter to recent data if we have too much
            if not hist.empty and len(hist) > 100:
                recent_cutoff = datetime.utcnow() - timedelta(days=1)
                recent_hist = hist[hist.index >= recent_cutoff]
                if not recent_hist.empty:
                    hist = recent_hist
                    print(f"📊 Filtered to recent data: {len(hist)} points")
            
            result = []
            for date, row in hist.iterrows():
                result.append({
                    "date": date.isoformat(),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "close_price": float(row['Close']),
                    "volume": int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else None
                })
            
            print(f"📊 Returning {len(result)} data points for {symbol}")
            return result
            
        except Exception as e:
            print(f"❌ Error fetching intraday data for {symbol}: {e}")
            return []

    async def _cache_daily_data(self, symbol: str, hist_data) -> None:
        """Cache daily data to database."""
        try:
            for date, row in hist_data.iterrows():
                # Check if entry already exists
                existing = self.db.query(PriceHistory).filter(
                    PriceHistory.stock_symbol == symbol,
                    PriceHistory.date == date.to_pydatetime()
                ).first()
                
                if not existing:
                    price_entry = PriceHistory(
                        stock_symbol=symbol,
                        date=date.to_pydatetime(),
                        open_price=float(row['Open']),
                        high_price=float(row['High']),
                        low_price=float(row['Low']),
                        close_price=float(row['Close']),
                        volume=int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else None,
                        adjusted_close=float(row.get('Adj Close', row['Close']))
                    )
                    self.db.add(price_entry)
            
            self.db.commit()
        except Exception as e:
            print(f"Error caching data for {symbol}: {e}")
            self.db.rollback()
    
    async def update_stock_info(self, symbol: str) -> Optional[Stock]:
        """Update stock information from external API."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            db_stock = await self.get_by_symbol(symbol)
            if not db_stock:
                # Create new stock entry
                stock_data = StockCreate(
                    symbol=symbol,
                    name=info.get('longName', info.get('shortName', symbol)),
                    sector=info.get('sector'),
                    industry=info.get('industry'),
                    market_cap=info.get('marketCap'),
                    currency=info.get('currency', 'USD'),
                    exchange=info.get('exchange'),
                    country=info.get('country')
                )
                return await self.create(stock_data)
            else:
                # Update existing stock
                update_data = StockUpdate(
                    name=info.get('longName', info.get('shortName', db_stock.name)),
                    sector=info.get('sector'),
                    industry=info.get('industry'),
                    market_cap=info.get('marketCap'),
                    current_price=info.get('currentPrice')
                )
                return await self.update(symbol, update_data)
        except Exception as e:
            print(f"Error updating stock info for {symbol}: {e}")
            return None
    
    async def _search_external(self, query: str, limit: int = 10) -> List[StockSearchResult]:
        """Search stocks using external APIs."""
        results = []
        
        # Try direct symbol lookup first
        try:
            ticker = yf.Ticker(query.upper())
            info = ticker.info
            
            # Check if it's a valid ticker
            if info and 'symbol' in info and info.get('longName'):
                symbol = info.get('symbol', query.upper())
                name = info.get('longName', info.get('shortName', symbol))
                exchange = info.get('exchange', 'Unknown')
                currency = info.get('currency', 'USD')
                
                result = StockSearchResult(
                    symbol=symbol,
                    name=name,
                    exchange=exchange,
                    type="stock",
                    currency=currency
                )
                results.append(result)
                
                # Also create/update the stock in database for future searches
                await self.update_stock_info(symbol)
                
        except Exception as e:
            print(f"Error searching for {query}: {e}")
        
        # If we have some popular stocks to suggest when search fails
        if not results and len(query) >= 2:
            popular_stocks = [
                ("AAPL", "Apple Inc.", "NASDAQ"),
                ("GOOGL", "Alphabet Inc.", "NASDAQ"),
                ("MSFT", "Microsoft Corporation", "NASDAQ"),
                ("AMZN", "Amazon.com Inc.", "NASDAQ"),
                ("TSLA", "Tesla Inc.", "NASDAQ"),
                ("META", "Meta Platforms Inc.", "NASDAQ"),
                ("NFLX", "Netflix Inc.", "NASDAQ"),
                ("NVDA", "NVIDIA Corporation", "NASDAQ"),
                ("AMD", "Advanced Micro Devices", "NASDAQ"),
                ("INTC", "Intel Corporation", "NASDAQ"),
            ]
            
            # Filter popular stocks that match the query
            for symbol, name, exchange in popular_stocks:
                if (query.upper() in symbol.upper() or 
                    query.lower() in name.lower()):
                    results.append(StockSearchResult(
                        symbol=symbol,
                        name=name,
                        exchange=exchange,
                        type="stock",
                        currency="USD"
                    ))
                    
                    if len(results) >= limit:
                        break
        
        return results[:limit]
