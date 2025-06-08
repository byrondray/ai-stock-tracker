from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import numpy as np
import logging

from app.models import Portfolio as PortfolioModel, Stock
from app.schemas import Portfolio, PortfolioItem, PortfolioItemCreate, PortfolioItemUpdate
from app.services.stock_service import StockService

logger = logging.getLogger(__name__)


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
        
        # Calculate proper risk score based on portfolio metrics
        risk_score = await self._calculate_portfolio_risk(portfolio, sector_allocation)
        
        return {
            "current_allocation": sector_allocation,
            "risk_score": risk_score,
            "recommendations": recommendations,
            "rebalancing_suggestions": []  # Would contain specific buy/sell suggestions
        }
    
    async def _calculate_portfolio_risk(self, portfolio: Portfolio, sector_allocation: dict) -> float:
        """Calculate portfolio risk score based on real metrics"""
        try:
            risk_factors = []
            
            # Diversification risk (0-40 points)
            num_sectors = len(sector_allocation)
            if num_sectors <= 1:
                diversification_risk = 40
            elif num_sectors == 2:
                diversification_risk = 30
            elif num_sectors == 3:
                diversification_risk = 20
            elif num_sectors == 4:
                diversification_risk = 10
            else:
                diversification_risk = 0
            risk_factors.append(diversification_risk)
            
            # Concentration risk (0-30 points)
            max_sector_exposure = max(sector_allocation.values()) if sector_allocation else 100
            if max_sector_exposure > 50:
                concentration_risk = 30
            elif max_sector_exposure > 40:
                concentration_risk = 20
            elif max_sector_exposure > 30:
                concentration_risk = 10
            else:
                concentration_risk = 0
            risk_factors.append(concentration_risk)
            
            # Portfolio size risk (0-20 points)
            num_holdings = len(portfolio.items)
            if num_holdings <= 2:
                size_risk = 20
            elif num_holdings <= 5:
                size_risk = 15
            elif num_holdings <= 10:
                size_risk = 5
            else:
                size_risk = 0
            risk_factors.append(size_risk)
            
            # Volatility risk (0-10 points) - based on return percentage spread
            if portfolio.items:
                returns = [item.return_percentage for item in portfolio.items]
                volatility = np.std(returns) if len(returns) > 1 else 0
                if volatility > 50:
                    volatility_risk = 10
                elif volatility > 30:
                    volatility_risk = 7
                elif volatility > 15:
                    volatility_risk = 3
                else:
                    volatility_risk = 0
                risk_factors.append(volatility_risk)
            
            total_risk = sum(risk_factors)
            return min(100, max(0, total_risk))
            
        except Exception as e:
            logger.error(f"Error calculating portfolio risk: {str(e)}")
            return 50  # Default moderate risk
