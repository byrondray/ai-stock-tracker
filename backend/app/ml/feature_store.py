"""
Feature Store for Stock Prediction

Manages feature engineering pipeline to ensure consistency between training and prediction.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Callable, Any, Optional, Tuple
import logging
import json
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class FeatureDefinition:
    """Definition of a feature including its calculation method and dependencies"""
    name: str
    dependencies: List[str]
    window_size: Optional[int] = None
    params: Dict[str, Any] = None
    description: str = ""
    
    def __post_init__(self):
        if self.params is None:
            self.params = {}


class FeatureStore:
    """
    Feature store that ensures consistent feature engineering across training and prediction.
    """
    
    def __init__(self, model_dir: str = "models/features"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.feature_definitions: Dict[str, FeatureDefinition] = {}
        self.feature_registry: Dict[str, Callable] = {}
        self._register_default_features()
    
    def _register_default_features(self):
        """Register default feature calculation functions"""
        
        # Basic price features
        self.register_feature(
            "Returns", 
            self._calculate_returns,
            ["Close"],
            description="Simple returns"
        )
        
        self.register_feature(
            "Log_Returns", 
            self._calculate_log_returns,
            ["Close"],
            description="Log returns"
        )
        
        # Moving averages
        self.register_feature(
            "SMA_10", 
            lambda df, **kwargs: df['Close'].rolling(window=10, min_periods=1).mean(),
            ["Close"],
            window_size=10,
            description="10-period Simple Moving Average"
        )
        
        self.register_feature(
            "SMA_20", 
            lambda df, **kwargs: df['Close'].rolling(window=20, min_periods=1).mean(),
            ["Close"],
            window_size=20,
            description="20-period Simple Moving Average"
        )
        
        self.register_feature(
            "EMA_12", 
            lambda df, **kwargs: df['Close'].ewm(span=12, min_periods=1).mean(),
            ["Close"],
            window_size=12,
            description="12-period Exponential Moving Average"
        )
        
        self.register_feature(
            "EMA_26", 
            lambda df, **kwargs: df['Close'].ewm(span=26, min_periods=1).mean(),
            ["Close"],
            window_size=26,
            description="26-period Exponential Moving Average"
        )
        
        # Technical indicators
        self.register_feature(
            "RSI", 
            self._calculate_rsi,
            ["Close"],
            window_size=14,
            params={"period": 14},
            description="Relative Strength Index"
        )
        
        self.register_feature(
            "MACD", 
            self._calculate_macd,
            ["EMA_12", "EMA_26"],
            description="MACD Line"
        )
        
        self.register_feature(
            "MACD_Signal", 
            self._calculate_macd_signal,
            ["MACD"],
            window_size=9,
            description="MACD Signal Line"
        )
        
        # Bollinger Bands
        self.register_feature(
            "BB_Upper", 
            self._calculate_bb_upper,
            ["Close"],
            window_size=20,
            params={"period": 20, "std_dev": 2},
            description="Bollinger Band Upper"
        )
        
        self.register_feature(
            "BB_Lower", 
            self._calculate_bb_lower,
            ["Close"],
            window_size=20,
            params={"period": 20, "std_dev": 2},
            description="Bollinger Band Lower"
        )
        
        self.register_feature(
            "BB_Width", 
            self._calculate_bb_width,
            ["BB_Upper", "BB_Lower", "SMA_20"],
            description="Bollinger Band Width"
        )
        
        # Volume indicators
        self.register_feature(
            "Volume_SMA_10", 
            lambda df, **kwargs: df['Volume'].rolling(window=10, min_periods=1).mean(),
            ["Volume"],
            window_size=10,
            description="10-period Volume Moving Average"
        )
        
        self.register_feature(
            "Price_Volume_Ratio", 
            self._calculate_price_volume_ratio,
            ["Close", "Volume", "Volume_SMA_10"],
            description="Price to Volume Ratio"
        )
        
        # ATR
        self.register_feature(
            "ATR", 
            self._calculate_atr,
            ["High", "Low", "Close"],
            window_size=14,
            params={"period": 14},
            description="Average True Range"
        )
        
        # ADX
        self.register_feature(
            "ADX", 
            self._calculate_adx,
            ["High", "Low", "Close"],
            window_size=14,
            params={"period": 14},
            description="Average Directional Index"
        )
        
        # Stochastic Oscillator
        self.register_feature(
            "Stoch_K", 
            self._calculate_stoch_k,
            ["High", "Low", "Close"],
            window_size=14,
            params={"period": 14},
            description="Stochastic %K"
        )
        
        self.register_feature(
            "Stoch_D", 
            self._calculate_stoch_d,
            ["Stoch_K"],
            window_size=3,
            description="Stochastic %D"
        )
        
        # Money Flow Index
        self.register_feature(
            "MFI", 
            self._calculate_mfi,
            ["High", "Low", "Close", "Volume"],
            window_size=14,
            params={"period": 14},
            description="Money Flow Index"
        )
    
    def register_feature(self, name: str, calc_func: Callable, dependencies: List[str], 
                        window_size: Optional[int] = None, params: Dict[str, Any] = None,
                        description: str = ""):
        """Register a feature calculation function"""
        self.feature_definitions[name] = FeatureDefinition(
            name=name,
            dependencies=dependencies,
            window_size=window_size,
            params=params or {},
            description=description
        )
        self.feature_registry[name] = calc_func
    
    def calculate_features(self, data: pd.DataFrame, feature_list: List[str]) -> pd.DataFrame:
        """
        Calculate features in dependency order, ensuring all dependencies are met.
        """
        result = data.copy()
        calculated_features = set(data.columns)
        
        # Sort features by dependency order
        sorted_features = self._sort_features_by_dependencies(feature_list)
        
        for feature_name in sorted_features:
            if feature_name in calculated_features:
                continue
                
            if feature_name not in self.feature_definitions:
                logger.warning(f"Feature {feature_name} not registered, skipping")
                continue
                
            feature_def = self.feature_definitions[feature_name]
            calc_func = self.feature_registry[feature_name]
            
            # Check if all dependencies are available
            missing_deps = [dep for dep in feature_def.dependencies if dep not in calculated_features]
            if missing_deps:
                logger.error(f"Cannot calculate {feature_name}: missing dependencies {missing_deps}")
                continue
            
            try:
                # Calculate the feature
                feature_values = calc_func(result, **feature_def.params)
                result[feature_name] = feature_values
                calculated_features.add(feature_name)
                logger.debug(f"Calculated feature: {feature_name}")
                
            except Exception as e:
                logger.error(f"Error calculating feature {feature_name}: {str(e)}")
                continue
        
        return result
    
    def _sort_features_by_dependencies(self, feature_list: List[str]) -> List[str]:
        """Sort features by their dependencies using topological sort"""
        sorted_features = []
        visited = set()
        temp_visited = set()
        
        def visit(feature: str):
            if feature in temp_visited:
                raise ValueError(f"Circular dependency detected involving {feature}")
            if feature in visited:
                return
                
            temp_visited.add(feature)
            
            if feature in self.feature_definitions:
                for dependency in self.feature_definitions[feature].dependencies:
                    if dependency in feature_list:
                        visit(dependency)
            
            temp_visited.remove(feature)
            visited.add(feature)
            sorted_features.append(feature)
        
        for feature in feature_list:
            if feature not in visited:
                visit(feature)
        
        return sorted_features
    
    def validate_features(self, data: pd.DataFrame, required_features: List[str]) -> Tuple[bool, List[str]]:
        """Validate that all required features can be calculated from the data"""
        available_columns = set(data.columns)
        missing_features = []
        
        for feature in required_features:
            if feature in available_columns:
                continue
                
            if feature not in self.feature_definitions:
                missing_features.append(f"{feature} (not registered)")
                continue
                
            # Check if dependencies are available
            feature_def = self.feature_definitions[feature]
            missing_deps = [dep for dep in feature_def.dependencies if dep not in available_columns]
            if missing_deps:
                missing_features.append(f"{feature} (missing deps: {missing_deps})")
        
        return len(missing_features) == 0, missing_features
    
    def save_feature_config(self, symbol: str, features: List[str]):
        """Save feature configuration for a model"""
        config = {
            "symbol": symbol,
            "features": features,
            "feature_definitions": {
                name: asdict(self.feature_definitions[name])
                for name in features if name in self.feature_definitions
            },
            "created_at": datetime.utcnow().isoformat()
        }
        
        config_path = self.model_dir / f"{symbol}_features.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Saved feature config for {symbol} to {config_path}")
    
    def load_feature_config(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Load feature configuration for a model"""
        config_path = self.model_dir / f"{symbol}_features.json"
        if not config_path.exists():
            return None
            
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            return config
        except Exception as e:
            logger.error(f"Error loading feature config for {symbol}: {str(e)}")
            return None
    
    # Feature calculation methods
    @staticmethod
    def _calculate_returns(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate simple returns"""
        return df['Close'].pct_change().fillna(0)
    
    @staticmethod
    def _calculate_log_returns(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate log returns"""
        return np.log(df['Close'] / df['Close'].shift(1)).fillna(0)
    
    @staticmethod
    def _calculate_rsi(df: pd.DataFrame, period: int = 14, **kwargs) -> pd.Series:
        """Calculate RSI properly"""
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period, min_periods=1).mean()
        
        # Avoid division by zero
        rs = gain / loss.replace(0, np.inf)
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)  # Fill with neutral value
    
    @staticmethod
    def _calculate_macd(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate MACD line"""
        return df['EMA_12'] - df['EMA_26']
    
    @staticmethod
    def _calculate_macd_signal(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate MACD signal line"""
        return df['MACD'].ewm(span=9, min_periods=1).mean()
    
    @staticmethod
    def _calculate_bb_upper(df: pd.DataFrame, period: int = 20, std_dev: float = 2, **kwargs) -> pd.Series:
        """Calculate Bollinger Band upper"""
        sma = df['Close'].rolling(window=period, min_periods=1).mean()
        std = df['Close'].rolling(window=period, min_periods=1).std()
        return sma + (std * std_dev)
    
    @staticmethod
    def _calculate_bb_lower(df: pd.DataFrame, period: int = 20, std_dev: float = 2, **kwargs) -> pd.Series:
        """Calculate Bollinger Band lower"""
        sma = df['Close'].rolling(window=period, min_periods=1).mean()
        std = df['Close'].rolling(window=period, min_periods=1).std()
        return sma - (std * std_dev)
    
    @staticmethod
    def _calculate_bb_width(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate Bollinger Band width"""
        return (df['BB_Upper'] - df['BB_Lower']) / df['SMA_20']
    
    @staticmethod
    def _calculate_price_volume_ratio(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate price to volume ratio"""
        volume_avg = df['Volume_SMA_10'].replace(0, np.nan)
        return (df['Close'] * df['Volume']) / volume_avg
    
    @staticmethod
    def _calculate_atr(df: pd.DataFrame, period: int = 14, **kwargs) -> pd.Series:
        """Calculate Average True Range properly"""
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return true_range.rolling(window=period, min_periods=1).mean()
    
    @staticmethod
    def _calculate_adx(df: pd.DataFrame, period: int = 14, **kwargs) -> pd.Series:
        """Calculate Average Directional Index (ADX) properly"""
        # Calculate True Range
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        
        # Calculate Directional Movement
        plus_dm = df['High'].diff()
        minus_dm = -df['Low'].diff()
        
        # Conditions for +DM and -DM
        plus_dm[(plus_dm < 0) | (plus_dm <= minus_dm)] = 0
        minus_dm[(minus_dm < 0) | (minus_dm <= plus_dm)] = 0
        
        # Smooth +DM, -DM, and TR using Wilder's smoothing method
        atr = true_range.rolling(window=period, min_periods=1).mean()
        plus_di = 100 * (plus_dm.rolling(window=period, min_periods=1).mean() / atr)
        minus_di = 100 * (minus_dm.rolling(window=period, min_periods=1).mean() / atr)
        
        # Calculate DX
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
        dx = dx.replace([np.inf, -np.inf], 0).fillna(0)
        
        # Calculate ADX (smoothed DX)
        adx = dx.rolling(window=period, min_periods=1).mean()
        return adx.fillna(0)
    
    @staticmethod
    def _calculate_stoch_k(df: pd.DataFrame, period: int = 14, **kwargs) -> pd.Series:
        """Calculate Stochastic %K"""
        lowest_low = df['Low'].rolling(window=period, min_periods=1).min()
        highest_high = df['High'].rolling(window=period, min_periods=1).max()
        
        stoch_k = 100 * ((df['Close'] - lowest_low) / (highest_high - lowest_low))
        return stoch_k.fillna(50)
    
    @staticmethod
    def _calculate_stoch_d(df: pd.DataFrame, **kwargs) -> pd.Series:
        """Calculate Stochastic %D (smoothed %K)"""
        return df['Stoch_K'].rolling(window=3, min_periods=1).mean()
    
    @staticmethod
    def _calculate_mfi(df: pd.DataFrame, period: int = 14, **kwargs) -> pd.Series:
        """Calculate Money Flow Index"""
        typical_price = (df['High'] + df['Low'] + df['Close']) / 3
        money_flow = typical_price * df['Volume']
        
        # Positive and negative money flow
        positive_flow = money_flow.where(typical_price > typical_price.shift(1), 0)
        negative_flow = money_flow.where(typical_price < typical_price.shift(1), 0)
        
        # Money Flow Ratio
        positive_mf = positive_flow.rolling(window=period, min_periods=1).sum()
        negative_mf = negative_flow.rolling(window=period, min_periods=1).sum()
        
        # Avoid division by zero
        mfi_ratio = positive_mf / negative_mf.replace(0, np.inf)
        mfi = 100 - (100 / (1 + mfi_ratio))
        
        return mfi.fillna(50)  # Fill with neutral value
