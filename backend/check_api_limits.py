#!/usr/bin/env python3
"""
API Rate Limit Checker

Simple script to test API endpoints and monitor rate limiting.
Run this to check if your APIs are working and see rate limit status.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the app directory to the path
sys.path.append('.')

from app.services.stock_service import StockService
from app.services.analysis_service import AnalysisService
from app.services.news_service import NewsService
from app.core.database import SessionLocal

async def test_stock_api():
    """Test basic stock data APIs"""
    print("🔍 Testing Stock APIs...")
    db = SessionLocal()
    
    try:
        stock_service = StockService(db)
        
        # Test stocks that should exist
        test_symbols = ['AAPL', 'GOOGL', 'MSFT']
        
        for symbol in test_symbols:
            print(f"\n📊 Testing {symbol}:")
            
            # Test basic stock info
            try:
                stock = await stock_service.get_stock(symbol)
                print(f"  ✅ Stock info: {stock.name if stock else 'Not found'}")
            except Exception as e:
                print(f"  ❌ Stock info failed: {str(e)[:100]}")
            
            # Test current price
            try:
                price = await stock_service.get_current_price(symbol)
                print(f"  ✅ Current price: ${price.price if price else 'N/A'}")
            except Exception as e:
                print(f"  ❌ Current price failed: {str(e)[:100]}")
            
            # Test price history (1 day - most likely to hit rate limits)
            try:
                history = await stock_service.get_price_history(symbol, 1)
                print(f"  ✅ History (1D): {len(history)} data points")
            except Exception as e:
                print(f"  ❌ History failed: {str(e)[:100]}")
                
            # Add delay between requests to be nice to APIs
            await asyncio.sleep(1)
            
    finally:
        db.close()

async def test_analysis_api():
    """Test AI analysis APIs"""
    print("\n🤖 Testing AI Analysis APIs...")
    db = SessionLocal()
    
    try:
        test_symbols = ['AAPL']
        
        for symbol in test_symbols:
            print(f"\n🧠 Testing AI analysis for {symbol}:")
            
            # Test stock analysis
            try:
                analysis = await AnalysisService.get_stock_analysis(db, symbol)
                print(f"  ✅ Analysis: {analysis.overall_rating if analysis else 'N/A'}")
            except Exception as e:
                print(f"  ❌ Analysis failed: {str(e)[:100]}")
                
    finally:
        db.close()

async def test_news_api():
    """Test news APIs"""
    print("\n📰 Testing News APIs...")
    
    test_symbols = ['AAPL']
    
    for symbol in test_symbols:
        print(f"\n📄 Testing news for {symbol}:")
        
        # Test stock news
        try:
            news = await NewsService.get_stock_news(symbol, limit=5)
            print(f"  ✅ Stock news: {len(news)} articles")
        except Exception as e:
            print(f"  ❌ Stock news failed: {str(e)[:100]}")
    
    # Test general market news
    try:
        market_news = await NewsService.get_market_news(limit=5)
        print(f"  ✅ Market news: {len(market_news)} articles")
    except Exception as e:
        print(f"  ❌ Market news failed: {str(e)[:100]}")

def print_rate_limit_tips():
    """Print helpful tips for dealing with rate limits"""
    print("\n" + "="*60)
    print("📋 RATE LIMIT MANAGEMENT TIPS:")
    print("="*60)
    print("""
1. 🕒 TIME-BASED LIMITS:
   - Most free APIs reset daily (usually at midnight UTC)
   - Alpha Vantage: 5 requests/minute, 500/day
   - Yahoo Finance: More lenient but still limited
   
2. 🔄 CACHING STRATEGIES:
   - Backend caches data for 30 minutes to 1 hour
   - Historical data cached longer
   - Refresh manually only when needed
   
3. 🎯 PRIORITIZE REQUESTS:
   - Stock prices: Most important
   - Charts: Second priority  
   - AI analysis: Lowest priority
   
4. 🔧 WORKAROUNDS:
   - Use cached/default data when rate limited
   - Stagger API calls with delays
   - Focus on core functionality
   
5. 💡 UPGRADE OPTIONS:
   - Alpha Vantage Premium: $49.99/month for unlimited
   - Financial Modeling Prep: $14.99/month
   - Polygon.io: $99/month for real-time data
   
6. 🆓 FREE ALTERNATIVES:
   - Yahoo Finance (yfinance library) - most reliable
   - IEX Cloud sandbox mode
   - Cached/demo data for development
""")

async def main():
    print("🚀 API Rate Limit Checker")
    print("=" * 40)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test all APIs
    await test_stock_api()
    await test_analysis_api() 
    await test_news_api()
    
    # Print helpful tips
    print_rate_limit_tips()
    
    print(f"\n⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    asyncio.run(main()) 