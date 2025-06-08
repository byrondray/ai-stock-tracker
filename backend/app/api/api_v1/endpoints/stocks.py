from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import Stock, StockAnalysisResponse, SearchResponse
from app.services.stock_service import StockService
from app.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)

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
    """Get detailed stock information with current price."""
    logger.info(f"=== GET STOCK ENDPOINT CALLED FOR {symbol} ===")
    stock_service = StockService(db)
    
    # Get stock from database
    stock = await stock_service.get_by_symbol(symbol.upper())
    
    if not stock:
        # If not in database, try to create it from external API
        stock = await stock_service.update_stock_info(symbol.upper())
        if not stock:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock with symbol {symbol} not found"
            )
    
    # Get current price data and enrich the response
    try:
        logger.info(f"Fetching price data for {symbol}")
        price_data = await stock_service.get_current_price(symbol.upper())
        logger.info(f"Price data for {symbol}: {price_data}")
        if price_data:
            # Return enriched stock data as dict to include price info
            return {
                'symbol': stock.symbol,
                'name': stock.name,
                'current_price': float(price_data.price),
                'change_amount': float(price_data.change),
                'change_percent': float(price_data.change_percent),
                'sector': stock.sector,
                'industry': stock.industry,
                'market_cap': stock.market_cap,
                'currency': stock.currency,
                'exchange': stock.exchange,
                'country': stock.country,
                'website': stock.website,
                'description': stock.description,
                'employees': stock.employees,
                'founded_year': stock.founded_year,
                'last_updated': stock.last_updated.isoformat() if stock.last_updated else datetime.utcnow().isoformat(),
                'open_price': None,
                'high_price': None,
                'low_price': None,
                'volume': price_data.volume,
            }
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {str(e)}")
    
    # Return basic stock info if price fetch fails
    return {
        'symbol': stock.symbol,
        'name': stock.name,
        'current_price': None,
        'change_amount': None,
        'change_percent': None,
        'sector': stock.sector,
        'industry': stock.industry,
        'market_cap': stock.market_cap,
        'currency': stock.currency,
        'exchange': stock.exchange,
        'country': stock.country,
        'website': stock.website,
        'description': stock.description,
        'employees': stock.employees,
        'founded_year': stock.founded_year,
        'last_updated': stock.last_updated.isoformat() if stock.last_updated else datetime.utcnow().isoformat(),
        'open_price': None,
        'high_price': None,
        'low_price': None,
        'volume': None,
    }


@router.get("/{symbol}/analysis", response_model=StockAnalysisResponse)
async def get_stock_analysis(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockAnalysisResponse:
    """Get AI-powered analysis for a stock."""
    try:
        analysis = await AnalysisService.get_stock_analysis(db, symbol.upper())
        if not analysis:
            # Return a default analysis instead of 404
            logger.info(f"No analysis available for {symbol}, returning default")
            return StockAnalysisResponse(
                symbol=symbol.upper(),
                fundamental_score=0.5,
                technical_score=0.5,
                sentiment_score=0.5,
                overall_rating="hold",
                risk_score=0.5,
                analysis_date=datetime.utcnow().isoformat()
            )
        return analysis
    except Exception as e:
        logger.error(f"Analysis error for {symbol}: {str(e)}")
        # Return cached or partial analysis on error
        logger.warning(f"Returning minimal analysis for {symbol} due to error")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Analysis service temporarily unavailable for {symbol}"
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
    logger.info(f"📊 Price history request: symbol={symbol}, days={days}")
    
    stock_service = StockService(db)
    history = await stock_service.get_price_history(symbol.upper(), days)
    
    logger.info(f"📊 Price history response: symbol={symbol}, records={len(history)}")
    
    if history:
        # Log sample data for debugging
        sample_data = history[:3] if len(history) >= 3 else history
        logger.info(f"📊 Sample data: {sample_data}")
    
    return {
        "symbol": symbol.upper(),
        "days": days,
        "data": history
    }

@router.get("/{symbol}/test")
async def test_endpoint(symbol: str):
    """Test endpoint to verify our code is running."""
    return {"test": "working", "symbol": symbol, "timestamp": datetime.utcnow().isoformat()}
