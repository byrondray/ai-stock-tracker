from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, stocks, portfolio, watchlist, predictions, news

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
