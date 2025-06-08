from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import Portfolio, PortfolioItemCreate, PortfolioItemUpdate, PortfolioItem
from app.services.portfolio_service import PortfolioService

router = APIRouter()


@router.get("/", response_model=Portfolio)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Portfolio:
    """Get user's complete portfolio."""
    portfolio_service = PortfolioService(db)
    portfolio = await portfolio_service.get_user_portfolio(current_user.id)
    return portfolio


@router.post("/", response_model=PortfolioItem, status_code=status.HTTP_201_CREATED)
async def add_to_portfolio(
    item_data: PortfolioItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PortfolioItem:
    """Add a stock to user's portfolio."""
    portfolio_service = PortfolioService(db)
    
    try:
        item = await portfolio_service.add_item(current_user.id, item_data)
        return item
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{item_id}", response_model=PortfolioItem)
async def update_portfolio_item(
    item_id: int,
    item_data: PortfolioItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PortfolioItem:
    """Update a portfolio item."""
    portfolio_service = PortfolioService(db)
    
    item = await portfolio_service.update_item(current_user.id, item_id, item_data)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio item not found"
        )
    
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_portfolio(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a stock from user's portfolio."""
    portfolio_service = PortfolioService(db)
    
    success = await portfolio_service.remove_item(current_user.id, item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio item not found"
        )


@router.post("/optimize")
async def optimize_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio optimization recommendations."""
    portfolio_service = PortfolioService(db)
    
    try:
        optimization = await portfolio_service.optimize_portfolio(current_user.id)
        return optimization
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Portfolio optimization failed"
        )
