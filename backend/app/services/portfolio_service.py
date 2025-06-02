from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.models import Portfolio as PortfolioModel, Stock
from app.schemas import Portfolio, PortfolioItem, PortfolioItemCreate, PortfolioItemUpdate
from app.services.stock_service import StockService


class PortfolioService:
    """Service for portfolio operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.stock_service = StockService(db)
    
    async def get_user_portfolio(self, user_id: int) -> Portfolio:
        """Get user's complete portfolio with calculations."""
        portfolio_items = self.db.query(PortfolioModel).filter(
            PortfolioModel.user_id == user_id
        ).all()
        
        items = []
        total_value = 0.0
        total_cost = 0.0
        
        for item in portfolio_items:
            # Get current price
            current_price_data = await self.stock_service.get_current_price(item.stock_symbol)
            current_price = current_price_data.price if current_price_data else item.average_cost
            
            # Calculate values
            current_value = item.quantity * current_price
            cost_basis = item.quantity * item.average_cost
            total_return = current_value - cost_basis
            return_percentage = (total_return / cost_basis) * 100 if cost_basis > 0 else 0
            
            portfolio_item = PortfolioItem(
                id=item.id,
                stock_symbol=item.stock_symbol,
                quantity=item.quantity,
                average_cost=item.average_cost,
                purchase_date=item.purchase_date,
                notes=item.notes,
                current_price=current_price,
                current_value=current_value,
                total_return=total_return,
                return_percentage=return_percentage,
                created_at=item.created_at,
                updated_at=item.updated_at,
                stock=item.stock
            )
            
            items.append(portfolio_item)
            total_value += current_value
            total_cost += cost_basis
        
        total_portfolio_return = total_value - total_cost
        total_return_percentage = (total_portfolio_return / total_cost) * 100 if total_cost > 0 else 0
        
        return Portfolio(
            items=items,
            total_value=total_value,
            total_cost=total_cost,
            total_return=total_portfolio_return,
            return_percentage=total_return_percentage
        )
    
    async def add_item(self, user_id: int, item_data: PortfolioItemCreate) -> PortfolioItem:
        """Add item to portfolio."""
        # Ensure stock exists
        stock = await self.stock_service.get_by_symbol(item_data.stock_symbol)
        if not stock:
            # Try to fetch and create stock info
            stock = await self.stock_service.update_stock_info(item_data.stock_symbol)
            if not stock:
                raise ValueError(f"Stock {item_data.stock_symbol} not found")
        
        # Create portfolio item
        db_item = PortfolioModel(
            user_id=user_id,
            stock_symbol=item_data.stock_symbol.upper(),
            quantity=item_data.quantity,
            average_cost=item_data.average_cost,
            purchase_date=item_data.purchase_date,
            notes=item_data.notes
        )
        
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        
        # Return with calculations
        current_price_data = await self.stock_service.get_current_price(item_data.stock_symbol)
        current_price = current_price_data.price if current_price_data else item_data.average_cost
        
        current_value = db_item.quantity * current_price
        cost_basis = db_item.quantity * db_item.average_cost
        total_return = current_value - cost_basis
        return_percentage = (total_return / cost_basis) * 100 if cost_basis > 0 else 0
        
        return PortfolioItem(
            id=db_item.id,
            stock_symbol=db_item.stock_symbol,
            quantity=db_item.quantity,
            average_cost=db_item.average_cost,
            purchase_date=db_item.purchase_date,
            notes=db_item.notes,
            current_price=current_price,
            current_value=current_value,
            total_return=total_return,
            return_percentage=return_percentage,
            created_at=db_item.created_at,
            updated_at=db_item.updated_at,
            stock=stock
        )
    
    async def update_item(self, user_id: int, item_id: int, item_data: PortfolioItemUpdate) -> Optional[PortfolioItem]:
        """Update portfolio item."""
        db_item = self.db.query(PortfolioModel).filter(
            PortfolioModel.id == item_id,
            PortfolioModel.user_id == user_id
        ).first()
        
        if not db_item:
            return None
        
        update_data = item_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)
        
        self.db.commit()
        self.db.refresh(db_item)
        
        # Return updated item with calculations
        current_price_data = await self.stock_service.get_current_price(db_item.stock_symbol)
        current_price = current_price_data.price if current_price_data else db_item.average_cost
        
        current_value = db_item.quantity * current_price
        cost_basis = db_item.quantity * db_item.average_cost
        total_return = current_value - cost_basis
        return_percentage = (total_return / cost_basis) * 100 if cost_basis > 0 else 0
        
        return PortfolioItem(
            id=db_item.id,
            stock_symbol=db_item.stock_symbol,
            quantity=db_item.quantity,
            average_cost=db_item.average_cost,
            purchase_date=db_item.purchase_date,
            notes=db_item.notes,
            current_price=current_price,
            current_value=current_value,
            total_return=total_return,
            return_percentage=return_percentage,
            created_at=db_item.created_at,
            updated_at=db_item.updated_at,
            stock=db_item.stock
        )
    
    async def remove_item(self, user_id: int, item_id: int) -> bool:
        """Remove item from portfolio."""
        db_item = self.db.query(PortfolioModel).filter(
            PortfolioModel.id == item_id,
            PortfolioModel.user_id == user_id
        ).first()
        
        if not db_item:
            return False
        
        self.db.delete(db_item)
        self.db.commit()
        return True
    
    async def optimize_portfolio(self, user_id: int) -> dict:
        """Get portfolio optimization recommendations."""
        # Placeholder for portfolio optimization logic
        # This would integrate with ML models for optimization
        portfolio = await self.get_user_portfolio(user_id)
        
        # Simple risk assessment based on sector diversification
        sectors = {}
        for item in portfolio.items:
            sector = item.stock.sector or "Unknown"
            sectors[sector] = sectors.get(sector, 0) + item.current_value
        
        total_value = portfolio.total_value
        sector_allocation = {
            sector: (value / total_value) * 100 
            for sector, value in sectors.items()
        } if total_value > 0 else {}
        
        # Simple recommendations
        recommendations = []
        for sector, percentage in sector_allocation.items():
            if percentage > 40:
                recommendations.append(f"Consider reducing exposure to {sector} sector ({percentage:.1f}%)")
        
        if len(sectors) < 3:
            recommendations.append("Consider diversifying across more sectors")
        
        return {
            "current_allocation": sector_allocation,
            "risk_score": min(100, max(0, 50 + (len(sectors) - 5) * 10)),  # Simple risk calculation
            "recommendations": recommendations,
            "rebalancing_suggestions": []  # Would contain specific buy/sell suggestions
        }
