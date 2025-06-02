from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import WatchlistItem, WatchlistItemCreate, WatchlistItemUpdate
from app.services.watchlist_service import WatchlistService

router = APIRouter()


@router.get("/", response_model=List[WatchlistItem])
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[WatchlistItem]:
    """Get user's watchlist."""
    watchlist_service = WatchlistService(db)
    watchlist = await watchlist_service.get_user_watchlist(current_user.id)
    return watchlist


@router.post("/", response_model=WatchlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    item_data: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> WatchlistItem:
    """Add a stock to user's watchlist."""
    watchlist_service = WatchlistService(db)
    
    # Check if already in watchlist
    existing = await watchlist_service.get_watchlist_item(
        current_user.id, 
        item_data.stock_symbol
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock already in watchlist"
        )
    
    try:
        item = await watchlist_service.add_item(current_user.id, item_data)
        return item
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{item_id}", response_model=WatchlistItem)
async def update_watchlist_item(
    item_id: int,
    item_data: WatchlistItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> WatchlistItem:
    """Update a watchlist item."""
    watchlist_service = WatchlistService(db)
    
    item = await watchlist_service.update_item(current_user.id, item_id, item_data)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )
    
    return item


@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a stock from user's watchlist."""
    watchlist_service = WatchlistService(db)
    
    success = await watchlist_service.remove_item(current_user.id, symbol.upper())
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found in watchlist"
        )
