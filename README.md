# 🤖 AI Stock Tracker

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.103.1-green.svg)](https://fastapi.tiangolo.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.13.0-orange.svg)](https://tensorflow.org)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.2-blue.svg)](https://reactnative.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A sophisticated AI-powered stock analysis platform that combines advanced machine learning models, real-time sentiment analysis, and comprehensive technical analysis to provide intelligent stock predictions and portfolio insights.

## 🧠 AI & Machine Learning Features

### Advanced Neural Networks

- **LSTM Time Series Prediction**: Deep learning models with 60-day sequence learning for multi-horizon stock price forecasting
- **Custom Feature Engineering**: 18+ technical indicators with automated preprocessing pipeline
- **Multi-Model Ensemble**: Combines multiple prediction models for enhanced accuracy
- **Real-time Inference**: Optimized prediction pipeline with sub-second response times

### Intelligent Sentiment Analysis

- **Transformer Models**: Hugging Face FinBERT integration for financial news analysis
- **Multi-Source Sentiment**: VADER, TextBlob, and custom financial sentiment scoring
- **News Impact Assessment**: Real-time correlation between sentiment and price movements
- **Social Media Integration**: Twitter and Reddit sentiment analysis for market sentiment

### Technical Analysis Engine

- **20+ Advanced Indicators**: RSI, MACD, Bollinger Bands, ATR, ADX, and custom indicators
- **Pattern Recognition**: Automated chart pattern detection and trend analysis
- **Risk Assessment**: Portfolio volatility analysis and risk metrics
- **Performance Analytics**: Comprehensive portfolio tracking and performance attribution

## 🏗️ Architecture Overview

### Backend (Python/FastAPI)

```
backend/
├── app/
│   ├── ml/                     # Machine Learning Core
│   │   ├── improved_lstm.py    # Advanced LSTM implementation
│   │   ├── sentiment_analyzer.py # Multi-model sentiment analysis
│   │   ├── feature_store.py    # Feature engineering pipeline
│   │   └── technical_indicators.py # Advanced technical analysis
│   ├── services/               # Business Logic
│   │   ├── prediction_service.py # ML prediction orchestration
│   │   ├── stock_service.py    # Stock data management
│   │   └── analysis_service.py # Technical analysis
│   ├── api/                    # REST API Endpoints
│   ├── core/                   # Configuration & Database
│   └── models/                 # Database Models
├── models/                     # Trained ML Models
│   ├── lstm/                   # LSTM model artifacts
│   └── features/               # Feature engineering cache
└── requirements.txt            # Python dependencies
```

### Mobile App (React Native/Expo)

```
mobile/
├── src/
│   ├── components/             # Reusable UI Components
│   │   └── charts/            # Advanced chart components
│   ├── screens/               # Application Screens
│   │   ├── main/             # Main app screens
│   │   └── auth/             # Authentication screens
│   ├── services/             # API Integration
│   ├── store/                # Redux State Management
│   └── utils/                # Utility Functions
├── assets/                    # Static Assets
└── app.json                  # Expo Configuration
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Expo CLI

### Backend Setup

1. **Clone and Setup Environment**

   ```bash
   git clone https://github.com/your-username/ai-stock-tracker.git
   cd ai-stock-tracker/backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**

   ```bash
   alembic upgrade head
   ```

5. **Download ML Models**

   ```bash
   python -c "import nltk; nltk.download('vader_lexicon')"
   python scripts/download_models.py
   ```

6. **Start the Server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Mobile App Setup

1. **Navigate to Mobile Directory**

   ```bash
   cd ../mobile
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start Development Server**

   ```bash
   npx expo start
   ```

4. **Run on Device**
   - Install Expo Go app on your device
   - Scan QR code from terminal
   - Or run on emulator: `npx expo run:ios` / `npx expo run:android`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_stock_analyzer

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256

# External APIs
ALPHA_VANTAGE_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
FMP_API_KEY=your_key_here

# ML Configuration
MODEL_CACHE_TTL=3600
PREDICTION_BATCH_SIZE=32
FEATURE_STORE_PATH=./models/features
```

### API Keys Required

- **Alpha Vantage**: Stock market data
- **News API**: Financial news sentiment analysis
- **Financial Modeling Prep**: Extended financial data

## 📊 ML Model Details

### LSTM Architecture

- **Input Sequence**: 60 trading days of historical data
- **Features**: 18 engineered features including price, volume, and technical indicators
- **Architecture**: 3-layer LSTM with dropout and batch normalization
- **Output**: Multi-horizon predictions (1, 7, 30 days)
- **Training Data**: 5+ years of historical market data

### Feature Engineering Pipeline

```python
# Core Features
- Price-based: Close, Open, High, Low, Returns, Log Returns
- Volume: Raw volume, Volume SMA, Price-Volume Ratio
- Technical: SMA(10,20), EMA(12,26), RSI, MACD, Bollinger Bands
- Advanced: ATR, ADX, Stochastic, Williams %R
```

### Sentiment Analysis Models

- **FinBERT**: Domain-specific financial sentiment (91% accuracy)
- **VADER**: Social media sentiment analysis
- **Custom Lexicon**: Financial keyword-based scoring
- **News Sources**: Reuters, Bloomberg, Yahoo Finance, SEC filings

## 🔌 API Endpoints

### Core Endpoints

```http
GET  /api/v1/stocks/{symbol}           # Stock data and analysis
POST /api/v1/predictions/{symbol}     # AI predictions
GET  /api/v1/news/{symbol}/sentiment   # Sentiment analysis
GET  /api/v1/portfolio/analytics       # Portfolio insights
WS   /api/v1/ws/stocks/{symbol}        # Real-time updates
```

### ML-Specific Endpoints

```http
POST /api/v1/ml/retrain/{symbol}       # Trigger model retraining
GET  /api/v1/ml/model/metrics          # Model performance metrics
GET  /api/v1/ml/features/{symbol}      # Feature importance analysis
POST /api/v1/ml/predict/batch          # Batch predictions
```

## 📱 Mobile Features

- **Real-time Portfolio Tracking**: Live updates via WebSocket
- **Interactive Charts**: TradingView-style candlestick charts
- **AI Predictions Dashboard**: Visual prediction timeline
- **Sentiment Heatmap**: News sentiment visualization
- **Risk Analytics**: Portfolio risk metrics and alerts
- **Offline Mode**: Cached data for offline analysis
