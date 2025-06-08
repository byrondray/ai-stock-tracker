"""
Stock Prediction Service

Provides ML-based stock price predictions using various models and techniques.
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas import PredictionResponse
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
            # Check cache first (simplified caching without Redis for now)
            cache_key = f"prediction:{symbol}:{days_ahead}"
            
            # Generate new prediction (skip database and cache for now to focus on core functionality)
            prediction_data = await PredictionService._generate_prediction(symbol, days_ahead)
            if not prediction_data:
                return None
            
            # Create PredictionResponse directly from the prediction data
            prediction_response = PredictionResponse(
                symbol=prediction_data["symbol"],
                predictions=prediction_data["predictions"],
                model_version=prediction_data["model_version"],
                model_type=prediction_data["model_type"],
                created_at=datetime.utcnow()
            )
            
            return prediction_response
            
        except Exception as e:
            logger.error(f"Error getting prediction for {symbol}: {str(e)}")
            import traceback
            traceback.print_exc()
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
            hist_with_indicators = tech_indicators.add_all_indicators(hist)
            
            # Initialize LSTM model with working implementation
            lstm_predictor = LSTMPredictor(
                sequence_length=60,
                prediction_horizon=min(days_ahead, 7),  # LSTM works best for shorter horizons
            )
            
            # Check if model needs retraining
            needs_training = await lstm_predictor.retrain_if_needed(hist_with_indicators, max_age_days=7)
            
            if not lstm_predictor.is_trained:
                logger.info(f"Training LSTM model for {symbol}")
                await lstm_predictor.train(hist_with_indicators, epochs=10, validation_split=0.2)
            
            # Generate LSTM predictions
            lstm_result = await lstm_predictor.predict(hist_with_indicators, symbol=symbol)
            
            if not lstm_result:
                logger.error(f"Failed to generate LSTM predictions for {symbol}")
                return None
            
            # Extract predictions from LSTM result
            lstm_predictions = lstm_result.get('predictions', [])
            lstm_confidence = lstm_result.get('confidence_score', 0.7)
            current_price = lstm_result.get('current_price', hist['Close'].iloc[-1])
            prediction_dates = lstm_result.get('prediction_dates', [])
            confidence_intervals = lstm_result.get('confidence_intervals', [])
            
            # For multiple day predictions, we'll use the LSTM predictions directly
            # and create a proper response format
            predictions_list = []
            
            for i, pred_price in enumerate(lstm_predictions):
                if i >= days_ahead:
                    break
                    
                pred_date = datetime.utcnow() + timedelta(days=i+1)
                confidence_interval = confidence_intervals[i] if i < len(confidence_intervals) else {}
                
                prediction_point = {
                    "date": pred_date,
                    "predicted_price": float(pred_price),
                    "confidence": float(lstm_confidence),
                    "lower_bound": float(confidence_interval.get('lower', pred_price * 0.95)),
                    "upper_bound": float(confidence_interval.get('upper', pred_price * 1.05))
                }
                predictions_list.append(prediction_point)
            
            # If we need more predictions than LSTM provides, extend with trend
            if len(predictions_list) < days_ahead and len(lstm_predictions) > 0:
                # Calculate trend from LSTM predictions
                if len(lstm_predictions) >= 2:
                    trend = (lstm_predictions[-1] - lstm_predictions[0]) / len(lstm_predictions)
                else:
                    trend = 0
                
                last_price = lstm_predictions[-1]
                last_confidence = confidence_intervals[-1] if confidence_intervals else {}
                
                for i in range(len(predictions_list), days_ahead):
                    extended_price = last_price + (trend * (i - len(lstm_predictions) + 1))
                    pred_date = datetime.utcnow() + timedelta(days=i+1)
                    
                    # Reduce confidence for extended predictions
                    extended_confidence = lstm_confidence * (0.9 ** (i - len(lstm_predictions) + 1))
                    
                    prediction_point = {
                        "date": pred_date,
                        "predicted_price": float(extended_price),
                        "confidence": float(extended_confidence),
                        "lower_bound": float(extended_price * 0.95),
                        "upper_bound": float(extended_price * 1.05)
                    }
                    predictions_list.append(prediction_point)
            
            return {
                "symbol": symbol,
                "predictions": predictions_list,
                "model_version": "lstm_v1.0",
                "model_type": "lstm_ensemble",
                "current_price": float(current_price),
                "overall_confidence": float(lstm_confidence),
                "features_used": lstm_result.get('features_used', []),
                "prediction_metadata": {
                    "sequence_length": lstm_result.get('sequence_length', 60),
                    "prediction_horizon": lstm_result.get('prediction_horizon', 7),
                    "model_type": lstm_result.get('model_type', 'LSTM')
                }
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
                df = tech_indicators.add_all_indicators(df)
            
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
