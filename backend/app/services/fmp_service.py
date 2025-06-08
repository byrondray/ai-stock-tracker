"""
Financial Modeling Prep (FMP) Service

Dedicated service for fetching comprehensive historical data from FMP API
for ML model training. FMP provides 250 requests/day which is perfect for
batch ML data collection.
"""

import os
import aiohttp
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class FMPService:
    """Service for Financial Modeling Prep API - optimized for ML data collection"""
    
    def __init__(self):
        self.api_key = os.getenv('FMP_API_KEY')
        self.base_url = 'https://financialmodelingprep.com/api/v3'
        
        if not self.api_key:
            logger.warning("FMP_API_KEY not found in environment. ML services may be limited.")
    
    async def get_historical_data_for_ml(
        self, 
        symbol: str, 
        years: int = 5
    ) -> Optional[pd.DataFrame]:
        """
        Get comprehensive historical data for ML training.
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL')
            years: Number of years of historical data (default: 5)
            
        Returns:
            DataFrame with OHLCV data and date index
        """
        try:
            if not self.api_key:
                logger.error("FMP API key not available")
                return None
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=years * 365)
            
            url = f"{self.base_url}/historical-price-full/{symbol}"
            params = {
                'apikey': self.api_key,
                'from': start_date.strftime('%Y-%m-%d'),
                'to': end_date.strftime('%Y-%m-%d')
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'historical' in data and data['historical']:
                            # Convert to DataFrame
                            df = pd.DataFrame(data['historical'])
                            
                            # Clean and format data
                            df['date'] = pd.to_datetime(df['date'])
                            df.set_index('date', inplace=True)
                            df.sort_index(inplace=True)
                            
                            # Rename columns to match expected format
                            column_mapping = {
                                'open': 'Open',
                                'high': 'High',
                                'low': 'Low',
                                'close': 'Close',
                                'volume': 'Volume'
                            }
                            df.rename(columns=column_mapping, inplace=True)
                            
                            # Ensure we have the required columns
                            required_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
                            for col in required_cols:
                                if col not in df.columns:
                                    logger.warning(f"Missing column {col} in FMP data")
                                    return None
                            
                            # Remove any rows with missing data
                            df.dropna(inplace=True)
                            
                            logger.info(f"✅ FMP: Retrieved {len(df)} days of data for {symbol}")
                            return df
                        else:
                            logger.warning(f"No historical data returned from FMP for {symbol}")
                            return None
                    else:
                        logger.error(f"FMP API error: {response.status} for {symbol}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error fetching FMP data for {symbol}: {str(e)}")
            return None
    
    async def get_company_fundamentals(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get company fundamentals for analysis.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Dictionary with fundamental data
        """
        try:
            if not self.api_key:
                return None
            
            # Get key metrics
            url = f"{self.base_url}/key-metrics/{symbol}"
            params = {'apikey': self.api_key, 'limit': 1}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data and len(data) > 0:
                            metrics = data[0]  # Get most recent
                            
                            # Get company profile for additional data
                            profile_url = f"{self.base_url}/profile/{symbol}"
                            profile_params = {'apikey': self.api_key}
                            
                            async with session.get(profile_url, params=profile_params) as profile_response:
                                if profile_response.status == 200:
                                    profile_data = await profile_response.json()
                                    if profile_data and len(profile_data) > 0:
                                        profile = profile_data[0]
                                        
                                        # Combine metrics and profile
                                        fundamentals = {
                                            'pe_ratio': metrics.get('peRatio'),
                                            'roe': metrics.get('roe'),
                                            'debt_to_equity': metrics.get('debtToEquity'),
                                            'current_ratio': metrics.get('currentRatio'),
                                            'revenue_growth': metrics.get('revenueGrowth'),
                                            'market_cap': profile.get('mktCap'),
                                            'beta': profile.get('beta'),
                                            'dividend_yield': profile.get('lastDiv'),
                                            'profit_margin': metrics.get('netProfitMargin'),
                                            'price_to_book': metrics.get('pbRatio'),
                                            'sector': profile.get('sector'),
                                            'industry': profile.get('industry')
                                        }
                                        
                                        logger.info(f"✅ FMP: Retrieved fundamentals for {symbol}")
                                        return fundamentals
            
            logger.warning(f"No fundamental data available from FMP for {symbol}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching FMP fundamentals for {symbol}: {str(e)}")
            return None
    
    async def get_financial_statements(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get financial statements for detailed analysis.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Dictionary with income statement, balance sheet, and cash flow data
        """
        try:
            if not self.api_key:
                return None
            
            statements = {}
            
            # Get Income Statement
            income_url = f"{self.base_url}/income-statement/{symbol}"
            params = {'apikey': self.api_key, 'limit': 1}
            
            async with aiohttp.ClientSession() as session:
                # Income Statement
                async with session.get(income_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data and len(data) > 0:
                            statements['income_statement'] = data[0]
                
                # Balance Sheet
                balance_url = f"{self.base_url}/balance-sheet-statement/{symbol}"
                async with session.get(balance_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data and len(data) > 0:
                            statements['balance_sheet'] = data[0]
                
                # Cash Flow
                cashflow_url = f"{self.base_url}/cash-flow-statement/{symbol}"
                async with session.get(cashflow_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data and len(data) > 0:
                            statements['cash_flow'] = data[0]
            
            if statements:
                logger.info(f"✅ FMP: Retrieved financial statements for {symbol}")
                return statements
            else:
                logger.warning(f"No financial statements available from FMP for {symbol}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching FMP financial statements for {symbol}: {str(e)}")
            return None
    
    async def check_api_usage(self) -> Optional[Dict[str, Any]]:
        """
        Check API usage status.
        
        Returns:
            Dictionary with usage information
        """
        try:
            if not self.api_key:
                return None
            
            url = f"{self.base_url}/user"
            params = {'apikey': self.api_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"FMP API Usage: {data}")
                        return data
                    else:
                        logger.warning(f"Could not check FMP API usage: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error checking FMP API usage: {str(e)}")
            return None 