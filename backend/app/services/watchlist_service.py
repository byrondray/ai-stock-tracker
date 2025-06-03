from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.models import Watchlist, Stock
from app.schemas import WatchlistItemCreate, WatchlistItemUpdate, WatchlistItem
from app.services.stock_service import StockService


class WatchlistService:
    """Service for watchlist operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.stock_service = StockService(db)
    
    async def get_user_watchlist(self, user_id: int) -> List[WatchlistItem]:
        """Get user's complete watchlist with current prices."""
        watchlist_items = self.db.query(Watchlist).filter(
            Watchlist.user_id == user_id
        ).all()
        
        result = []
        for item in watchlist_items:
            # Get current price
            current_price_data = await self.stock_service.get_current_price(item.stock_symbol)
            
            watchlist_item = WatchlistItem(
                id=item.id,
                stock_symbol=item.stock_symbol,
                notes=item.notes,
                alert_price_target=item.alert_price_target,
                alert_percentage_change=item.alert_percentage_change,
                added_at=item.added_at,
                stock=item.stock,
                current_price=current_price_data.price if current_price_data else None,
                price_change=current_price_data.change if current_price_data else None,
                price_change_percent=current_price_data.change_percent if current_price_data else None
            )
            result.append(watchlist_item)
        
        return result
    
    async def get_watchlist_item(self, user_id: int, symbol: str) -> Optional[Watchlist]:
        """Get specific watchlist item."""
        return self.db.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.stock_symbol == symbol.upper()
        ).first()
    
    async def add_item(self, user_id: int, item_data: WatchlistItemCreate) -> WatchlistItem:
        """Add item to watchlist."""
        # Ensure stock exists
        stock = await self.stock_service.get_by_symbol(item_data.stock_symbol)
        if not stock:
            # Try to fetch and create stock info
            stock = await self.stock_service.update_stock_info(item_data.stock_symbol)
            if not stock:
                raise ValueError(f"Stock {item_data.stock_symbol} not found")
        
        # Create watchlist item
        db_item = Watchlist(
            user_id=user_id,
            stock_symbol=item_data.stock_symbol.upper(),
            notes=item_data.notes,
            alert_price_target=item_data.alert_price_target,
            alert_percentage_change=item_data.alert_percentage_change
        )
        
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        
        # Return with current price
        current_price_data = await self.stock_service.get_current_price(item_data.stock_symbol)
        
        return WatchlistItem(
            id=db_item.id,
            stock_symbol=db_item.stock_symbol,
            notes=db_item.notes,
            alert_price_target=db_item.alert_price_target,
            alert_percentage_change=db_item.alert_percentage_change,
            added_at=db_item.added_at,
            stock=stock,
            current_price=current_price_data.price if current_price_data else None,
            price_change=current_price_data.change if current_price_data else None,
            price_change_percent=current_price_data.change_percent if current_price_data else None
        )
    
    async def update_item(self, user_id: int, item_id: int, item_data: WatchlistItemUpdate) -> Optional[WatchlistItem]:
        """Update watchlist item."""
        db_item = self.db.query(Watchlist).filter(
            Watchlist.id == item_id,
            Watchlist.user_id == user_id
        ).first()
        
        if not db_item:
            return None
        
        update_data = item_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)
        
        self.db.commit()
        self.db.refresh(db_item)
        
        # Return updated item with current price
        current_price_data = await self.stock_service.get_current_price(db_item.stock_symbol)
        
        return WatchlistItem(
            id=db_item.id,
            stock_symbol=db_item.stock_symbol,
            notes=db_item.notes,
            alert_price_target=db_item.alert_price_target,
            alert_percentage_change=db_item.alert_percentage_change,
            added_at=db_item.added_at,
            stock=db_item.stock,
            current_price=current_price_data.price if current_price_data else None,
            price_change=current_price_data.change if current_price_data else None,
            price_change_percent=current_price_data.change_percent if current_price_data else None
        )
    
    async def remove_item(self, user_id: int, symbol: str) -> bool:
        """Remove item from watchlist."""
        db_item = self.db.query(Watchlist).filter(
            Watchlist.user_id == user_id,
            Watchlist.stock_symbol == symbol.upper()
        ).first()
        
        if not db_item:
            return False
        
        self.db.delete(db_item)
        self.db.commit()
        return True
