from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import yfinance as yf
import pandas as pd
import numpy as np

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import StockPrediction, PredictionRequest, PredictionPoint
from app.services.prediction_service import PredictionService
from app.services.stock_service import StockService
from app.services.fmp_service import FMPService
from app.ml import LSTMPredictor, FeatureStore

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{symbol}", response_model=StockPrediction)
async def get_stock_prediction(
    symbol: str,
    days: int = Query(default=7, ge=1, le=30, description="Number of days to predict"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockPrediction:
    """Get AI price predictions for a stock using LSTM model."""
    try:
        logger.info(f"Generating ML-based predictions for {symbol} ({days} days)")
        
        # Use FMP for comprehensive historical data for ML training
        fmp_service = FMPService()
        
        # Try FMP first for 5 years of high-quality data
        historical_data = await fmp_service.get_historical_data_for_ml(symbol, years=5)
        
        if historical_data is None or len(historical_data) < 100:
            logger.info(f"FMP data insufficient for {symbol}, falling back to stock service")
            # Fallback to existing stock service
            stock_service = StockService(db)
            
            # Get extended historical data for ML training
            historical_data_list = await stock_service.get_price_history(
                symbol=symbol,
                days=730  # 2 years of data for better training
            )
            
            # Convert to pandas DataFrame for ML processing
            if historical_data_list:
                historical_data = pd.DataFrame(historical_data_list)
                # Set the date column as index
                historical_data['date'] = pd.to_datetime(historical_data['date'])
                historical_data.set_index('date', inplace=True)
                # Rename columns to match expected format (uppercase OHLCV)
                historical_data.rename(columns={
                    'open': 'Open',
                    'high': 'High', 
                    'low': 'Low',
                    'close': 'Close',
                    'volume': 'Volume'
                }, inplace=True)
            else:
                historical_data = pd.DataFrame()
        
        if historical_data.empty or len(historical_data) < 100:
            logger.warning(f"Insufficient historical data for {symbol}: {len(historical_data)} rows")
            return await _fallback_prediction(symbol, days)
        
        logger.info(f"Retrieved {len(historical_data)} historical data points for {symbol}")
        
        # Initialize improved LSTM predictor with feature store
        lstm_predictor = LSTMPredictor(
            sequence_length=60,
            prediction_horizon=days,
            model_dir=f"models/lstm/{symbol}"
        )
        
        try:
            # Train or load existing model and make predictions
            logger.info(f"Attempting LSTM prediction for {symbol}")
            
            # Train the model with robust feature engineering
            training_results = await lstm_predictor.train(
                data=historical_data,
                symbol=symbol,
                epochs=50,
                batch_size=32,
                early_stopping_patience=10
            )
            
            logger.info(f"LSTM training completed for {symbol}. Validation metrics: {training_results.get('validation_metrics', {})}")
            
            # Make predictions with confidence intervals
            prediction_results = await lstm_predictor.predict(
                data=historical_data,
                symbol=symbol,
                return_confidence=True
            )
            
            # Convert to the expected format
            predictions = []
            for i, (pred_price, pred_date) in enumerate(zip(
                prediction_results['predictions'], 
                prediction_results['prediction_dates']
            )):
                confidence_interval = prediction_results['confidence_intervals'][i]
                
                predictions.append(PredictionPoint(
                    date=pred_date,
                    predicted_price=round(float(pred_price), 2),
                    confidence=round(prediction_results['confidence_score'], 2),
                    lower_bound=round(float(confidence_interval['lower']), 2),
                    upper_bound=round(float(confidence_interval['upper']), 2)
                ))
            
            logger.info(f"Successfully generated {len(predictions)} ML predictions for {symbol}")
            
            return StockPrediction(
                symbol=symbol.upper(),
                predictions=predictions,
                model_version="2.0-lstm",
                model_type="LSTM Neural Network",
                created_at=datetime.utcnow().isoformat()
            )
            
        except Exception as lstm_error:
            logger.error(f"LSTM prediction failed for {symbol}: {str(lstm_error)}")
            # Fall back to technical analysis based predictions
            return await _technical_analysis_prediction(symbol, days, historical_data)
        
    except Exception as e:
        logger.error(f"Error in ML prediction pipeline for {symbol}: {str(e)}")
        return await _fallback_prediction(symbol, days)


async def _technical_analysis_prediction(
    symbol: str, 
    days: int, 
    data: pd.DataFrame
) -> StockPrediction:
    """Generate predictions based on technical analysis when LSTM fails."""
    try:
        logger.info(f"Generating technical analysis predictions for {symbol}")
        
        # Use feature store to calculate basic indicators for technical analysis
        feature_store = FeatureStore()
        basic_features = ['SMA_20', 'EMA_12', 'EMA_26', 'RSI', 'MACD']
        
        try:
            enhanced_data = feature_store.calculate_features(data, basic_features)
        except Exception as e:
            logger.warning(f"Could not calculate technical indicators: {e}")
            enhanced_data = data.copy()
        
        current_price = float(enhanced_data['Close'].iloc[-1])
        
        # Get recent technical indicators (with fallbacks)
        recent_rsi = enhanced_data['RSI'].iloc[-1] if 'RSI' in enhanced_data.columns and not pd.isna(enhanced_data['RSI'].iloc[-1]) else 50
        recent_macd = enhanced_data['MACD'].iloc[-1] if 'MACD' in enhanced_data.columns and not pd.isna(enhanced_data['MACD'].iloc[-1]) else 0
        recent_sma_20 = enhanced_data['SMA_20'].iloc[-1] if 'SMA_20' in enhanced_data.columns and not pd.isna(enhanced_data['SMA_20'].iloc[-1]) else current_price
        
        # Determine trend based on technical indicators
        trend_factors = []
        
        # RSI analysis
        if recent_rsi < 30:  # Oversold
            trend_factors.append(0.02)  # Bullish
        elif recent_rsi > 70:  # Overbought
            trend_factors.append(-0.015)  # Bearish
        else:
            trend_factors.append(0.001)  # Neutral
        
        # MACD analysis
        if recent_macd > 0:
            trend_factors.append(0.01)  # Bullish
        else:
            trend_factors.append(-0.005)  # Bearish
        
        # Moving average analysis
        if current_price > recent_sma_20:
            trend_factors.append(0.015)  # Uptrend
        else:
            trend_factors.append(-0.01)  # Downtrend
        
        # Calculate average trend
        avg_trend = np.mean(trend_factors)
        
        # Generate predictions with trend and some volatility
        running_price = current_price
        predictions = []
        
        for i in range(1, days + 1):
            date = datetime.utcnow() + timedelta(days=i)
            
            # Apply trend with some random variation
            daily_change = avg_trend + np.random.normal(0, 0.01)  # Add some noise
            running_price = running_price * (1 + daily_change)
            
            # Confidence decreases over time
            confidence = max(0.3, 0.75 - (i * 0.05))
            
            # Technical analysis bounds based on historical volatility
            if len(enhanced_data) > 20:
                volatility = enhanced_data['Close'].pct_change().std() * np.sqrt(i)
            else:
                volatility = 0.02 * np.sqrt(i)  # Default 2% daily volatility
                
            lower_bound = running_price * (1 - volatility)
            upper_bound = running_price * (1 + volatility)
            
            predictions.append(PredictionPoint(
                date=date.isoformat(),
                predicted_price=round(running_price, 2),
                confidence=round(confidence, 2),
                lower_bound=round(lower_bound, 2),
                upper_bound=round(upper_bound, 2)
            ))
        
        return StockPrediction(
            symbol=symbol.upper(),
            predictions=predictions,
            model_version="2.0-technical",
            model_type="Technical Analysis",
            created_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Technical analysis prediction failed for {symbol}: {str(e)}")
        return await _fallback_prediction(symbol, days)


async def _fallback_prediction(symbol: str, days: int) -> StockPrediction:
    """Fallback prediction when all ML methods fail."""
    try:
        logger.info(f"Using fallback prediction for {symbol}")
        
        # Get current price for baseline
        ticker = yf.Ticker(symbol.upper())
        current_price = None
        try:
            hist = ticker.history(period="5d")
            if not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
            else:
                info = ticker.info
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                if current_price:
                    current_price = float(current_price)
        except Exception as e:
            logger.error(f"Error getting current price for {symbol}: {e}")
            current_price = None
        
        if not current_price:
            logger.error(f"Could not get current price for {symbol}")
            return StockPrediction(
                symbol=symbol.upper(),
                predictions=[],
                model_version="2.0-error",
                model_type="Error - No Data",
                created_at=datetime.utcnow().isoformat()
            )
        
        # Generate simple trend-based predictions
        predictions = []
        running_price = current_price
        
        for i in range(1, days + 1):
            date = datetime.utcnow() + timedelta(days=i)
            
            # Very conservative daily changes
            daily_change_percent = np.random.uniform(-0.01, 0.015)  # -1% to +1.5% daily
            running_price = running_price * (1 + daily_change_percent)
            
            # Low confidence for fallback predictions
            confidence = max(0.2, 0.5 - (i * 0.03))
            
            # Wide bounds to reflect uncertainty
            lower_bound = running_price * 0.95
            upper_bound = running_price * 1.05
            
            predictions.append(PredictionPoint(
                date=date.isoformat(),
                predicted_price=round(running_price, 2),
                confidence=round(confidence, 2),
                lower_bound=round(lower_bound, 2),
                upper_bound=round(upper_bound, 2)
            ))
        
        return StockPrediction(
            symbol=symbol.upper(),
            predictions=predictions,
            model_version="2.0-fallback",
            model_type="Simple Trend",
            created_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Fallback prediction failed for {symbol}: {str(e)}")
        return StockPrediction(
            symbol=symbol.upper(),
            predictions=[],
            model_version="2.0-error",
            model_type="Complete Failure",
            created_at=datetime.utcnow().isoformat()
        )


@router.post("/", response_model=StockPrediction)
async def create_prediction(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockPrediction:
    """Generate new prediction for a stock with forced refresh."""
    try:
        # Force a new prediction by calling the GET endpoint
        return await get_stock_prediction(
            symbol=request.symbol,
            days=request.days,
            current_user=current_user,
            db=db
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction generation failed"
        )
