"""
Stock Prediction Service

Provides ML-based stock price predictions using various models and techniques.
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.preprocessing import StandardScaler
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import joblib
import logging
import asyncio
from pathlib import Path

from ..models import Stock, Prediction, PriceHistory
from ..schemas import PredictionCreate, PredictionResponse
from ..core.redis_client import redis_client
from ..core.config import settings
from ..ml import LSTMPredictor, TechnicalIndicators

logger = logging.getLogger(__name__)


class PredictionService:
    """Service for ML-based stock price predictions"""
    
    # Model storage directory
    MODEL_DIR = Path("models")
    MODEL_DIR.mkdir(exist_ok=True)
    
    @staticmethod
    async def get_prediction(
        db: AsyncSession,
        symbol: str,
        days_ahead: int = 30,
        force_refresh: bool = False
    ) -> Optional[PredictionResponse]:
        """Get stock price prediction"""
        try:
            # Check cache first
            cache_key = f"prediction:{symbol}:{days_ahead}"
            if not force_refresh:
                cached_prediction = await redis_client.get(cache_key)
                if cached_prediction:
                    return PredictionResponse.model_validate_json(cached_prediction)
            
            # Check existing prediction from database
            result = await db.execute(
                select(Prediction)
                .where(
                    Prediction.symbol == symbol,
                    Prediction.days_ahead == days_ahead
                )
                .order_by(Prediction.created_at.desc())
            )
            existing_prediction = result.scalars().first()
            
            # Check if we need to refresh (older than 6 hours)
            if (existing_prediction and not force_refresh and 
                existing_prediction.created_at > datetime.utcnow() - timedelta(hours=6)):
                prediction_response = PredictionResponse.model_validate(existing_prediction)
                await redis_client.setex(cache_key, 21600, prediction_response.model_dump_json())  # 6 hours
                return prediction_response
            
            # Generate new prediction
            prediction_data = await PredictionService._generate_prediction(symbol, days_ahead)
            if not prediction_data:
                return None
            
            # Save to database
            prediction = Prediction(
                symbol=symbol,
                days_ahead=days_ahead,
                **prediction_data
            )
            db.add(prediction)
            await db.commit()
            await db.refresh(prediction)
            
            # Cache the result
            prediction_response = PredictionResponse.model_validate(prediction)
            await redis_client.setex(cache_key, 21600, prediction_response.model_dump_json())
            
            return prediction_response
            
        except Exception as e:
            logger.error(f"Error getting prediction for {symbol}: {str(e)}")
            return None
    @staticmethod
    async def _generate_prediction(symbol: str, days_ahead: int) -> Optional[Dict[str, Any]]:
        """Generate stock price prediction using ensemble of ML models including LSTM"""
        try:
            # Get historical data
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2y")  # Get 2 years of data
            
            if len(hist) < 100:  # Need sufficient data
                logger.warning(f"Insufficient data for {symbol}")
                return None
            
            # Initialize technical indicators calculator
            tech_indicators = TechnicalIndicators()
            hist_with_indicators = tech_indicators.calculate_all_indicators(hist)
            
            # Prepare features for traditional ML models
            features_df = await PredictionService._prepare_features(hist_with_indicators)
            if features_df.empty:
                return None
            
            # Initialize LSTM model
            lstm_predictor = LSTMPredictor(
                sequence_length=60,
                prediction_horizon=min(days_ahead, 7),  # LSTM works best for shorter horizons
                model_name=f"lstm_{symbol.lower()}"
            )
            
            # Prepare data for LSTM
            lstm_data = hist_with_indicators[['Open', 'High', 'Low', 'Close', 'Volume']].copy()
            
            # Train LSTM model if needed
            lstm_model_path = PredictionService.MODEL_DIR / f"lstm_{symbol.lower()}.h5"
            if not lstm_model_path.exists() or datetime.fromtimestamp(lstm_model_path.stat().st_mtime) < datetime.now() - timedelta(days=7):
                logger.info(f"Training LSTM model for {symbol}")
                lstm_predictor.train(lstm_data)
                lstm_predictor.save_model()
            else:
                lstm_predictor.load_model()
            
            # Generate LSTM predictions
            lstm_predictions = lstm_predictor.predict(lstm_data)
            lstm_confidence = lstm_predictor.get_prediction_confidence(lstm_data)
            
            # Split data for traditional models
            train_size = int(len(features_df) * 0.8)
            train_data = features_df.iloc[:train_size]
            val_data = features_df.iloc[train_size:]
            
            # Prepare training data for traditional models
            feature_columns = [col for col in features_df.columns if col != 'target']
            X_train = train_data[feature_columns]
            y_train = train_data['target']
            X_val = val_data[feature_columns]
            y_val = val_data['target']
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_val_scaled = scaler.transform(X_val)
            
            # Train ensemble of traditional models
            traditional_models = await PredictionService._train_ensemble_models(
                X_train_scaled, y_train, X_val_scaled, y_val
            )
            
            # Generate predictions from traditional models
            latest_features = features_df.iloc[-1][feature_columns].values.reshape(1, -1)
            latest_features_scaled = scaler.transform(latest_features)
            
            predictions = {}
            confidence_intervals = {}
            
            # Traditional model predictions
            for model_name, model in traditional_models.items():
                pred = model.predict(latest_features_scaled)[0]
                predictions[model_name] = pred
                
                # Calculate confidence interval
                val_predictions = model.predict(X_val_scaled)
                mae = mean_absolute_error(y_val, val_predictions)
                confidence_intervals[model_name] = {
                    "lower": pred - (mae * 1.96),
                    "upper": pred + (mae * 1.96)
                }
            
            # Add LSTM predictions
            if lstm_predictions and len(lstm_predictions) > 0:
                lstm_pred = lstm_predictions[0] if days_ahead <= 7 else predictions.get('gradient_boosting', lstm_predictions[0])
                predictions['lstm'] = lstm_pred
                
                # LSTM confidence interval
                lstm_mae = lstm_confidence.get('mae', 0.05) * lstm_pred
                confidence_intervals['lstm'] = {
                    "lower": lstm_pred - (lstm_mae * 1.96),
                    "upper": lstm_pred + (lstm_mae * 1.96)
                }
            
            # Enhanced ensemble prediction with LSTM weighting
            if 'lstm' in predictions:
                # Give LSTM higher weight for short-term predictions
                lstm_weight = 0.4 if days_ahead <= 7 else 0.2
                traditional_weight = (1 - lstm_weight) / len(traditional_models) if traditional_models else 0
                
                ensemble_pred = lstm_weight * predictions['lstm']
                ensemble_lower = lstm_weight * confidence_intervals['lstm']['lower']
                ensemble_upper = lstm_weight * confidence_intervals['lstm']['upper']
                
                for model_name in traditional_models.keys():
                    ensemble_pred += traditional_weight * predictions[model_name]
                    ensemble_lower += traditional_weight * confidence_intervals[model_name]['lower']
                    ensemble_upper += traditional_weight * confidence_intervals[model_name]['upper']
            else:
                # Fallback to traditional ensemble
                ensemble_pred = np.mean(list(predictions.values()))
                ensemble_lower = np.mean([ci["lower"] for ci in confidence_intervals.values()])
                ensemble_upper = np.mean([ci["upper"] for ci in confidence_intervals.values()])
            
            # Calculate prediction accuracy metrics
            accuracy_metrics = await PredictionService._calculate_accuracy_metrics(traditional_models, X_val_scaled, y_val)
            
            # Add LSTM metrics if available
            if lstm_confidence:
                accuracy_metrics.update({
                    "lstm_confidence": lstm_confidence.get('confidence_score', 0.7),
                    "lstm_mae": lstm_confidence.get('mae', 0.05),
                    "lstm_mse": lstm_confidence.get('mse', 0.01)
                })
            
            # Get current price for comparison
            current_price = hist['Close'].iloc[-1]
            
            return {
                "current_price": float(current_price),
                "predicted_price": float(ensemble_pred),
                "price_change": float(ensemble_pred - current_price),
                "price_change_percent": float(((ensemble_pred - current_price) / current_price) * 100),
                "confidence_lower": float(ensemble_lower),
                "confidence_upper": float(ensemble_upper),
                "confidence_score": float(accuracy_metrics.get("ensemble_accuracy", 0.7)),
                "model_predictions": {k: float(v) for k, v in predictions.items()},
                "accuracy_metrics": accuracy_metrics,
                "prediction_date": datetime.utcnow(),
                "target_date": datetime.utcnow() + timedelta(days=days_ahead),
                "model_type": "enhanced_ensemble_with_lstm"
            }
            
        except Exception as e:
            logger.error(f"Error generating prediction for {symbol}: {str(e)}")
            return None
    @staticmethod
    async def _prepare_features(hist: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for ML models using enhanced technical indicators"""
        try:
            df = hist.copy()
            
            # Use our enhanced technical indicators
            tech_indicators = TechnicalIndicators()
            
            # Get basic technical indicators (already calculated if passed from _generate_prediction)
            if 'RSI' not in df.columns:
                df = tech_indicators.calculate_all_indicators(df)
            
            # Select the most important features for traditional ML models
            # (LSTM will use raw OHLCV data with full technical indicators)
            feature_columns = [
                # Trend indicators
                'SMA_20', 'EMA_12', 'EMA_26', 'MACD', 'MACD_Signal',
                
                # Momentum indicators  
                'RSI', 'Stochastic_K', 'Stochastic_D', 'Williams_R',
                
                # Volatility indicators
                'BB_Upper', 'BB_Lower', 'BB_Width', 'ATR',
                
                # Volume indicators
                'Volume_SMA', 'Volume_Ratio', 'MFI',
                
                # Price ratios and momentum
                'Price_SMA20_Ratio', 'Price_EMA12_Ratio',
                'Momentum_5', 'Momentum_10', 'Momentum_20',
                
                # Statistical indicators
                'Z_Score', 'Linear_Reg_Slope'
            ]
            
            # Add target variable (next day's closing price)
            df['target'] = df['Close'].shift(-1)
            
            # Select available features (some might not be calculated)
            available_features = [col for col in feature_columns if col in df.columns]
            available_features.append('target')
            
            # Fallback to basic features if advanced ones aren't available
            if len(available_features) < 10:
                basic_features = [
                    'MA_5', 'MA_10', 'MA_20', 'MA_50',
                    'Price_MA5_Ratio', 'Price_MA20_Ratio',
                    'Volatility_10', 'Volatility_20',
                    'RSI', 'MACD', 'MACD_Signal',
                    'BB_Position', 'Volume_Ratio',
                    'Momentum_5', 'Momentum_10', 'Momentum_20',
                    'HL_Ratio', 'OC_Ratio', 'target'
                ]
                available_features = [col for col in basic_features if col in df.columns]
            
            # Remove rows with NaN values
            df_features = df[available_features].dropna()
            
            return df_features
            
        except Exception as e:
            logger.error(f"Error preparing features: {str(e)}")
            # Fallback to original method if enhanced features fail
            return await PredictionService._prepare_basic_features(hist)
    
    @staticmethod
    async def _prepare_basic_features(hist: pd.DataFrame) -> pd.DataFrame:
        """Fallback method for preparing basic features"""
        try:
            df = hist.copy()
            
            # Basic technical indicators
            # Moving averages
            df['MA_5'] = df['Close'].rolling(window=5).mean()
            df['MA_10'] = df['Close'].rolling(window=10).mean()
            df['MA_20'] = df['Close'].rolling(window=20).mean()
            df['MA_50'] = df['Close'].rolling(window=50).mean()
            
            # Price ratios
            df['Price_MA5_Ratio'] = df['Close'] / df['MA_5']
            df['Price_MA20_Ratio'] = df['Close'] / df['MA_20']
            
            # Volatility
            df['Volatility_10'] = df['Close'].rolling(window=10).std()
            df['Volatility_20'] = df['Close'].rolling(window=20).std()
            
            # RSI
            delta = df['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['RSI'] = 100 - (100 / (1 + rs))
            
            # MACD
            exp1 = df['Close'].ewm(span=12).mean()
            exp2 = df['Close'].ewm(span=26).mean()
            df['MACD'] = exp1 - exp2
            df['MACD_Signal'] = df['MACD'].ewm(span=9).mean()
            
            # Bollinger Bands
            df['BB_Middle'] = df['Close'].rolling(window=20).mean()
            bb_std = df['Close'].rolling(window=20).std()
            df['BB_Upper'] = df['BB_Middle'] + (bb_std * 2)
            df['BB_Lower'] = df['BB_Middle'] - (bb_std * 2)
            df['BB_Position'] = (df['Close'] - df['BB_Lower']) / (df['BB_Upper'] - df['BB_Lower'])
            
            # Volume indicators
            df['Volume_MA'] = df['Volume'].rolling(window=20).mean()
            df['Volume_Ratio'] = df['Volume'] / df['Volume_MA']
            
            # Price momentum
            df['Momentum_5'] = (df['Close'] - df['Close'].shift(5)) / df['Close'].shift(5)
            df['Momentum_10'] = (df['Close'] - df['Close'].shift(10)) / df['Close'].shift(10)
            df['Momentum_20'] = (df['Close'] - df['Close'].shift(20)) / df['Close'].shift(20)
            
            # High-Low ratios
            df['HL_Ratio'] = (df['High'] - df['Low']) / df['Close']
            df['OC_Ratio'] = (df['Close'] - df['Open']) / df['Open']
            
            # Target variable (next day's closing price)
            df['target'] = df['Close'].shift(-1)
            
            # Select features for model
            feature_columns = [
                'MA_5', 'MA_10', 'MA_20', 'MA_50',
                'Price_MA5_Ratio', 'Price_MA20_Ratio',
                'Volatility_10', 'Volatility_20',
                'RSI', 'MACD', 'MACD_Signal',
                'BB_Position', 'Volume_Ratio',
                'Momentum_5', 'Momentum_10', 'Momentum_20',
                'HL_Ratio', 'OC_Ratio', 'target'
            ]
            
            # Remove rows with NaN values
            df_features = df[feature_columns].dropna()
            
            return df_features
            
        except Exception as e:
            logger.error(f"Error preparing basic features: {str(e)}")
            return pd.DataFrame()

    @staticmethod
    async def _train_ensemble_models(
        X_train: np.ndarray, 
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray
    ) -> Dict[str, Any]:
        """Train ensemble of ML models"""
        models = {}
        
        try:
            # Random Forest
            rf_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            rf_model.fit(X_train, y_train)
            models['random_forest'] = rf_model
            
            # Gradient Boosting
            gb_model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
            gb_model.fit(X_train, y_train)
            models['gradient_boosting'] = gb_model
            
            # Linear Regression
            lr_model = LinearRegression()
            lr_model.fit(X_train, y_train)
            models['linear_regression'] = lr_model
            
            return models
            
        except Exception as e:
            logger.error(f"Error training models: {str(e)}")
            return {}
    
    @staticmethod
    async def _calculate_accuracy_metrics(
        models: Dict[str, Any],
        X_val: np.ndarray,
        y_val: np.ndarray
    ) -> Dict[str, float]:
        """Calculate accuracy metrics for models"""
        try:
            metrics = {}
            ensemble_predictions = []
            
            for model_name, model in models.items():
                val_pred = model.predict(X_val)
                ensemble_predictions.append(val_pred)
                
                # Calculate metrics
                mse = mean_squared_error(y_val, val_pred)
                mae = mean_absolute_error(y_val, val_pred)
                rmse = np.sqrt(mse)
                
                # Calculate accuracy as 1 - normalized RMSE
                accuracy = max(0, 1 - (rmse / np.mean(y_val)))
                
                metrics[f"{model_name}_mse"] = float(mse)
                metrics[f"{model_name}_mae"] = float(mae)
                metrics[f"{model_name}_rmse"] = float(rmse)
                metrics[f"{model_name}_accuracy"] = float(accuracy)
            
            # Ensemble metrics
            ensemble_pred = np.mean(ensemble_predictions, axis=0)
            ensemble_mse = mean_squared_error(y_val, ensemble_pred)
            ensemble_mae = mean_absolute_error(y_val, ensemble_pred)
            ensemble_rmse = np.sqrt(ensemble_mse)
            ensemble_accuracy = max(0, 1 - (ensemble_rmse / np.mean(y_val)))
            
            metrics["ensemble_mse"] = float(ensemble_mse)
            metrics["ensemble_mae"] = float(ensemble_mae)
            metrics["ensemble_rmse"] = float(ensemble_rmse)
            metrics["ensemble_accuracy"] = float(ensemble_accuracy)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating accuracy metrics: {str(e)}")
            return {"ensemble_accuracy": 0.5}
    
    @staticmethod
    async def get_historical_predictions_accuracy(
        db: AsyncSession,
        symbol: str,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get historical accuracy of predictions for a symbol"""
        try:
            # Get historical predictions
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)
            result = await db.execute(
                select(Prediction)
                .where(
                    Prediction.symbol == symbol,
                    Prediction.created_at >= cutoff_date,
                    Prediction.target_date <= datetime.utcnow()
                )
                .order_by(Prediction.created_at.desc())
            )
            predictions = result.scalars().all()
            
            if not predictions:
                return {"accuracy": 0, "total_predictions": 0}
            
            # Get actual prices for comparison
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=f"{days_back + 30}d")
            
            accurate_predictions = 0
            total_predictions = len(predictions)
            
            for pred in predictions:
                target_date = pred.target_date.date()
                # Find closest actual price
                closest_date = min(hist.index.date, key=lambda x: abs(x - target_date))
                actual_price = hist.loc[hist.index.date == closest_date, 'Close'].iloc[0]
                
                # Calculate accuracy (within 5% is considered accurate)
                price_diff_percent = abs((pred.predicted_price - actual_price) / actual_price) * 100
                if price_diff_percent <= 5:
                    accurate_predictions += 1
            
            accuracy = (accurate_predictions / total_predictions) * 100 if total_predictions > 0 else 0
            
            return {
                "accuracy": round(accuracy, 2),
                "total_predictions": total_predictions,
                "accurate_predictions": accurate_predictions,
                "average_error_percent": round(
                    np.mean([
                        abs((p.predicted_price - p.current_price) / p.current_price) * 100 
                        for p in predictions
                    ]), 2
                ) if predictions else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting historical accuracy for {symbol}: {str(e)}")
            return {"accuracy": 0, "total_predictions": 0}
    
    @staticmethod
    async def batch_predict(
        db: AsyncSession,
        symbols: List[str],
        days_ahead: int = 30
    ) -> Dict[str, Optional[PredictionResponse]]:
        """Generate predictions for multiple symbols"""
        results = {}
        
        # Process predictions concurrently
        tasks = [
            PredictionService.get_prediction(db, symbol, days_ahead)
            for symbol in symbols
        ]
        
        predictions = await asyncio.gather(*tasks, return_exceptions=True)
        
        for symbol, prediction in zip(symbols, predictions):
            if isinstance(prediction, Exception):
                logger.error(f"Error predicting {symbol}: {prediction}")
                results[symbol] = None
            else:
                results[symbol] = prediction
        
        return results
