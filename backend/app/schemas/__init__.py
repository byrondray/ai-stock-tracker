from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RiskProfile(str, Enum):
    """User risk profile options."""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


# User schemas
class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    risk_profile: RiskProfile = RiskProfile.MODERATE


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('passwords do not match')
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    risk_profile: Optional[RiskProfile] = None


class UserInDB(UserBase):
    """Schema for user in database."""
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class User(UserInDB):
    """Public user schema."""
    pass


# Stock schemas
class StockBase(BaseModel):
    """Base stock schema."""
    symbol: str = Field(..., min_length=1, max_length=10)
    name: str = Field(..., min_length=1, max_length=255)
    sector: Optional[str] = Field(None, max_length=100)
    industry: Optional[str] = Field(None, max_length=150)
    market_cap: Optional[int] = None
    currency: str = Field(default="USD", max_length=3)
    exchange: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=50)


class StockCreate(StockBase):
    """Schema for creating a stock."""
    pass


class StockUpdate(BaseModel):
    """Schema for updating a stock."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sector: Optional[str] = Field(None, max_length=100)
    industry: Optional[str] = Field(None, max_length=150)
    market_cap: Optional[int] = None
    current_price: Optional[float] = None


class Stock(StockBase):
    """Public stock schema."""
    current_price: Optional[float] = None
    website: Optional[str] = None
    description: Optional[str] = None
    employees: Optional[int] = None
    founded_year: Optional[int] = None
    last_updated: datetime
    
    class Config:
        from_attributes = True


# Price schemas
class PriceData(BaseModel):
    """Price data schema."""
    date: datetime
    open_price: float = Field(..., gt=0)
    high_price: float = Field(..., gt=0)
    low_price: float = Field(..., gt=0)
    close_price: float = Field(..., gt=0)
    volume: Optional[int] = Field(None, ge=0)
    adjusted_close: Optional[float] = Field(None, gt=0)


class StockPrice(BaseModel):
    """Current stock price schema."""
    symbol: str
    price: float = Field(..., gt=0)
    change: float
    change_percent: float
    volume: Optional[int] = None
    last_updated: datetime


# Prediction schemas
class PredictionRequest(BaseModel):
    """Request schema for stock predictions."""
    symbol: str = Field(..., min_length=1, max_length=10)
    days: int = Field(default=7, ge=1, le=365)
    include_confidence_bands: bool = True
    model_type: Optional[str] = Field(None, pattern="^(lstm|random_forest|ensemble)$")


class PredictionPoint(BaseModel):
    """Single prediction point schema."""
    date: datetime
    predicted_price: float = Field(..., gt=0)
    confidence: float = Field(..., ge=0, le=1)
    lower_bound: Optional[float] = Field(None, gt=0)
    upper_bound: Optional[float] = Field(None, gt=0)


class PredictionCreate(BaseModel):
    """Schema for creating predictions."""
    symbol: str = Field(..., min_length=1, max_length=10)
    predictions: List[PredictionPoint]
    model_version: str
    model_type: str


class PredictionResponse(BaseModel):
    """Prediction response schema."""
    symbol: str
    predictions: List[PredictionPoint]
    model_version: str
    model_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class StockPrediction(BaseModel):
    """Stock prediction response schema."""
    symbol: str
    predictions: List[PredictionPoint]
    model_version: str
    model_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Analysis schemas
class TechnicalIndicators(BaseModel):
    """Technical indicators schema."""
    rsi: Optional[float] = Field(None, ge=0, le=100)
    macd: Optional[float] = None
    bollinger_bands: Optional[dict] = None
    moving_averages: Optional[dict] = None
    support_resistance: Optional[dict] = None


class FundamentalMetrics(BaseModel):
    """Fundamental metrics schema."""
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    roe: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None


class SentimentData(BaseModel):
    """Sentiment analysis schema."""
    overall_sentiment: float = Field(..., ge=-1, le=1)
    news_sentiment: float = Field(..., ge=-1, le=1)
    social_sentiment: Optional[float] = Field(None, ge=-1, le=1)
    analyst_sentiment: Optional[str] = None


class StockAnalysisCreate(BaseModel):
    """Schema for creating stock analysis."""
    symbol: str = Field(..., min_length=1, max_length=10)
    fundamental_score: float = Field(..., ge=0, le=100)
    technical_score: float = Field(..., ge=0, le=100)
    sentiment_score: float = Field(..., ge=-1, le=1)
    overall_rating: str = Field(..., pattern="^(strong_buy|buy|hold|sell|strong_sell)$")
    risk_score: float = Field(..., ge=0, le=100)
    analyst_consensus: Optional[str] = None


class StockAnalysisResponse(BaseModel):
    """Stock analysis response schema."""
    symbol: str
    fundamental_score: float = Field(..., ge=0, le=100)
    technical_score: float = Field(..., ge=0, le=100)
    sentiment_score: float = Field(..., ge=-1, le=1)
    overall_rating: str = Field(..., pattern="^(strong_buy|buy|hold|sell|strong_sell)$")
    risk_score: float = Field(..., ge=0, le=100)
    
    # Detailed data
    technical_indicators: Optional[TechnicalIndicators] = None
    fundamental_metrics: Optional[FundamentalMetrics] = None
    sentiment_data: Optional[SentimentData] = None
    
    # Metadata
    analysis_date: datetime
    analyst_consensus: Optional[str] = None
    
    class Config:
        from_attributes = True


# Portfolio schemas
class PortfolioItemBase(BaseModel):
    """Base portfolio item schema."""
    stock_symbol: str = Field(..., min_length=1, max_length=10)
    quantity: float = Field(..., gt=0)
    average_cost: float = Field(..., gt=0)
    purchase_date: datetime


class PortfolioItemCreate(PortfolioItemBase):
    """Schema for creating a portfolio item."""
    notes: Optional[str] = None


class PortfolioItemUpdate(BaseModel):
    """Schema for updating a portfolio item."""
    quantity: Optional[float] = Field(None, gt=0)
    average_cost: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None


class PortfolioItem(PortfolioItemBase):
    """Portfolio item with calculations."""
    id: int
    notes: Optional[str] = None
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    total_return: Optional[float] = None
    return_percentage: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Stock information
    stock: Stock
    
    class Config:
        from_attributes = True


class Portfolio(BaseModel):
    """Complete portfolio schema."""
    items: List[PortfolioItem]
    total_value: float
    total_cost: float
    total_return: float
    return_percentage: float
    risk_score: Optional[float] = None


# Watchlist schemas
class WatchlistItemBase(BaseModel):
    """Base watchlist item schema."""
    stock_symbol: str = Field(..., min_length=1, max_length=10)


class WatchlistItemCreate(WatchlistItemBase):
    """Schema for creating a watchlist item."""
    notes: Optional[str] = None
    alert_price_target: Optional[float] = Field(None, gt=0)
    alert_percentage_change: Optional[float] = None


class WatchlistItemUpdate(BaseModel):
    """Schema for updating a watchlist item."""
    notes: Optional[str] = None
    alert_price_target: Optional[float] = Field(None, gt=0)
    alert_percentage_change: Optional[float] = None


class WatchlistItem(WatchlistItemBase):
    """Watchlist item with stock data."""
    id: int
    notes: Optional[str] = None
    alert_price_target: Optional[float] = None
    alert_percentage_change: Optional[float] = None
    added_at: datetime
    
    # Stock information
    stock: Stock
    current_price: Optional[float] = None
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


# Authentication schemas
class Token(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Token data schema."""
    email: Optional[str] = None
    user_id: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str


# Search schemas
class StockSearchResult(BaseModel):
    """Stock search result schema."""
    symbol: str
    name: str
    exchange: Optional[str] = None
    type: str = "stock"
    currency: Optional[str] = None


class SearchResponse(BaseModel):
    """Search response schema."""
    query: str
    results: List[StockSearchResult]
    total_count: int


# News schemas
class NewsItem(BaseModel):
    """News item schema."""
    title: str
    summary: Optional[str] = None
    url: str
    source: str
    published_at: datetime
    sentiment_score: Optional[float] = Field(None, ge=-1, le=1)
    relevance_score: Optional[float] = Field(None, ge=0, le=1)


class NewsResponse(BaseModel):
    """News response schema."""
    symbol: str
    news_items: List[NewsItem]
    overall_sentiment: Optional[float] = Field(None, ge=-1, le=1)
    total_count: int


# Error schemas
class ErrorDetail(BaseModel):
    """Error detail schema."""
    message: str
    code: Optional[str] = None
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    details: Optional[List[ErrorDetail]] = None
    timestamp: datetime
