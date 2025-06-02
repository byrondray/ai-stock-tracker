from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import Stock, StockAnalysisResponse, SearchResponse
from app.services.stock_service import StockService
from app.services.analysis_service import AnalysisService

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search_stocks(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(default=10, le=50, description="Number of results to return"),
    db: Session = Depends(get_db)
) -> SearchResponse:
    """Search for stocks by symbol or name."""
    stock_service = StockService(db)
    results = await stock_service.search(q, limit)
    
    return SearchResponse(
        query=q,
        results=results,
        total_count=len(results)
    )


@router.get("/{symbol}", response_model=Stock)
async def get_stock(
    symbol: str,
    db: Session = Depends(get_db)
) -> Stock:
    """Get detailed stock information."""
    stock_service = StockService(db)
    stock = await stock_service.get_by_symbol(symbol.upper())
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with symbol {symbol} not found"
        )
    
    return stock


@router.get("/{symbol}/analysis", response_model=StockAnalysisResponse)
async def get_stock_analysis(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockAnalysisResponse:
    """Get AI-powered analysis for a stock."""
    analysis_service = AnalysisService(db)
    
    try:
        analysis = await analysis_service.analyze_stock(symbol.upper())
        return analysis
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed"
        )


@router.get("/{symbol}/price")
async def get_stock_price(
    symbol: str,
    db: Session = Depends(get_db)
):
    """Get current stock price."""
    stock_service = StockService(db)
    price_data = await stock_service.get_current_price(symbol.upper())
    
    if not price_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Price data for {symbol} not found"
        )
    
    return price_data


@router.get("/{symbol}/history")
async def get_price_history(
    symbol: str,
    days: int = Query(default=30, ge=1, le=365, description="Number of days of history"),
    db: Session = Depends(get_db)
):
    """Get historical price data."""
    stock_service = StockService(db)
    history = await stock_service.get_price_history(symbol.upper(), days)
    
    return {
        "symbol": symbol.upper(),
        "days": days,
        "data": history
    }
