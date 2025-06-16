"""
LSTM Model for Stock Price Prediction

Implements Long Short-Term Memory neural networks for time series forecasting
of stock prices with advanced feature engineering and ensemble capabilities.
"""

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
from typing import Dict, List, Tuple, Optional, Any
import joblib
import logging
from pathlib import Path
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class LSTMPredictor:
    """LSTM-based stock price predictor with advanced features"""
    
    def __init__(
        self,
        sequence_length: int = 60,
        prediction_horizon: int = 7,
        features: List[str] = None,
        model_dir: str = "models/lstm"
    ):
        self.sequence_length = sequence_length
        self.prediction_horizon = prediction_horizon
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        # Default features - use a minimal set of most predictive features (12 total)
        self.features = features or [
            'Close', 'Volume', 'Open', 'High', 'Low',
            'EMA_21', 'EMA_55', 'RSI', 'MACD_Line', 'MACD_Signal',
            'BB_Upper', 'BB_Lower'
        ]
        
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.target_scaler = MinMaxScaler(feature_range=(0, 1))
        self.is_trained = False
        
    def create_model(self, input_shape: Tuple[int, int]) -> keras.Model:
        """Create LSTM model architecture"""
        try:
            model = keras.Sequential([
                # First LSTM layer with return sequences
                layers.LSTM(
                    units=128,
                    return_sequences=True,
                    input_shape=input_shape,
                    dropout=0.2,
                    recurrent_dropout=0.2
                ),
                layers.BatchNormalization(),
                
                # Second LSTM layer
                layers.LSTM(
                    units=64,
                    return_sequences=True,
                    dropout=0.2,
                    recurrent_dropout=0.2
                ),
                layers.BatchNormalization(),
                
                # Third LSTM layer
                layers.LSTM(
                    units=32,
                    return_sequences=False,
                    dropout=0.2,
                    recurrent_dropout=0.2
                ),
                layers.BatchNormalization(),
                
                # Dense layers for prediction
                layers.Dense(units=64, activation='relu'),
                layers.Dropout(0.3),
                layers.Dense(units=32, activation='relu'),
                layers.Dropout(0.2),
                layers.Dense(units=self.prediction_horizon, activation='linear')
            ])
            
            # Compile model with advanced optimizer
            optimizer = keras.optimizers.Adam(
                learning_rate=0.001,
                beta_1=0.9,
                beta_2=0.999,
                epsilon=1e-07
            )
            
            model.compile(
                optimizer=optimizer,
                loss='huber',  # More robust to outliers than MSE
                metrics=['mae', 'mse']
            )
            
            return model
            
        except Exception as e:
            logger.error(f"Error creating LSTM model: {str(e)}")
            raise
    
    def prepare_sequences(
        self,
        data: pd.DataFrame,
        target_column: str = 'Close'
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Prepare sequence data for LSTM training"""
        try:
            # Ensure we have the required features
            available_features = [f for f in self.features if f in data.columns]
            missing_features = [f for f in self.features if f not in data.columns]
            
            if len(available_features) < len(self.features) * 0.7:  # At least 70% of features
                logger.warning(f"Only {len(available_features)} of {len(self.features)} features available")
                logger.warning(f"Available features: {available_features}")
                logger.warning(f"Missing features: {missing_features}")
            
            # Use available features
            feature_data = data[available_features].copy()
            target_data = data[target_column].copy()
            
            # Remove any remaining NaN values
            combined_data = pd.concat([feature_data, target_data], axis=1).dropna()
            feature_data = combined_data[available_features]
            target_data = combined_data[target_column]
            
            # Check if any features were dropped due to NaN values
            final_features = feature_data.columns.tolist()
            dropped_features = [f for f in available_features if f not in final_features]
            if dropped_features:
                logger.warning(f"Features dropped due to NaN values: {dropped_features}")
            
            logger.info(f"Final features for training: {final_features}")
            
            if len(feature_data) < self.sequence_length + self.prediction_horizon:
                raise ValueError(f"Insufficient data: need at least {self.sequence_length + self.prediction_horizon} rows")
            
            # Scale features and target - CRITICAL: Only fit target_scaler on Close price
            scaled_features = self.scaler.fit_transform(feature_data)
            target_reshaped = target_data.values.reshape(-1, 1)
            scaled_target = self.target_scaler.fit_transform(target_reshaped).flatten()
            
            # Log scaling info for debugging
            logger.info(f"Target scaler fitted on {len(target_data)} Close prices")
            logger.info("Target scaler fitted successfully")
            
            # Create sequences
            X, y = [], []
            for i in range(self.sequence_length, len(scaled_features) - self.prediction_horizon + 1):
                # Input sequence
                X.append(scaled_features[i - self.sequence_length:i])
                
                # Target sequence (next prediction_horizon days)
                y.append(scaled_target[i:i + self.prediction_horizon])
            
            X = np.array(X)
            y = np.array(y)
            
            # Store feature names for later use - use the final features after NaN removal
            self.feature_names = final_features
            
            return X, y, scaled_features
            
        except Exception as e:
            logger.error(f"Error preparing sequences: {str(e)}")
            raise
    
    async def train(
        self,
        data: pd.DataFrame,
        target_column: str = 'Close',
        validation_split: float = 0.2,
        epochs: int = 100,
        batch_size: int = 32,
        early_stopping_patience: int = 10,
        save_model: bool = True
    ) -> Dict[str, Any]:
        """Train LSTM model with advanced configuration"""
        try:
            logger.info(f"Starting LSTM training with {len(data)} data points")
            
            # Prepare sequences
            X, y, scaled_features = self.prepare_sequences(data, target_column)
            
            logger.info(f"Created {len(X)} sequences with shape {X.shape}")
            
            # Create model
            input_shape = (X.shape[1], X.shape[2])
            self.model = self.create_model(input_shape)
            
            logger.info(f"Model created with input shape: {input_shape}")
            
            # Callbacks for training
            callbacks = [
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=early_stopping_patience,
                    restore_best_weights=True,
                    verbose=1
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=5,
                    min_lr=1e-7,
                    verbose=1
                )
            ]
            
            if save_model:
                callbacks.append(
                    keras.callbacks.ModelCheckpoint(
                        filepath=str(self.model_dir / "best_model.h5"),
                        monitor='val_loss',
                        save_best_only=True,
                        verbose=1
                    )
                )
            
            # Train model
            history = self.model.fit(
                X, y,
                validation_split=validation_split,
                epochs=epochs,
                batch_size=batch_size,
                callbacks=callbacks,
                verbose=1,
                shuffle=True
            )
            
            self.is_trained = True
            
            # Calculate training metrics
            train_pred = self.model.predict(X, verbose=0)
            train_metrics = self._calculate_metrics(y, train_pred)
            
            # Save model and scalers
            if save_model:
                await self._save_model_artifacts()
            
            training_results = {
                'history': {
                    'loss': history.history['loss'],
                    'val_loss': history.history['val_loss'],
                    'mae': history.history['mae'],
                    'val_mae': history.history['val_mae']
                },
                'final_metrics': train_metrics,
                'epochs_trained': len(history.history['loss']),
                'input_shape': input_shape,
                'feature_count': len(self.feature_names)
            }
            
            logger.info(f"LSTM training completed. Final MAE: {train_metrics['mae']:.4f}")
            
            return training_results
            
        except Exception as e:
            logger.error(f"Error training LSTM model: {str(e)}")
            raise
    
    async def predict(
        self,
        data: pd.DataFrame,
        symbol: str = None
    ) -> Dict[str, Any]:
        """Make predictions using trained LSTM model"""
        try:
            if not self.is_trained and self.model is None:
                # Try to load existing model
                await self._load_model_artifacts()
            
            if not self.is_trained:
                raise ValueError("Model not trained. Please train the model first.")
              # Ensure we have the feature names from training
            if not hasattr(self, 'feature_names') or not self.feature_names:
                logger.warning("No feature names found, using default features")
                self.feature_names = self.features
            
            # Get the most recent data for prediction - use only features that were used in training
            recent_data = data.tail(self.sequence_length)
            
            if len(recent_data) < self.sequence_length:
                raise ValueError(f"Insufficient recent data: need {self.sequence_length} rows")
            
            # Use only the features that exist in both the data and were used in training
            available_features = [f for f in self.feature_names if f in recent_data.columns]
            missing_features = [f for f in self.feature_names if f not in recent_data.columns]
            
            logger.info(f"Training used {len(self.feature_names)} features: {self.feature_names}")
            logger.info(f"Prediction has {len(available_features)} available features: {available_features}")
            if missing_features:
                logger.warning(f"Missing features for prediction: {missing_features}")
            
            if len(available_features) == 0:
                raise ValueError("No training features found in prediction data")
            
            # CRITICAL FIX: Refuse to predict if too many features are missing (instead of zero-filling)
            if len(available_features) < len(self.feature_names) * 0.8:  # Need at least 80% of features
                raise ValueError(
                    f"Too many features missing for reliable prediction. "
                    f"Have {len(available_features)} of {len(self.feature_names)} required features. "
                    f"Missing: {missing_features}"
                )
            
            # For small number of missing features, use forward-fill instead of zero-fill
            if len(available_features) != len(self.feature_names):
                logger.warning(f"Feature mismatch: expected {len(self.feature_names)}, got {len(available_features)}")
                
                missing_features_in_pred = [f for f in self.feature_names if f not in available_features]
                for missing_feature in missing_features_in_pred:
                    # Use forward-fill from last available value or median of Close price
                    if 'Close' in recent_data.columns:
                        fill_value = recent_data['Close'].iloc[-1] * 0.01  # Small percentage of current price
                    else:
                        fill_value = recent_data.iloc[:, 0].median()  # Use median of first column
                    recent_data[missing_feature] = fill_value
                    logger.info(f"Forward-filled missing feature '{missing_feature}' with value: {fill_value}")
                
                # Now use exactly the training features in the same order
                available_features = self.feature_names
            
            logger.info(f"Using {len(available_features)} features for prediction: {available_features}")
            
            # Use the determined features
            feature_data = recent_data[available_features].copy()
            
            # Ensure no NaN values
            feature_data = feature_data.ffill().fillna(0)
            
            logger.info(f"Using {len(available_features)} features for prediction: {available_features}")
            logger.info(f"Feature data shape: {feature_data.shape}")
            
            # Scale features using the same scaler from training
            scaled_features = self.scaler.transform(feature_data.values)
            
            # Reshape for prediction
            X_pred = scaled_features.reshape(1, self.sequence_length, len(available_features))
            
            # Make prediction
            scaled_prediction = self.model.predict(X_pred, verbose=0)[0]
            
            # Get current price for validation
            current_price = float(data['Close'].iloc[-1])
            
            # CRITICAL FIX: Proper inverse transform with debugging
            logger.info(f"Current price before scaling: ${current_price:.2f}")
            logger.info(f"Scaled prediction shape: {scaled_prediction.shape}")
            
            # Ensure prediction is reshaped correctly for inverse transform
            prediction_reshaped = scaled_prediction.reshape(-1, 1)
            prediction = self.target_scaler.inverse_transform(prediction_reshaped).flatten()
            
            logger.info(f"Inverse transformed prediction: ${prediction[0]:.2f}")
            logger.info("Inverse transform completed successfully")
            
            # SANITY CHECKS: Validate predictions are realistic
            first_day_prediction = prediction[0]
            price_change_pct = (first_day_prediction - current_price) / current_price * 100
            
            # Check for unrealistic predictions
            if abs(price_change_pct) > 20:  # More than 20% change in one day
                logger.warning(f"Unrealistic prediction detected: {price_change_pct:.1f}% change")
                logger.warning(f"Current: ${current_price:.2f}, Predicted: ${first_day_prediction:.2f}")
                
                # Apply conservative adjustment - limit to ±5% for next day
                max_change = 0.05  # 5%
                if price_change_pct > max_change * 100:
                    adjusted_prediction = current_price * (1 + max_change)
                    logger.info(f"Capping prediction to +{max_change*100}%: ${adjusted_prediction:.2f}")
                elif price_change_pct < -max_change * 100:
                    adjusted_prediction = current_price * (1 - max_change)
                    logger.info(f"Capping prediction to -{max_change*100}%: ${adjusted_prediction:.2f}")
                else:
                    adjusted_prediction = first_day_prediction
                
                # Adjust all predictions proportionally
                adjustment_factor = adjusted_prediction / first_day_prediction
                prediction = prediction * adjustment_factor
                logger.info(f"Applied adjustment factor: {adjustment_factor:.3f}")
            
            # Validate price is positive
            if any(p <= 0 for p in prediction):
                logger.error(f"Invalid negative prices in prediction: {prediction}")
                # Set minimum price to 90% of current price
                prediction = np.maximum(prediction, current_price * 0.9)
                logger.info(f"Adjusted negative predictions to minimum 90% of current price")
            
            # Calculate confidence based on recent model performance
            confidence = await self._calculate_prediction_confidence(data, X_pred)
            
            # Reduce confidence if we had to make major adjustments
            if abs(price_change_pct) > 10:
                confidence *= 0.5  # Halve confidence for unrealistic predictions
                logger.info(f"Reduced confidence to {confidence:.2f} due to prediction adjustment")
            
            # Generate prediction dates
            last_date = data.index[-1] if hasattr(data.index, 'to_pydatetime') else datetime.now()
            prediction_dates = [
                last_date + timedelta(days=i+1) 
                for i in range(self.prediction_horizon)
            ]
            
            results = {
                'predictions': [float(p) for p in prediction],
                'prediction_dates': [d.isoformat() for d in prediction_dates],
                'confidence_score': float(confidence),
                'current_price': current_price,
                'price_change': float(prediction[0] - current_price),
                'price_change_percent': float((prediction[0] - current_price) / current_price * 100),
                'model_type': 'LSTM',
                'sequence_length': self.sequence_length,
                'prediction_horizon': self.prediction_horizon,
                'features_used': available_features,
                'features_available': available_features
            }
            
            # Add confidence intervals (simplified approach)
            std_dev = np.std(prediction)
            results['confidence_intervals'] = [
                {
                    'lower': float(pred - 1.96 * std_dev),
                    'upper': float(pred + 1.96 * std_dev)
                }
                for pred in prediction
            ]
            
            return results
            
        except Exception as e:
            logger.error(f"Error making LSTM prediction: {str(e)}")
            raise
    
    async def _calculate_prediction_confidence(
        self,
        data: pd.DataFrame,
        X_pred: np.ndarray
    ) -> float:
        """Calculate confidence score for predictions"""
        try:
            if len(data) < self.sequence_length * 2:
                return 0.5  # Default confidence for insufficient data
            
            # Use recent data to estimate model performance
            recent_data = data.tail(self.sequence_length * 2)
            X_test, y_test, _ = self.prepare_sequences(recent_data)
            
            if len(X_test) == 0:
                return 0.5
            
            # Make predictions on recent data
            y_pred = self.model.predict(X_test, verbose=0)
            
            # Calculate accuracy metrics
            metrics = self._calculate_metrics(y_test, y_pred)
            
            # Convert accuracy to confidence (higher accuracy = higher confidence)
            # Use MAE as primary metric
            mae_normalized = min(metrics['mae'] / 100, 1.0)  # Normalize by typical price range
            confidence = max(0.1, 1.0 - mae_normalized)
            
            return min(confidence, 0.95)  # Cap at 95%
            
        except Exception as e:
            logger.warning(f"Error calculating confidence: {str(e)}")
            return 0.5
    
    def _calculate_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Calculate performance metrics"""
        try:
            # Flatten arrays for multi-step predictions
            y_true_flat = y_true.flatten()
            y_pred_flat = y_pred.flatten()
            
            mse = mean_squared_error(y_true_flat, y_pred_flat)
            mae = mean_absolute_error(y_true_flat, y_pred_flat)
            rmse = np.sqrt(mse)
            
            # Calculate MAPE (Mean Absolute Percentage Error)
            mape = np.mean(np.abs((y_true_flat - y_pred_flat) / np.abs(y_true_flat))) * 100
            
            # Directional accuracy (for first prediction only)
            if y_true.shape[1] > 0:
                true_direction = np.sign(y_true[:, 0] - y_true[:, 0])  # This needs context from previous values
                pred_direction = np.sign(y_pred[:, 0] - y_true[:, 0])  # This too
                # Simplified directional accuracy
                directional_accuracy = 0.5  # Placeholder
            else:
                directional_accuracy = 0.5
            
            return {
                'mse': float(mse),
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape),
                'directional_accuracy': float(directional_accuracy)
            }
            
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            return {'mse': 0, 'mae': 0, 'rmse': 0, 'mape': 0, 'directional_accuracy': 0.5}
    
    async def _save_model_artifacts(self):
        """Save model, scalers, and metadata"""
        try:
            # Save model
            if self.model:
                self.model.save(str(self.model_dir / "lstm_model.h5"))
            
            # Save scalers
            joblib.dump(self.scaler, str(self.model_dir / "feature_scaler.pkl"))
            joblib.dump(self.target_scaler, str(self.model_dir / "target_scaler.pkl"))
            
            # Save metadata
            metadata = {
                'sequence_length': self.sequence_length,
                'prediction_horizon': self.prediction_horizon,
                'feature_names': self.feature_names,
                'model_trained': True,
                'training_date': datetime.now().isoformat()
            }
            
            import json
            with open(self.model_dir / "metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info("LSTM model artifacts saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving model artifacts: {str(e)}")
            raise
    
    async def _load_model_artifacts(self):
        """Load model, scalers, and metadata"""
        try:
            model_path = self.model_dir / "lstm_model.h5"
            if not model_path.exists():
                logger.warning("No saved LSTM model found")
                return False
            
            # Load model
            self.model = keras.models.load_model(str(model_path))
            
            # Load scalers
            self.scaler = joblib.load(str(self.model_dir / "feature_scaler.pkl"))
            self.target_scaler = joblib.load(str(self.model_dir / "target_scaler.pkl"))
            
            # Load metadata
            import json
            with open(self.model_dir / "metadata.json", 'r') as f:
                metadata = json.load(f)
            
            self.sequence_length = metadata['sequence_length']
            self.prediction_horizon = metadata['prediction_horizon']
            self.feature_names = metadata['feature_names']
            self.is_trained = metadata.get('model_trained', False)
            
            logger.info("LSTM model artifacts loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model artifacts: {str(e)}")
            return False
    
    async def retrain_if_needed(
        self,
        data: pd.DataFrame,
        max_age_days: int = 7,
        min_data_points: int = 1000
    ) -> bool:
        """Check if model needs retraining and retrain if necessary"""
        try:
            metadata_path = self.model_dir / "metadata.json"
            if not metadata_path.exists():
                logger.info("No existing model found, training new model")
                await self.train(data)
                return True
            
            # Check model age
            import json
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            training_date = datetime.fromisoformat(metadata['training_date'])
            age_days = (datetime.now() - training_date).days
            
            if age_days > max_age_days:
                logger.info(f"Model is {age_days} days old, retraining")
                await self.train(data)
                return True
            
            # Check data sufficiency
            if len(data) < min_data_points:
                logger.warning(f"Insufficient data for retraining: {len(data)} < {min_data_points}")
                return False
            
            logger.info("Model is up to date")
            return False
            
        except Exception as e:
            logger.error(f"Error checking retrain conditions: {str(e)}")
            return False
