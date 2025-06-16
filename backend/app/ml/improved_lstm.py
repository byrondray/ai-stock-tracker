"""
Improved LSTM Model for Stock Price Prediction

Implements a robust LSTM predictor with proper feature engineering,
validation, and prediction constraints.
"""

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import MinMaxScaler, RobustScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from typing import Dict, List, Tuple, Optional, Any
import joblib
import logging
from pathlib import Path
import json
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

from .feature_store import FeatureStore

logger = logging.getLogger(__name__)


class ImprovedLSTMPredictor:
    """
    Improved LSTM predictor with robust feature engineering and validation.
    """
    
    def __init__(
        self,
        sequence_length: int = 60,
        prediction_horizon: int = 7,
        model_dir: str = "models/lstm"
    ):
        self.sequence_length = sequence_length
        self.prediction_horizon = prediction_horizon
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
          # Essential features for LSTM prediction with proper technical indicators
        self.essential_features = [
            'Close', 'Volume', 'Returns', 'Log_Returns',
            'SMA_10', 'SMA_20', 'EMA_12', 'EMA_26',
            'RSI', 'MACD', 'MACD_Signal',
            'BB_Upper', 'BB_Lower', 'BB_Width',
            'Volume_SMA_10', 'Price_Volume_Ratio', 'ATR', 'ADX'
        ]
        
        # Initialize components
        self.feature_store = FeatureStore()
        self.model = None
        self.feature_scaler = RobustScaler()  # More robust to outliers
        self.target_scaler = MinMaxScaler(feature_range=(0, 1))
        self.is_trained = False
        self.trained_features = []
        self.training_stats = {}
        self.validation_results = {}
    
    async def train(
        self, 
        data: pd.DataFrame, 
        symbol: str,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.2,
        early_stopping_patience: int = 10
    ) -> Dict[str, Any]:
        """
        Train the LSTM model with proper feature engineering and validation.
        """
        try:
            logger.info(f"Starting LSTM training for {symbol}")
            
            # 1. Validate input data
            if not self._validate_input_data(data):
                raise ValueError("Input data validation failed")
            
            # 2. Prepare features with feature store
            prepared_data = await self._prepare_features(data, symbol)
            if prepared_data.empty:
                raise ValueError("Feature preparation failed")
            
            # 3. Validate we have enough data
            min_required_samples = self.sequence_length + self.prediction_horizon + 50
            if len(prepared_data) < min_required_samples:
                raise ValueError(f"Insufficient data: {len(prepared_data)} samples, need at least {min_required_samples}")
            
            # 4. Create sequences for LSTM
            X, y = self._create_sequences(prepared_data)
            if len(X) == 0:
                raise ValueError("No valid sequences created")
            
            # 5. Split data
            split_idx = int(len(X) * (1 - validation_split))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            logger.info(f"Training samples: {len(X_train)}, Validation samples: {len(X_val)}")
            
            # 6. Build and compile model
            self.model = self._build_model(X_train.shape)
            
            # 7. Train model
            callbacks = [
                keras.callbacks.EarlyStopping(
                    patience=early_stopping_patience,
                    restore_best_weights=True,
                    monitor='val_loss'
                ),
                keras.callbacks.ReduceLROnPlateau(
                    factor=0.5,
                    patience=5,
                    min_lr=1e-7,
                    monitor='val_loss'
                )
            ]
            
            history = self.model.fit(
                X_train, y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_data=(X_val, y_val),
                callbacks=callbacks,
                verbose=0
            )
            
            # 8. Validate model performance
            self.validation_results = self._validate_model_performance(
                X_val, y_val, prepared_data, symbol
            )
            
            # 9. Save model and metadata
            await self._save_model_artifacts(symbol, history, prepared_data)
            
            self.is_trained = True
            logger.info(f"LSTM training completed for {symbol}")
            
            return {
                "training_loss": float(history.history['loss'][-1]),
                "validation_loss": float(history.history['val_loss'][-1]),
                "validation_metrics": self.validation_results,
                "epochs_trained": len(history.history['loss']),
                "features_used": self.trained_features
            }
            
        except Exception as e:
            logger.error(f"LSTM training failed for {symbol}: {str(e)}")
            raise
    
    async def predict(
        self, 
        data: pd.DataFrame, 
        symbol: str,
        apply_constraints: bool = True
    ) -> Dict[str, Any]:
        """
        Make predictions with proper validation and constraints.
        """
        try:
            logger.info(f"Making LSTM predictions for {symbol}")
            
            # 1. Load model if not already loaded
            if not self.is_trained:
                await self._load_model_artifacts(symbol)
            
            if not self.is_trained:
                raise ValueError(f"No trained model found for {symbol}")
            
            # 2. Validate feature consistency
            can_predict, missing_features = self.feature_store.validate_features(
                data, self.trained_features
            )
            if not can_predict:
                raise ValueError(f"Cannot predict: {missing_features}")
            
            # 3. Prepare features using exact same pipeline as training
            prepared_data = await self._prepare_features_for_prediction(data, symbol)
            if prepared_data.empty:
                raise ValueError("Feature preparation for prediction failed")
            
            # 4. Create sequences for prediction
            X_pred = self._create_prediction_sequences(prepared_data)
            if len(X_pred) == 0:
                raise ValueError("No valid prediction sequences created")
            
            # 5. Make predictions
            scaled_predictions = self.model.predict(X_pred, verbose=0)
            
            # 6. Inverse transform predictions
            predictions = self.target_scaler.inverse_transform(scaled_predictions.reshape(-1, 1)).flatten()
            
            # 7. Apply volatility constraints if enabled
            if apply_constraints:
                predictions = self._apply_volatility_constraints(
                    predictions, prepared_data, symbol
                )
            
            # 8. Calculate confidence intervals
            confidence_intervals = self._calculate_confidence_intervals(
                predictions, prepared_data
            )
            
            # 9. Create prediction dates
            last_date = prepared_data.index[-1] if hasattr(prepared_data.index, 'to_pydatetime') else datetime.utcnow()
            prediction_dates = [
                last_date + timedelta(days=i+1) for i in range(len(predictions))
            ]
            
            result = {
                "predictions": predictions.tolist(),
                "prediction_dates": [d.isoformat() for d in prediction_dates],
                "confidence_intervals": confidence_intervals,
                "current_price": float(prepared_data['Close'].iloc[-1]),
                "confidence_score": self._calculate_overall_confidence(),
                "features_used": self.trained_features,
                "model_type": "LSTM Neural Network",
                "sequence_length": self.sequence_length,
                "prediction_horizon": self.prediction_horizon
            }
            
            logger.info(f"LSTM predictions completed for {symbol}: {len(predictions)} predictions")
            return result
            
        except Exception as e:
            logger.error(f"LSTM prediction failed for {symbol}: {str(e)}")
            raise
    
    async def retrain_if_needed(
        self, 
        data: pd.DataFrame, 
        symbol: str,
        max_age_days: int = 7,
        min_data_points: int = 200
    ) -> bool:
        """
        Check if model needs retraining based on age and data availability.
        """
        try:
            model_path = self.model_dir / f"{symbol}_model.h5"
            metadata_path = self.model_dir / f"{symbol}_metadata.json"
            
            # Check if model exists
            if not model_path.exists() or not metadata_path.exists():
                logger.info(f"No existing model found for {symbol}, retraining needed")
                return True
            
            # Load metadata to check age
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            last_trained = datetime.fromisoformat(metadata.get('trained_at', '2000-01-01'))
            days_since_training = (datetime.utcnow() - last_trained).days
            
            if days_since_training > max_age_days:
                logger.info(f"Model for {symbol} is {days_since_training} days old, retraining needed")
                return True
            
            # Check if we have sufficient new data
            if len(data) < min_data_points:
                logger.warning(f"Insufficient data for {symbol}: {len(data)} points, need {min_data_points}")
                return False
            
            logger.info(f"Model for {symbol} is up to date ({days_since_training} days old)")
            return False
            
        except Exception as e:
            logger.error(f"Error checking retrain need for {symbol}: {str(e)}")
            return True
    
    def _validate_input_data(self, data: pd.DataFrame) -> bool:
        """Validate input data quality"""
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        
        # Check required columns
        missing_cols = [col for col in required_columns if col not in data.columns]
        if missing_cols:
            logger.error(f"Missing required columns: {missing_cols}")
            return False
        
        # Check for sufficient data
        if len(data) < 100:
            logger.error(f"Insufficient data: {len(data)} rows")
            return False
        
        # Check for data quality issues
        numeric_cols = ['Open', 'High', 'Low', 'Close', 'Volume']
        for col in numeric_cols:
            if data[col].isna().sum() > len(data) * 0.1:  # More than 10% missing
                logger.error(f"Too many missing values in {col}: {data[col].isna().sum()}")
                return False
            
            if (data[col] <= 0).any():
                logger.warning(f"Found non-positive values in {col}")
        
        # Check for basic data consistency
        invalid_ohlc = (data['High'] < data['Low']) | (data['Close'] > data['High']) | (data['Close'] < data['Low'])
        if invalid_ohlc.any():
            logger.warning(f"Found {invalid_ohlc.sum()} rows with invalid OHLC data")
        
        return True
    
    async def _prepare_features(self, data: pd.DataFrame, symbol: str) -> pd.DataFrame:
        """Prepare features using the feature store"""
        try:
            # Calculate features using feature store
            prepared_data = self.feature_store.calculate_features(data, self.essential_features)
            
            # Validate features were calculated
            can_predict, missing = self.feature_store.validate_features(
                prepared_data, self.essential_features
            )
            if not can_predict:
                logger.error(f"Feature calculation failed: {missing}")
                return pd.DataFrame()
            
            # Store the features that were successfully calculated
            self.trained_features = [f for f in self.essential_features if f in prepared_data.columns]
            
            # Handle missing values with forward fill, then backward fill
            prepared_data = prepared_data.fillna(method='ffill').fillna(method='bfill')
            
            # Drop rows that still have NaN after filling
            initial_len = len(prepared_data)
            prepared_data = prepared_data.dropna()
            dropped_rows = initial_len - len(prepared_data)
            
            if dropped_rows > 0:
                logger.info(f"Dropped {dropped_rows} rows with NaN values after feature calculation")
            
            # Scale features
            feature_data = prepared_data[self.trained_features]
            scaled_features = self.feature_scaler.fit_transform(feature_data)
            
            # Create scaled dataframe
            scaled_df = pd.DataFrame(
                scaled_features, 
                columns=self.trained_features,
                index=prepared_data.index
            )
            
            # Add target variable (scaled)
            target_data = prepared_data['Close'].values.reshape(-1, 1)
            scaled_target = self.target_scaler.fit_transform(target_data).flatten()
            scaled_df['target'] = scaled_target
            
            # Save feature store configuration
            self.feature_store.save_feature_config(symbol, self.trained_features)
            
            logger.info(f"Prepared {len(scaled_df)} samples with {len(self.trained_features)} features")
            return scaled_df
            
        except Exception as e:
            logger.error(f"Feature preparation failed: {str(e)}")
            return pd.DataFrame()
    
    async def _prepare_features_for_prediction(self, data: pd.DataFrame, symbol: str) -> pd.DataFrame:
        """Prepare features for prediction using saved configuration"""
        try:
            # Load feature configuration
            config = self.feature_store.load_feature_config(symbol)
            if not config:
                raise ValueError(f"No feature configuration found for {symbol}")
            
            # Use the exact same features as training
            features_to_calculate = config['features']
            
            # Calculate features
            prepared_data = self.feature_store.calculate_features(data, features_to_calculate)
            
            # Validate all required features are present
            missing_features = [f for f in features_to_calculate if f not in prepared_data.columns]
            if missing_features:
                raise ValueError(f"Missing features for prediction: {missing_features}")
            
            # Handle missing values same way as training
            prepared_data = prepared_data.fillna(method='ffill').fillna(method='bfill')
            prepared_data = prepared_data.dropna()
            
            # Scale features using fitted scaler
            feature_data = prepared_data[features_to_calculate]
            scaled_features = self.feature_scaler.transform(feature_data)
            
            # Create scaled dataframe
            scaled_df = pd.DataFrame(
                scaled_features,
                columns=features_to_calculate,
                index=prepared_data.index
            )
            
            # Add original close prices for constraint calculation
            scaled_df['Close'] = prepared_data['Close']
            
            return scaled_df
            
        except Exception as e:
            logger.error(f"Feature preparation for prediction failed: {str(e)}")
            return pd.DataFrame()
    
    def _create_sequences(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training"""
        X, y = [], []
        
        feature_columns = [col for col in data.columns if col != 'target']
        
        for i in range(self.sequence_length, len(data) - self.prediction_horizon + 1):
            # Input sequence
            X.append(data[feature_columns].iloc[i-self.sequence_length:i].values)
            
            # Target (future close price)
            y.append(data['target'].iloc[i + self.prediction_horizon - 1])
        
        return np.array(X), np.array(y)
    
    def _create_prediction_sequences(self, data: pd.DataFrame) -> np.ndarray:
        """Create sequences for prediction"""
        X = []
        
        feature_columns = [col for col in data.columns if col != 'Close']
        
        if len(data) >= self.sequence_length:
            # Use the last sequence_length data points
            X.append(data[feature_columns].iloc[-self.sequence_length:].values)
        
        return np.array(X)
    
    def _build_model(self, input_shape: Tuple[int, int, int]) -> keras.Model:
        """Build LSTM model with improved architecture"""
        model = keras.Sequential([
            # First LSTM layer with dropout
            layers.LSTM(
                128, 
                return_sequences=True, 
                input_shape=(input_shape[1], input_shape[2]),
                dropout=0.2,
                recurrent_dropout=0.2
            ),
            layers.BatchNormalization(),
            
            # Second LSTM layer
            layers.LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.2),
            layers.BatchNormalization(),
            
            # Third LSTM layer
            layers.LSTM(32, dropout=0.2),
            layers.BatchNormalization(),
            
            # Dense layers with regularization
            layers.Dense(16, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(8, activation='relu'),
            layers.Dropout(0.2),
            
            # Output layer
            layers.Dense(1, activation='linear')
        ])
        
        # Compile with appropriate optimizer and loss
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae', 'mape']
        )
        
        return model
    
    def _validate_model_performance(
        self, 
        X_val: np.ndarray, 
        y_val: np.ndarray, 
        data: pd.DataFrame,
        symbol: str
    ) -> Dict[str, float]:
        """Validate model performance on validation set"""
        try:
            # Make predictions on validation set
            y_pred = self.model.predict(X_val, verbose=0).flatten()
            
            # Calculate metrics
            mse = mean_squared_error(y_val, y_pred)
            mae = mean_absolute_error(y_val, y_pred)
            rmse = np.sqrt(mse)
            
            # Calculate R-squared
            r2 = r2_score(y_val, y_pred)
            
            # Calculate directional accuracy
            y_val_diff = np.diff(y_val)
            y_pred_diff = np.diff(y_pred)
            directional_accuracy = np.mean(np.sign(y_val_diff) == np.sign(y_pred_diff))
            
            # Convert to real prices for error calculation
            y_val_real = self.target_scaler.inverse_transform(y_val.reshape(-1, 1)).flatten()
            y_pred_real = self.target_scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()
            
            # Calculate percentage error
            percentage_error = np.mean(np.abs((y_val_real - y_pred_real) / y_val_real)) * 100
            
            validation_results = {
                'mse': float(mse),
                'mae': float(mae),
                'rmse': float(rmse),
                'r2_score': float(r2),
                'directional_accuracy': float(directional_accuracy),
                'percentage_error': float(percentage_error)
            }
            
            logger.info(f"Validation results for {symbol}: {validation_results}")
            return validation_results
            
        except Exception as e:
            logger.error(f"Model validation failed: {str(e)}")
            return {}
    
    def _apply_volatility_constraints(
        self, 
        predictions: np.ndarray, 
        data: pd.DataFrame, 
        symbol: str
    ) -> np.ndarray:
        """Apply volatility constraints to predictions"""
        try:
            # Calculate historical volatility
            returns = data['Close'].pct_change().dropna()
            daily_volatility = returns.std()
            
            # Set maximum daily change (3 sigma)
            max_daily_change = 3 * daily_volatility
            
            current_price = data['Close'].iloc[-1]
            constrained_predictions = []
            
            for i, pred_price in enumerate(predictions):
                if i == 0:
                    # First prediction relative to current price
                    max_change = max_daily_change
                    reference_price = current_price
                else:
                    # Subsequent predictions relative to previous prediction
                    max_change = max_daily_change * np.sqrt(i + 1)  # Scale with time
                    reference_price = constrained_predictions[i - 1]
                
                # Calculate percentage change
                pct_change = (pred_price - reference_price) / reference_price
                
                # Apply constraints
                if abs(pct_change) > max_change:
                    constrained_price = reference_price * (1 + np.sign(pct_change) * max_change)
                    constrained_predictions.append(constrained_price)
                    logger.debug(f"Constrained prediction {i}: {pred_price:.2f} -> {constrained_price:.2f}")
                else:
                    constrained_predictions.append(pred_price)
            
            return np.array(constrained_predictions)
            
        except Exception as e:
            logger.error(f"Error applying volatility constraints: {str(e)}")
            return predictions
    
    def _calculate_confidence_intervals(
        self, 
        predictions: np.ndarray, 
        data: pd.DataFrame
    ) -> List[Dict[str, float]]:
        """Calculate confidence intervals for predictions"""
        try:
            # Use historical volatility to estimate confidence intervals
            returns = data['Close'].pct_change().dropna()
            volatility = returns.std()
            
            confidence_intervals = []
            
            for i, pred_price in enumerate(predictions):
                # Confidence decreases with prediction horizon
                time_factor = np.sqrt(i + 1)
                interval_width = pred_price * volatility * time_factor * 1.96  # 95% confidence
                
                confidence_intervals.append({
                    'lower': float(max(0, pred_price - interval_width)),
                    'upper': float(pred_price + interval_width),
                    'confidence': float(max(0.2, 0.8 - (i * 0.1)))  # Decreasing confidence
                })
            
            return confidence_intervals
            
        except Exception as e:
            logger.error(f"Error calculating confidence intervals: {str(e)}")
            return [{'lower': float(p * 0.95), 'upper': float(p * 1.05), 'confidence': 0.5} for p in predictions]
    
    def _calculate_overall_confidence(self) -> float:
        """Calculate overall confidence score based on validation results"""
        try:
            if not self.validation_results:
                return 0.5
            
            # Base confidence on validation metrics
            r2 = self.validation_results.get('r2_score', 0)
            directional_accuracy = self.validation_results.get('directional_accuracy', 0.5)
            percentage_error = self.validation_results.get('percentage_error', 50)
            
            # Calculate weighted confidence score
            r2_score = max(0, min(1, r2))  # Clamp between 0 and 1
            direction_score = directional_accuracy
            error_score = max(0, 1 - (percentage_error / 100))  # Convert percentage error to score
            
            confidence = (r2_score * 0.4 + direction_score * 0.4 + error_score * 0.2)
            return float(max(0.2, min(0.9, confidence)))  # Clamp between 0.2 and 0.9
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.5
    
    async def _save_model_artifacts(
        self, 
        symbol: str, 
        history: keras.callbacks.History,
        data: pd.DataFrame
    ):
        """Save model and all related artifacts"""
        try:
            # Save model
            model_path = self.model_dir / f"{symbol}_model.h5"
            self.model.save(model_path)
            
            # Save scalers
            scaler_path = self.model_dir / f"{symbol}_feature_scaler.pkl"
            target_scaler_path = self.model_dir / f"{symbol}_target_scaler.pkl"
            joblib.dump(self.feature_scaler, scaler_path)
            joblib.dump(self.target_scaler, target_scaler_path)
            
            # Save metadata
            metadata = {
                'symbol': symbol,
                'trained_at': datetime.utcnow().isoformat(),
                'sequence_length': self.sequence_length,
                'prediction_horizon': self.prediction_horizon,
                'features': self.trained_features,
                'data_samples': len(data),
                'training_history': {
                    'final_loss': float(history.history['loss'][-1]),
                    'final_val_loss': float(history.history['val_loss'][-1]),
                    'epochs': len(history.history['loss'])
                },
                'validation_results': self.validation_results
            }
            
            metadata_path = self.model_dir / f"{symbol}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Saved model artifacts for {symbol}")
            
        except Exception as e:
            logger.error(f"Error saving model artifacts: {str(e)}")
            raise
    
    async def _load_model_artifacts(self, symbol: str):
        """Load model and all related artifacts"""
        try:
            model_path = self.model_dir / f"{symbol}_model.h5"
            scaler_path = self.model_dir / f"{symbol}_feature_scaler.pkl"
            target_scaler_path = self.model_dir / f"{symbol}_target_scaler.pkl"
            metadata_path = self.model_dir / f"{symbol}_metadata.json"
            
            # Check if all files exist
            required_files = [model_path, scaler_path, target_scaler_path, metadata_path]
            missing_files = [f for f in required_files if not f.exists()]
            
            if missing_files:
                logger.warning(f"Missing model artifacts for {symbol}: {missing_files}")
                return False
            
            # Load model
            self.model = keras.models.load_model(model_path)
            
            # Load scalers
            self.feature_scaler = joblib.load(scaler_path)
            self.target_scaler = joblib.load(target_scaler_path)
            
            # Load metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            self.trained_features = metadata['features']
            self.validation_results = metadata.get('validation_results', {})
            self.is_trained = True
            
            logger.info(f"Loaded model artifacts for {symbol}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model artifacts for {symbol}: {str(e)}")
            return False
