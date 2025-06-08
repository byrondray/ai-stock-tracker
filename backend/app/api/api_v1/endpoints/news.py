from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime, timedelta
import asyncio
import yfinance as yf
import logging

from app.services.news_service import NewsService

router = APIRouter()
logger = logging.getLogger(__name__)



@router.get("/")
async def get_general_news(
    limit: int = Query(default=50, le=100, description="Number of news items"),
):
    """Get general market news."""
    try:
        news_items = await NewsService.get_market_news(limit=limit, force_refresh=True)
        return {
            "news_items": [item.model_dump() for item in news_items],
            "total_count": len(news_items),
            "overall_sentiment": sum(getattr(item, 'sentiment_score', 0) or 0 for item in news_items) / len(news_items) if news_items else 0
        }
    except Exception as e:
        logger.error(f"Error fetching general news: {str(e)}")
        # Return empty news instead of fake content
        return {
            "news_items": [],
            "total_count": 0,
            "overall_sentiment": 0.0,
            "error": "News service temporarily unavailable"
        }


@router.get("/{symbol}")
async def get_stock_news(
    symbol: str,
    limit: int = Query(default=20, le=100, description="Number of news items"),
):
    """Get news and sentiment analysis for a stock."""
    try:
        news_items = await NewsService.get_stock_news(symbol.upper(), limit)
        return {
            "symbol": symbol.upper(),
            "news_items": [item.model_dump() for item in news_items],
            "total_count": len(news_items),
            "overall_sentiment": sum(getattr(item, 'sentiment_score', 0) or 0 for item in news_items) / len(news_items) if news_items else 0
        }
    except Exception as e:
        logger.error(f"Error fetching stock news for {symbol}: {str(e)}")
        # Return empty news instead of fake content
        return {
            "symbol": symbol.upper(),
            "news_items": [],
            "total_count": 0,
            "overall_sentiment": 0.0,
            "error": "News service temporarily unavailable"
        }


@router.get("/market/general")
async def get_market_news(
    limit: int = Query(default=50, le=100, description="Number of news items"),
):
    """Get general market news."""
    try:
        news_items = await NewsService.get_market_news(limit)
        return {
            "news_items": [item.model_dump() for item in news_items],
            "total_count": len(news_items),
            "overall_sentiment": sum(getattr(item, 'sentiment_score', 0) or 0 for item in news_items) / len(news_items) if news_items else 0
        }
    except Exception as e:
        logger.error(f"Error fetching market news: {str(e)}")
        # Return fallback news
        return {
            "news_items": [
                {
                    "title": "Market Analysis Available",
                    "summary": "Get the latest market insights and stock analysis.",
                    "url": "",
                    "source": "AI Stock Analyzer",
                    "published_at": datetime.utcnow().isoformat(),
                    "sentiment": "neutral",
                    "sentiment_score": 0.0,
                    "relevance_score": 0.5,
                    "tags": ["market", "analysis"]
                }
            ],
            "total_count": 1,
            "overall_sentiment": 0.0
        }
