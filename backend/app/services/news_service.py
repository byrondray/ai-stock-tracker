"""
News Service

Provides financial news aggregation and analysis functionality.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import aiohttp
import asyncio
import yfinance as yf
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import re
from urllib.parse import quote

from ..schemas import NewsResponse, NewsItem
from ..core.redis_client import redis_client
from ..core.config import settings
from ..ml import SentimentAnalyzer

logger = logging.getLogger(__name__)


class NewsService:
    """Service for fetching and analyzing financial news"""
    
    # News API configuration
    NEWS_API_KEY = getattr(settings, 'NEWS_API_KEY', None)
    ALPHA_VANTAGE_KEY = getattr(settings, 'ALPHA_VANTAGE_API_KEY', None)
    
    # Initialize sentiment analyzer
    _sentiment_analyzer = None
    
    @classmethod
    def get_sentiment_analyzer(cls):
        """Get or create sentiment analyzer instance"""
        if cls._sentiment_analyzer is None:
            cls._sentiment_analyzer = SentimentAnalyzer()
        return cls._sentiment_analyzer
    
    @staticmethod
    async def get_stock_news(
        symbol: str,
        limit: int = 20,
        force_refresh: bool = False
    ) -> List[NewsItem]:
        """Get news for a specific stock"""
        try:
            # Check cache first
            cache_key = f"news:stock:{symbol}:{limit}"
            if not force_refresh:
                cached_news = await redis_client.get(cache_key)
                if cached_news:
                    import json
                    news_data = json.loads(cached_news)
                    return [NewsItem(**item) for item in news_data]
            
            # Fetch news from multiple sources
            news_sources = [
                NewsService._get_yfinance_news(symbol),
                NewsService._get_alpha_vantage_news(symbol) if NewsService.ALPHA_VANTAGE_KEY else asyncio.create_task(asyncio.sleep(0)),
                NewsService._get_news_api_news(symbol) if NewsService.NEWS_API_KEY else asyncio.create_task(asyncio.sleep(0))
            ]
            
            results = await asyncio.gather(*news_sources, return_exceptions=True)
            
            # Combine and deduplicate news
            all_news = []
            for result in results:
                if isinstance(result, list):
                    all_news.extend(result)
                elif isinstance(result, Exception):
                    logger.error(f"Error fetching news: {result}")
            
            # Remove duplicates and sort by date
            unique_news = NewsService._deduplicate_news(all_news)
            sorted_news = sorted(unique_news, key=lambda x: x.published_at, reverse=True)
            
            # Limit results
            limited_news = sorted_news[:limit]
            
            # Cache the results
            import json
            news_data = [news.model_dump() for news in limited_news]
            # Convert datetime objects to strings for JSON serialization
            serializable_data = []
            for item in news_data:
                if isinstance(item.get('published_at'), datetime):
                    item['published_at'] = item['published_at'].isoformat()
                serializable_data.append(item)
            await redis_client.setex(cache_key, 1800, json.dumps(serializable_data))  # Cache for 30 minutes
            
            return limited_news
            
        except Exception as e:
            logger.error(f"Error getting stock news for {symbol}: {str(e)}")
            return []
    
    @staticmethod
    async def get_market_news(
        category: str = "general",
        limit: int = 50,
        force_refresh: bool = False
    ) -> List[NewsItem]:
        """Get general market news"""
        try:
            # Check cache first
            cache_key = f"news:market:{category}:{limit}"
            if not force_refresh:
                cached_news = await redis_client.get(cache_key)
                if cached_news:
                    import json
                    news_data = json.loads(cached_news)
                    return [NewsItem(**item) for item in news_data]
            
            # Define search terms based on category
            search_terms = {
                "general": ["stock market", "wall street", "nasdaq", "dow jones", "s&p 500"],
                "crypto": ["cryptocurrency", "bitcoin", "ethereum", "crypto market"],
                "economy": ["federal reserve", "inflation", "gdp", "unemployment", "economy"],
                "earnings": ["earnings", "quarterly results", "revenue", "profit"],
                "ipos": ["ipo", "initial public offering", "stock debut"]
            }
            
            terms = search_terms.get(category, search_terms["general"])
            
            # Fetch news from multiple sources
            news_tasks = []
            if NewsService.NEWS_API_KEY:
                for term in terms[:2]:  # Limit to 2 terms to avoid rate limits
                    news_tasks.append(NewsService._get_news_api_general(term))
            
            # Add other news sources here as needed
            
            if not news_tasks:
                # Fallback to general financial news
                news_tasks.append(NewsService._get_fallback_market_news())
            
            results = await asyncio.gather(*news_tasks, return_exceptions=True)
            
            # Combine and process news
            all_news = []
            for result in results:
                if isinstance(result, list):
                    all_news.extend(result)
                elif isinstance(result, Exception):
                    logger.error(f"Error fetching market news: {result}")
            
            # Remove duplicates and sort
            unique_news = NewsService._deduplicate_news(all_news)
            sorted_news = sorted(unique_news, key=lambda x: x.published_at, reverse=True)
            
            # Limit results
            limited_news = sorted_news[:limit]
            
            # Cache the results
            import json
            news_data = [news.model_dump() for news in limited_news]
            # Convert datetime objects to strings for JSON serialization
            serializable_data = []
            for item in news_data:
                if isinstance(item.get('published_at'), datetime):
                    item['published_at'] = item['published_at'].isoformat()
                serializable_data.append(item)
            await redis_client.setex(cache_key, 1800, json.dumps(serializable_data))
            
            return limited_news
            
        except Exception as e:
            logger.error(f"Error getting market news: {str(e)}")
            return []
    
    @staticmethod
    async def _get_yfinance_news(symbol: str) -> List[NewsItem]:
        """Get news from Yahoo Finance"""
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            news_items = []
            for article in news:
                try:
                    news_item = NewsItem(
                        title=article.get("title", ""),
                        summary=article.get("summary", ""),
                        url=article.get("link", ""),
                        source="Yahoo Finance",
                        published_at=datetime.fromtimestamp(
                            article.get("providerPublishTime", 0)
                        ),
                        sentiment=await NewsService._analyze_sentiment(
                            (article.get("title") or "") + " " + (article.get("summary") or "")
                        ),
                        relevance_score=0.8,  # High relevance for stock-specific news
                        tags=[symbol.upper(), "stock"]
                    )
                    news_items.append(news_item)
                except Exception as e:
                    logger.error(f"Error processing yfinance article: {e}")
                    continue
            
            return news_items
            
        except Exception as e:
            logger.error(f"Error fetching yfinance news for {symbol}: {str(e)}")
            return []
    
    @staticmethod
    async def _get_alpha_vantage_news(symbol: str) -> List[NewsItem]:
        """Get news from Alpha Vantage"""
        try:
            if not NewsService.ALPHA_VANTAGE_KEY:
                return []
            
            url = f"https://www.alphavantage.co/query"
            params = {
                "function": "NEWS_SENTIMENT",
                "tickers": symbol,
                "apikey": NewsService.ALPHA_VANTAGE_KEY,
                "limit": 20
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        news_items = []
                        for article in data.get("feed", []):
                            try:
                                news_item = NewsItem(
                                    title=article.get("title", ""),
                                    summary=article.get("summary", ""),
                                    url=article.get("url", ""),
                                    source=article.get("source", "Alpha Vantage"),
                                    published_at=datetime.strptime(
                                        article.get("time_published", ""), 
                                        "%Y%m%dT%H%M%S"
                                    ),
                                    sentiment=NewsService._parse_alpha_vantage_sentiment(article),
                                    relevance_score=float(article.get("relevance_score", 0.5)),
                                    tags=[symbol.upper(), "stock", "alpha_vantage"]
                                )
                                news_items.append(news_item)
                            except Exception as e:
                                logger.error(f"Error processing Alpha Vantage article: {e}")
                                continue
                        
                        return news_items
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching Alpha Vantage news for {symbol}: {str(e)}")
            return []
    
    @staticmethod
    async def _get_news_api_news(symbol: str) -> List[NewsItem]:
        """Get news from NewsAPI"""
        try:
            if not NewsService.NEWS_API_KEY:
                return []
            
            # Get company name for better search results
            ticker = yf.Ticker(symbol)
            company_name = ticker.info.get("longName", symbol)
            
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": f'"{company_name}" OR "{symbol}"',
                "sortBy": "publishedAt",
                "pageSize": 20,
                "apiKey": NewsService.NEWS_API_KEY,
                "language": "en",
                "domains": "reuters.com,bloomberg.com,cnbc.com,marketwatch.com,yahoo.com"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        news_items = []
                        for article in data.get("articles", []):
                            try:
                                published_at = datetime.fromisoformat(
                                    article.get("publishedAt", "").replace("Z", "+00:00")
                                )
                                
                                news_item = NewsItem(
                                    title=article.get("title", ""),
                                    summary=article.get("description", ""),
                                    url=article.get("url", ""),
                                    source=article.get("source", {}).get("name", "NewsAPI"),
                                    published_at=published_at,
                                    sentiment=await NewsService._analyze_sentiment(
                                        (article.get("title") or "") + " " + (article.get("description") or "")
                                    ),
                                    relevance_score=NewsService._calculate_relevance(
                                        (article.get("title") or "") + " " + (article.get("description") or ""),
                                        [symbol, company_name]
                                    ),
                                    tags=[symbol.upper(), "stock", "newsapi"]
                                )
                                news_items.append(news_item)
                            except Exception as e:
                                logger.error(f"Error processing NewsAPI article: {e}")
                                continue
                        
                        return news_items
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching NewsAPI news for {symbol}: {str(e)}")
            return []
    
    @staticmethod
    async def _get_news_api_general(search_term: str) -> List[NewsItem]:
        """Get general market news from NewsAPI"""
        try:
            if not NewsService.NEWS_API_KEY:
                return []
            
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": search_term,
                "sortBy": "publishedAt",
                "pageSize": 20,
                "apiKey": NewsService.NEWS_API_KEY,
                "language": "en",
                "domains": "reuters.com,bloomberg.com,cnbc.com,marketwatch.com,yahoo.com"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        news_items = []
                        for article in data.get("articles", []):
                            try:
                                published_at = datetime.fromisoformat(
                                    article.get("publishedAt", "").replace("Z", "+00:00")
                                )
                                
                                news_item = NewsItem(
                                    title=article.get("title", ""),
                                    summary=article.get("description", ""),
                                    url=article.get("url", ""),
                                    source=article.get("source", {}).get("name", "NewsAPI"),
                                    published_at=published_at,
                                    sentiment=await NewsService._analyze_sentiment(
                                        (article.get("title") or "") + " " + (article.get("description") or "")
                                    ),
                                    relevance_score=0.7,
                                    tags=["market", "finance", search_term.replace(" ", "_")]
                                )
                                news_items.append(news_item)
                            except Exception as e:
                                logger.error(f"Error processing general NewsAPI article: {e}")
                                continue
                        
                        return news_items
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching general NewsAPI news: {str(e)}")
            return []
    
    @staticmethod
    async def _get_fallback_market_news() -> List[NewsItem]:
        """Fallback method to get market news when APIs are not available"""
        try:
            # This is a simple fallback - you could scrape financial websites
            # or use other free sources here
            fallback_news = [
                NewsItem(
                    title="Market Analysis Available",
                    summary="Use the analysis features to get insights on your stocks.",
                    url="",
                    source="AI Stock Analyzer",
                    published_at=datetime.utcnow(),
                    sentiment="neutral",
                    relevance_score=0.5,
                    tags=["market", "system"]
                )
            ]
            return fallback_news
            
        except Exception as e:
            logger.error(f"Error with fallback market news: {str(e)}")
            return []
    
    @staticmethod
    async def _analyze_sentiment(text: str) -> str:
        """Enhanced sentiment analysis using ML models"""
        try:
            if not text:
                return "neutral"
            
            # Get sentiment analyzer
            analyzer = NewsService.get_sentiment_analyzer()
            
            # Analyze sentiment using our enhanced analyzer (now properly awaiting)
            sentiment_result = await analyzer.analyze_single_text(text)
            
            # Convert numerical sentiment to categorical
            if sentiment_result["sentiment_score"] >= 0.1:
                return "positive"
            elif sentiment_result["sentiment_score"] <= -0.1:
                return "negative"
            else:
                return "neutral"
                
        except Exception as e:
            logger.error(f"Error analyzing sentiment with ML model: {str(e)}")
            # Fallback to simple keyword-based analysis
            return NewsService._analyze_sentiment_simple(text)
    
    @staticmethod
    def _analyze_sentiment_simple(text: str) -> str:
        """Fallback simple sentiment analysis"""
        try:
            if not text:
                return "neutral"
            
            text = text.lower()
            
            # Positive indicators
            positive_words = [
                "buy", "bull", "bullish", "up", "rise", "gain", "profit", "growth", 
                "strong", "beat", "exceed", "outperform", "upgrade", "positive",
                "optimistic", "confident", "rally", "surge", "boom"
            ]
            
            # Negative indicators
            negative_words = [
                "sell", "bear", "bearish", "down", "fall", "loss", "decline", "weak",
                "miss", "underperform", "downgrade", "negative", "pessimistic",
                "crash", "plunge", "drop", "recession", "risk"
            ]
            
            positive_count = sum(1 for word in positive_words if word in text)
            negative_count = sum(1 for word in negative_words if word in text)
            
            if positive_count > negative_count:
                return "positive"
            elif negative_count > positive_count:
                return "negative"
            else:
                return "neutral"
                
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {str(e)}")
            return "neutral"
    
    @staticmethod
    def _parse_alpha_vantage_sentiment(article: Dict[str, Any]) -> str:
        """Parse Alpha Vantage sentiment data"""
        try:
            sentiment_score = float(article.get("overall_sentiment_score", 0))
            
            if sentiment_score > 0.1:
                return "positive"
            elif sentiment_score < -0.1:
                return "negative"
            else:
                return "neutral"
                
        except Exception as e:
            logger.error(f"Error parsing Alpha Vantage sentiment: {str(e)}")
            return "neutral"
    
    @staticmethod
    def _calculate_relevance(text: str, keywords: List[str]) -> float:
        """Calculate relevance score based on keyword presence"""
        try:
            if not text or not keywords:
                return 0.5
            
            text = text.lower()
            relevance_score = 0.0
            
            for keyword in keywords:
                if keyword.lower() in text:
                    relevance_score += 0.3
            
            # Bonus for exact matches
            for keyword in keywords:
                if keyword.lower() == text.lower():
                    relevance_score += 0.5
            
            return min(1.0, relevance_score)
            
        except Exception as e:
            logger.error(f"Error calculating relevance: {str(e)}")
            return 0.5
    
    @staticmethod
    def _deduplicate_news(news_list: List[NewsItem]) -> List[NewsItem]:
        """Remove duplicate news articles"""
        try:
            seen_titles = set()
            unique_news = []
            
            for news in news_list:
                # Create a normalized title for comparison
                normalized_title = re.sub(r'[^a-zA-Z0-9\s]', '', news.title.lower())
                normalized_title = re.sub(r'\s+', ' ', normalized_title).strip()
                
                if normalized_title not in seen_titles and len(normalized_title) > 10:
                    seen_titles.add(normalized_title)
                    unique_news.append(news)
            
            return unique_news
            
        except Exception as e:
            logger.error(f"Error deduplicating news: {str(e)}")
            return news_list
    
    @staticmethod
    async def get_news_summary(
        symbol: Optional[str] = None,
        category: str = "general",
        days_back: int = 7
    ) -> Dict[str, Any]:
        """Get a summary of recent news"""
        try:
            if symbol:
                news = await NewsService.get_stock_news(symbol, limit=50)
            else:
                news = await NewsService.get_market_news(category, limit=100)
            
            # Filter by date
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            recent_news = [n for n in news if n.published_at >= cutoff_date]
            
            # Calculate sentiment distribution
            sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
            for article in recent_news:
                sentiment_counts[article.sentiment] += 1
            
            # Get top sources
            source_counts = {}
            for article in recent_news:
                source_counts[article.source] = source_counts.get(article.source, 0) + 1
            
            top_sources = sorted(source_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            return {
                "total_articles": len(recent_news),
                "sentiment_distribution": sentiment_counts,
                "top_sources": dict(top_sources),
                "date_range": {
                    "from": cutoff_date.isoformat(),
                    "to": datetime.utcnow().isoformat()
                },
                "most_recent": recent_news[0].model_dump() if recent_news else None
            }
            
        except Exception as e:
            logger.error(f"Error getting news summary: {str(e)}")
            return {
                "total_articles": 0,
                "sentiment_distribution": {"positive": 0, "negative": 0, "neutral": 0},
                "top_sources": {},
                "date_range": {},
                "most_recent": None
            }
    
    @staticmethod
    async def get_sentiment_analysis(
        symbol: str,
        limit: int = 50,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Get comprehensive sentiment analysis for a stock"""
        try:
            # Check cache first
            cache_key = f"sentiment:{symbol}:{limit}"
            if not force_refresh:
                cached_sentiment = await redis_client.get(cache_key)
                if cached_sentiment:
                    import json
                    return json.loads(cached_sentiment)
            
            # Get news for the symbol
            news_items = await NewsService.get_stock_news(symbol, limit)
            
            if not news_items:
                return {"error": "No news found for analysis"}
            
            # Get sentiment analyzer
            analyzer = NewsService.get_sentiment_analyzer()
            
            # Prepare news data for batch analysis
            news_data = []
            for item in news_items:
                news_data.append({
                    "title": item.title,
                    "content": item.summary,
                    "date": item.published_at.isoformat(),
                    "source": item.source,
                    "url": item.url
                })
            
            # Perform batch sentiment analysis
            sentiment_results = await analyzer.analyze_news_batch(news_data)
            
            # Cache the results
            import json
            await redis_client.setex(cache_key, 3600, json.dumps(sentiment_results))  # Cache for 1 hour
            
            return sentiment_results
            
        except Exception as e:
            logger.error(f"Error getting sentiment analysis for {symbol}: {str(e)}")
            return {"error": str(e)}
    
    @staticmethod
    async def get_market_sentiment(
        category: str = "general",
        limit: int = 100,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Get overall market sentiment analysis"""
        try:
            # Check cache first
            cache_key = f"market_sentiment:{category}:{limit}"
            if not force_refresh:
                cached_sentiment = await redis_client.get(cache_key)
                if cached_sentiment:
                    import json
                    return json.loads(cached_sentiment)
            
            # Get market news
            news_items = await NewsService.get_market_news(category, limit)
            
            if not news_items:
                return {"error": "No market news found for analysis"}
            
            # Get sentiment analyzer
            analyzer = NewsService.get_sentiment_analyzer()
            
            # Prepare news data for batch analysis
            news_data = []
            for item in news_items:
                news_data.append({
                    "title": item.title,
                    "content": item.summary,
                    "date": item.published_at.isoformat(),
                    "source": item.source,
                    "url": item.url
                })
            
            # Perform batch sentiment analysis
            sentiment_results = await analyzer.analyze_news_batch(news_data)
            
            # Add market-specific analysis
            sentiment_results["category"] = category
            sentiment_results["analysis_type"] = "market_sentiment"
            
            # Cache the results
            import json
            await redis_client.setex(cache_key, 3600, json.dumps(sentiment_results))
            
            return sentiment_results
            
        except Exception as e:
            logger.error(f"Error getting market sentiment: {str(e)}")
            return {"error": str(e)}
