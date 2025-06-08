"""
Stock Analysis Service

Provides comprehensive stock analysis including fundamental, technical, and sentiment analysis.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pytz
import yfinance as yf
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select
import asyncio
import logging
import json
from .fmp_service import FMPService

from ..models import Stock, StockAnalysis
from ..schemas import StockAnalysisCreate, StockAnalysisResponse
from ..core.redis_client import redis_client

logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for performing comprehensive stock analysis"""
    
    @staticmethod
    async def get_stock_analysis(
        db: Session,
        symbol: str,
        force_refresh: bool = False
    ) -> Optional[StockAnalysisResponse]:
        """Get comprehensive stock analysis"""
        try:
            # Check cache first
            cache_key = f"analysis:{symbol}"
            if not force_refresh:
                cached_analysis = await redis_client.get(cache_key)
                if cached_analysis:
                    # Redis client returns a dict, so use model_validate instead of model_validate_json
                    if isinstance(cached_analysis, dict):
                        return StockAnalysisResponse.model_validate(cached_analysis)
                    else:
                        return StockAnalysisResponse.model_validate_json(cached_analysis)
            
            # Get existing analysis from database
            existing_analysis = db.query(StockAnalysis)\
                .filter(StockAnalysis.stock_symbol == symbol)\
                .order_by(StockAnalysis.created_at.desc())\
                .first()
            
            # Check if we need to refresh (older than 1 hour) 
            # Handle timezone-aware datetime comparison
            cutoff_time = datetime.utcnow()
            if existing_analysis and existing_analysis.created_at:
                # Ensure both datetimes are timezone-aware for comparison
                existing_time = existing_analysis.created_at
                if existing_time.tzinfo is None:
                    existing_time = pytz.UTC.localize(existing_time)
                
                current_time = cutoff_time
                if current_time.tzinfo is None:
                    current_time = pytz.UTC.localize(current_time)
                
                time_diff = current_time - existing_time
                is_recent = time_diff < timedelta(hours=1)
            else:
                is_recent = False
            
            if (existing_analysis and not force_refresh and is_recent):
                analysis_response = StockAnalysisResponse(
                    symbol=existing_analysis.stock_symbol,
                    fundamental_score=existing_analysis.fundamental_score,
                    technical_score=existing_analysis.technical_score,
                    sentiment_score=existing_analysis.sentiment_score,
                    overall_rating=existing_analysis.overall_rating,
                    risk_score=existing_analysis.risk_score or 50,
                    analysis_date=existing_analysis.analysis_date,
                    analyst_consensus=existing_analysis.analyst_consensus
                )
                await redis_client.setex(cache_key, 3600, analysis_response.model_dump_json())
                return analysis_response
            
            # Perform new analysis
            analysis_data = await AnalysisService._perform_comprehensive_analysis(symbol)
            if not analysis_data:
                return None
            
            # Save to database
            analysis = StockAnalysis(
                stock_symbol=symbol,
                **analysis_data
            )
            db.add(analysis)
            db.commit()
            db.refresh(analysis)
            
            # Cache the result
            analysis_response = StockAnalysisResponse(
                symbol=analysis.stock_symbol,
                fundamental_score=analysis.fundamental_score,
                technical_score=analysis.technical_score,
                sentiment_score=analysis.sentiment_score,
                overall_rating=analysis.overall_rating,
                risk_score=analysis.risk_score or 50,
                analysis_date=analysis.analysis_date,
                analyst_consensus=analysis.analyst_consensus
            )
            await redis_client.setex(cache_key, 3600, analysis_response.model_dump_json())
            
            return analysis_response
            
        except Exception as e:
            logger.error(f"Error getting stock analysis for {symbol}: {str(e)}")
            return None
    
    @staticmethod
    async def _perform_comprehensive_analysis(symbol: str) -> Optional[Dict[str, Any]]:
        """Perform comprehensive analysis combining fundamental, technical, and sentiment"""
        try:
            # Get stock data
            ticker = yf.Ticker(symbol)
            
            # Run analysis tasks concurrently
            fundamental_task = AnalysisService._fundamental_analysis(ticker)
            technical_task = AnalysisService._technical_analysis(ticker)
            sentiment_task = AnalysisService._sentiment_analysis(symbol)
            
            fundamental, technical, sentiment = await asyncio.gather(
                fundamental_task, technical_task, sentiment_task,
                return_exceptions=True
            )
            
            # Handle any exceptions
            if isinstance(fundamental, Exception):
                logger.error(f"Fundamental analysis failed: {fundamental}")
                fundamental = {}
            if isinstance(technical, Exception):
                logger.error(f"Technical analysis failed: {technical}")
                technical = {}
            if isinstance(sentiment, Exception):
                logger.error(f"Sentiment analysis failed: {sentiment}")
                sentiment = {}
            
            # Calculate overall score and recommendation
            overall_score = AnalysisService._calculate_overall_score(
                fundamental, technical, sentiment
            )
            recommendation = AnalysisService._get_recommendation(overall_score)
            
            return {
                "fundamental_score": fundamental.get("score", 0),
                "technical_score": technical.get("score", 0),
                "sentiment_score": (sentiment.get("score", 50) - 50) / 50,  # Convert 0-100 to -1 to 1
                "overall_rating": recommendation,
                "risk_score": max(0, 100 - overall_score),  # Convert overall score to risk score (inverse)
                "key_metrics": json.dumps({"fundamental": fundamental, "technical": technical, "sentiment": sentiment}),
                "analysis_date": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error performing comprehensive analysis for {symbol}: {str(e)}")
            return None
    
    @staticmethod
    async def _fundamental_analysis(ticker) -> Dict[str, Any]:
        """Perform fundamental analysis using FMP for comprehensive data"""
        try:
            # Get symbol from ticker
            symbol = ticker.ticker
            
            # Initialize FMP service
            fmp_service = FMPService()
            
            # Try to get comprehensive fundamentals from FMP first
            fmp_fundamentals = await fmp_service.get_company_fundamentals(symbol)
            
            if fmp_fundamentals:
                logger.info(f"✅ Using FMP fundamentals for {symbol}")
                analysis = {
                    "pe_ratio": fmp_fundamentals.get("pe_ratio", 0) or 0,
                    "pb_ratio": fmp_fundamentals.get("price_to_book", 0) or 0,
                    "roe": fmp_fundamentals.get("roe", 0) or 0,
                    "debt_to_equity": fmp_fundamentals.get("debt_to_equity", 0) or 0,
                    "current_ratio": fmp_fundamentals.get("current_ratio", 0) or 0,
                    "revenue_growth": fmp_fundamentals.get("revenue_growth", 0) or 0,
                    "profit_margin": fmp_fundamentals.get("profit_margin", 0) or 0,
                    "market_cap": fmp_fundamentals.get("market_cap", 0) or 0,
                    "beta": fmp_fundamentals.get("beta", 1.0) or 1.0,
                    "dividend_yield": fmp_fundamentals.get("dividend_yield", 0) or 0,
                    "sector": fmp_fundamentals.get("sector", ""),
                    "industry": fmp_fundamentals.get("industry", ""),
                }
            else:
                # Fallback to yfinance if FMP unavailable
                logger.info(f"Falling back to yfinance fundamentals for {symbol}")
                info = ticker.info
                
                analysis = {
                    "pe_ratio": info.get("trailingPE", 0) or 0,
                    "pb_ratio": info.get("priceToBook", 0) or 0,
                    "roe": info.get("returnOnEquity", 0) or 0,
                    "debt_to_equity": info.get("debtToEquity", 0) or 0,
                    "current_ratio": info.get("currentRatio", 0) or 0,
                    "revenue_growth": info.get("revenueGrowth", 0) or 0,
                    "profit_margin": info.get("profitMargins", 0) or 0,
                    "eps_growth": info.get("earningsGrowth", 0) or 0,
                    "dividend_yield": info.get("dividendYield", 0) or 0,
                    "market_cap": info.get("marketCap", 0) or 0,
                    "enterprise_value": info.get("enterpriseValue", 0) or 0,
                }
            
            # Calculate fundamental score (0-100)
            score = AnalysisService._calculate_fundamental_score(analysis)
            analysis["score"] = score
            
            return analysis
            
        except Exception as e:
            logger.error(f"Fundamental analysis error: {str(e)}")
            return {"score": 0}
    
    @staticmethod
    async def _technical_analysis(ticker) -> Dict[str, Any]:
        """Perform technical analysis"""
        try:
            # Get historical data
            hist = ticker.history(period="6mo")
            if hist.empty:
                return {"score": 0}
            
            # Calculate technical indicators
            analysis = {}
            
            # Moving averages
            hist["MA20"] = hist["Close"].rolling(window=20).mean()
            hist["MA50"] = hist["Close"].rolling(window=50).mean()
            
            current_price = hist["Close"].iloc[-1]
            ma20 = hist["MA20"].iloc[-1]
            ma50 = hist["MA50"].iloc[-1]
            
            analysis["current_price"] = current_price
            analysis["ma20"] = ma20
            analysis["ma50"] = ma50
            analysis["price_vs_ma20"] = ((current_price - ma20) / ma20) * 100
            analysis["price_vs_ma50"] = ((current_price - ma50) / ma50) * 100
            
            # RSI calculation
            delta = hist["Close"].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            analysis["rsi"] = rsi.iloc[-1] if not rsi.empty else 50
            
            # Volume analysis
            avg_volume = hist["Volume"].rolling(window=20).mean().iloc[-1]
            current_volume = hist["Volume"].iloc[-1]
            analysis["volume_ratio"] = current_volume / avg_volume if avg_volume > 0 else 1
            
            # Price momentum
            analysis["momentum_5d"] = ((current_price - hist["Close"].iloc[-6]) / hist["Close"].iloc[-6]) * 100
            analysis["momentum_20d"] = ((current_price - hist["Close"].iloc[-21]) / hist["Close"].iloc[-21]) * 100
            
            # Volatility
            analysis["volatility"] = hist["Close"].pct_change().std() * np.sqrt(252) * 100
            
            # Calculate technical score
            score = AnalysisService._calculate_technical_score(analysis)
            analysis["score"] = score
            
            return analysis
            
        except Exception as e:
            logger.error(f"Technical analysis error: {str(e)}")
            return {"score": 0}
    
    @staticmethod
    async def _sentiment_analysis(symbol: str) -> Dict[str, Any]:
        """Perform sentiment analysis based on news and social media"""
        try:
            # This is a simplified sentiment analysis
            # In production, you'd integrate with news APIs and sentiment analysis services
            
            # Get recent news for the symbol
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            if not news:
                return {"score": 50, "news_count": 0}
            
            # Simple sentiment scoring based on news count and recency
            recent_news = [n for n in news if n.get("providerPublishTime", 0) > (datetime.now().timestamp() - 86400 * 7)]
            
            # Basic sentiment heuristics
            positive_keywords = ["buy", "upgrade", "outperform", "strong", "growth", "beat", "exceed"]
            negative_keywords = ["sell", "downgrade", "underperform", "weak", "decline", "miss", "below"]
            
            sentiment_scores = []
            for article in recent_news[:10]:  # Analyze up to 10 recent articles
                title = article.get("title", "").lower()
                
                positive_count = sum(1 for word in positive_keywords if word in title)
                negative_count = sum(1 for word in negative_keywords if word in title)
                
                if positive_count > negative_count:
                    sentiment_scores.append(70)
                elif negative_count > positive_count:
                    sentiment_scores.append(30)
                else:
                    sentiment_scores.append(50)
            
            avg_sentiment = np.mean(sentiment_scores) if sentiment_scores else 50
            
            return {
                "score": avg_sentiment,
                "news_count": len(recent_news),
                "total_articles_analyzed": len(sentiment_scores),
                "sentiment_breakdown": {
                    "positive": sum(1 for s in sentiment_scores if s > 60),
                    "neutral": sum(1 for s in sentiment_scores if 40 <= s <= 60),
                    "negative": sum(1 for s in sentiment_scores if s < 40)
                }
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {str(e)}")
            return {"score": 50}
    
    @staticmethod
    def _calculate_fundamental_score(analysis: Dict[str, Any]) -> float:
        """Calculate fundamental analysis score (0-100)"""
        score = 50  # Start with neutral score
        
        # PE Ratio scoring
        pe_ratio = analysis.get("pe_ratio", 0)
        if 0 < pe_ratio < 15:
            score += 15
        elif 15 <= pe_ratio < 25:
            score += 10
        elif pe_ratio >= 25:
            score -= 10
        
        # ROE scoring
        roe = analysis.get("roe", 0)
        if roe > 0.15:
            score += 15
        elif roe > 0.1:
            score += 10
        elif roe < 0:
            score -= 15
        
        # Debt to Equity scoring
        debt_to_equity = analysis.get("debt_to_equity", 0)
        if debt_to_equity < 0.3:
            score += 10
        elif debt_to_equity > 1.0:
            score -= 10
        
        # Revenue Growth scoring
        revenue_growth = analysis.get("revenue_growth", 0)
        if revenue_growth > 0.1:
            score += 10
        elif revenue_growth < -0.1:
            score -= 10
        
        return max(0, min(100, score))
    
    @staticmethod
    def _calculate_technical_score(analysis: Dict[str, Any]) -> float:
        """Calculate technical analysis score (0-100)"""
        score = 50  # Start with neutral score
        
        # RSI scoring
        rsi = analysis.get("rsi", 50)
        if 30 <= rsi <= 70:
            score += 10
        elif rsi < 30:
            score += 15  # Oversold, potentially good buy
        elif rsi > 70:
            score -= 15  # Overbought, potentially sell
        
        # Moving average scoring
        price_vs_ma20 = analysis.get("price_vs_ma20", 0)
        if price_vs_ma20 > 0:
            score += 10
        else:
            score -= 5
        
        price_vs_ma50 = analysis.get("price_vs_ma50", 0)
        if price_vs_ma50 > 0:
            score += 10
        else:
            score -= 5
        
        # Momentum scoring
        momentum_20d = analysis.get("momentum_20d", 0)
        if momentum_20d > 5:
            score += 15
        elif momentum_20d < -5:
            score -= 15
        
        # Volume scoring
        volume_ratio = analysis.get("volume_ratio", 1)
        if volume_ratio > 1.5:
            score += 10  # High volume supports price movement
        
        return max(0, min(100, score))
    
    @staticmethod
    def _calculate_overall_score(
        fundamental: Dict[str, Any],
        technical: Dict[str, Any],
        sentiment: Dict[str, Any]
    ) -> float:
        """Calculate weighted overall score"""
        f_score = fundamental.get("score", 0)
        t_score = technical.get("score", 0)
        s_score = sentiment.get("score", 0)
        
        # Weighted average: 40% fundamental, 35% technical, 25% sentiment
        overall = (f_score * 0.4) + (t_score * 0.35) + (s_score * 0.25)
        return round(overall, 2)
    
    @staticmethod
    def _get_recommendation(score: float) -> str:
        """Get recommendation based on overall score"""
        if score >= 75:
            return "strong_buy"
        elif score >= 60:
            return "buy"
        elif score >= 40:
            return "hold"
        elif score >= 25:
            return "sell"
        else:
            return "strong_sell"
