from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import NewsResponse
from app.services.news_service import NewsService

router = APIRouter()


@router.get("/{symbol}", response_model=NewsResponse)
async def get_stock_news(
    symbol: str,
    limit: int = Query(default=20, le=100, description="Number of news items"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> NewsResponse:
    """Get news and sentiment analysis for a stock."""
    news_service = NewsService(db)
    
    try:
        news_data = await news_service.get_stock_news(symbol.upper(), limit)
        return news_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch news data"
        )


@router.get("/market/general")
async def get_market_news(
    limit: int = Query(default=50, le=100, description="Number of news items"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get general market news."""
    news_service = NewsService(db)
    
    try:
        news_data = await news_service.get_market_news(limit)
        return news_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch market news"
        )
