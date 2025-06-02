from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, BigInteger, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum

from app.core.database import Base


class RiskProfile(str, Enum):
    """User risk profile options."""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class User(Base):
    """User model."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    risk_profile = Column(String(20), default=RiskProfile.MODERATE.value)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(email='{self.email}', username='{self.username}')>"


class Stock(Base):
    """Stock model."""
    __tablename__ = "stocks"
    
    symbol = Column(String(10), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sector = Column(String(100))
    industry = Column(String(150))
    market_cap = Column(BigInteger)
    current_price = Column(Float)
    currency = Column(String(3), default="USD")
    exchange = Column(String(50))
    country = Column(String(50))
    website = Column(String(255))
    description = Column(Text)
    employees = Column(Integer)
    founded_year = Column(Integer)
    is_active = Column(Boolean, default=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    watchlists = relationship("Watchlist", back_populates="stock")
    portfolios = relationship("Portfolio", back_populates="stock")
    predictions = relationship("Prediction", back_populates="stock")
    price_history = relationship("PriceHistory", back_populates="stock")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_stock_sector', 'sector'),
        Index('idx_stock_market_cap', 'market_cap'),
        Index('idx_stock_exchange', 'exchange'),
    )
    
    def __repr__(self):
        return f"<Stock(symbol='{self.symbol}', name='{self.name}')>"


class Watchlist(Base):
    """User watchlist model."""
    __tablename__ = "watchlists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_symbol = Column(String(10), ForeignKey("stocks.symbol"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)
    alert_price_target = Column(Float)
    alert_percentage_change = Column(Float)
    
    # Relationships
    user = relationship("User", back_populates="watchlists")
    stock = relationship("Stock", back_populates="watchlists")
    
    # Unique constraint
    __table_args__ = (
        Index('idx_user_stock_unique', 'user_id', 'stock_symbol', unique=True),
    )
    
    def __repr__(self):
        return f"<Watchlist(user_id={self.user_id}, stock_symbol='{self.stock_symbol}')>"


class Portfolio(Base):
    """User portfolio model."""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stock_symbol = Column(String(10), ForeignKey("stocks.symbol"), nullable=False)
    quantity = Column(Float, nullable=False)
    average_cost = Column(Float, nullable=False)
    purchase_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="portfolios")
    stock = relationship("Stock", back_populates="portfolios")
    
    # Indexes
    __table_args__ = (
        Index('idx_portfolio_user', 'user_id'),
        Index('idx_portfolio_stock', 'stock_symbol'),
    )
    
    def __repr__(self):
        return f"<Portfolio(user_id={self.user_id}, stock_symbol='{self.stock_symbol}', quantity={self.quantity})>"


class Prediction(Base):
    """Stock prediction model."""
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(10), ForeignKey("stocks.symbol"), nullable=False)
    prediction_date = Column(DateTime(timezone=True), nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=False)
    predicted_price = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    model_version = Column(String(50), nullable=False)
    model_type = Column(String(50), nullable=False)  # lstm, random_forest, ensemble
    features_used = Column(Text)  # JSON string of features
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    stock = relationship("Stock", back_populates="predictions")
    
    # Indexes
    __table_args__ = (
        Index('idx_prediction_stock_date', 'stock_symbol', 'prediction_date'),
        Index('idx_prediction_target_date', 'target_date'),
        Index('idx_prediction_model', 'model_type', 'model_version'),
    )
    
    def __repr__(self):
        return f"<Prediction(stock_symbol='{self.stock_symbol}', predicted_price={self.predicted_price})>"


class PriceHistory(Base):
    """Stock price history model."""
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(10), ForeignKey("stocks.symbol"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(BigInteger)
    adjusted_close = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    stock = relationship("Stock", back_populates="price_history")
    
    # Indexes
    __table_args__ = (
        Index('idx_price_history_stock_date', 'stock_symbol', 'date', unique=True),
        Index('idx_price_history_date', 'date'),
    )
    
    def __repr__(self):
        return f"<PriceHistory(stock_symbol='{self.stock_symbol}', date={self.date}, close_price={self.close_price})>"


class StockAnalysis(Base):
    """Stock analysis results model."""
    __tablename__ = "stock_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_symbol = Column(String(10), ForeignKey("stocks.symbol"), nullable=False)
    analysis_date = Column(DateTime(timezone=True), nullable=False)
    fundamental_score = Column(Float, nullable=False)  # 0-100
    technical_score = Column(Float, nullable=False)    # 0-100
    sentiment_score = Column(Float, nullable=False)    # -1.0 to 1.0
    overall_rating = Column(String(20), nullable=False)  # strong_buy, buy, hold, sell, strong_sell
    key_metrics = Column(Text)  # JSON string
    analyst_consensus = Column(String(20))
    risk_score = Column(Float)  # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    stock = relationship("Stock")
    
    # Indexes
    __table_args__ = (
        Index('idx_analysis_stock_date', 'stock_symbol', 'analysis_date'),
        Index('idx_analysis_rating', 'overall_rating'),
    )
    
    def __repr__(self):
        return f"<StockAnalysis(stock_symbol='{self.stock_symbol}', overall_rating='{self.overall_rating}')>"
