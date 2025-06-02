from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import Optional, List
from datetime import datetime, timedelta
import yfinance as yf

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
        """Get historical price data."""
        # First check database
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        db_history = self.db.query(PriceHistory).filter(
            PriceHistory.stock_symbol == symbol,
            PriceHistory.date >= start_date,
            PriceHistory.date <= end_date
        ).order_by(PriceHistory.date).all()
        
        # If we have recent data, return it
        if db_history and len(db_history) >= days * 0.8:  # At least 80% of requested days
            return [
                {
                    "date": item.date.isoformat(),
                    "open": item.open_price,
                    "high": item.high_price,
                    "low": item.low_price,
                    "close": item.close_price,
                    "volume": item.volume
                }
                for item in db_history
            ]
        
        # Otherwise fetch from API and cache
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=f"{days}d")
            
            if hist.empty:
                return []
            
            # Store in database for future use
            for date, row in hist.iterrows():
                price_entry = PriceHistory(
                    stock_symbol=symbol,
                    date=date.to_pydatetime(),
                    open_price=row['Open'],
                    high_price=row['High'],
                    low_price=row['Low'],
                    close_price=row['Close'],
                    volume=int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else None,
                    adjusted_close=row.get('Adj Close', row['Close'])
                )
                
                # Check if entry already exists
                existing = self.db.query(PriceHistory).filter(
                    PriceHistory.stock_symbol == symbol,
                    PriceHistory.date == date.to_pydatetime()
                ).first()
                
                if not existing:
                    self.db.add(price_entry)
            
            self.db.commit()
            
            # Return formatted data
            return [
                {
                    "date": date.isoformat(),
                    "open": row['Open'],
                    "high": row['High'],
                    "low": row['Low'],
                    "close": row['Close'],
                    "volume": int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else None
                }
                for date, row in hist.iterrows()
            ]
        except Exception as e:
            print(f"Error fetching history for {symbol}: {e}")
            return []
    
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
