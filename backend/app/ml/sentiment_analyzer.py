"""
Sentiment Analysis for Financial News

Implements advanced sentiment analysis using transformer models
for financial news and social media content analysis.
"""

import asyncio
import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import aiohttp
import pandas as pd
import numpy as np

# Hugging Face Transformers
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    pipeline, Pipeline
)
import torch

# Text preprocessing
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from textblob import TextBlob

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Advanced sentiment analysis for financial content"""
    
    def __init__(self, cache_dir: str = "models/sentiment"):
        self.cache_dir = cache_dir
        self.financial_sentiment_pipeline: Optional[Pipeline] = None
        self.general_sentiment_pipeline: Optional[Pipeline] = None
        self.vader_analyzer: Optional[SentimentIntensityAnalyzer] = None
        self.is_initialized = False
        
        # Financial keywords for context weighting
        self.financial_keywords = {
            'positive': [
                'profit', 'growth', 'increase', 'rise', 'gain', 'surge', 'bull',
                'outperform', 'beat', 'exceed', 'strong', 'robust', 'solid',
                'upgrade', 'buy', 'positive', 'optimistic', 'confident',
                'recovery', 'expansion', 'breakthrough', 'milestone'
            ],
            'negative': [
                'loss', 'decline', 'fall', 'drop', 'crash', 'bear', 'plunge',
                'underperform', 'miss', 'weak', 'poor', 'disappointing',
                'downgrade', 'sell', 'negative', 'pessimistic', 'concern',
                'recession', 'crisis', 'bankruptcy', 'default', 'risk'
            ],
            'neutral': [
                'stable', 'maintain', 'hold', 'steady', 'unchanged', 'flat',
                'consolidate', 'monitor', 'watch', 'evaluate', 'neutral'
            ]
        }
        
    async def initialize(self) -> bool:
        """Initialize sentiment analysis models"""
        try:
            logger.info("Initializing sentiment analysis models...")
            
            # Download required NLTK data
            await self._download_nltk_data()
            
            # Initialize VADER sentiment analyzer
            self.vader_analyzer = SentimentIntensityAnalyzer()
            
            # Initialize financial sentiment model (FinBERT)
            try:
                self.financial_sentiment_pipeline = pipeline(
                    "sentiment-analysis",
                    model="ProsusAI/finbert",
                    tokenizer="ProsusAI/finbert",
                    device=0 if torch.cuda.is_available() else -1,
                    return_all_scores=True
                )
                logger.info("FinBERT model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load FinBERT model: {e}")
                # Fallback to general sentiment model
                self.financial_sentiment_pipeline = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                    device=0 if torch.cuda.is_available() else -1,
                    return_all_scores=True
                )
                logger.info("Using RoBERTa sentiment model as fallback")
            
            # Initialize general sentiment pipeline
            self.general_sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=0 if torch.cuda.is_available() else -1,
                return_all_scores=True
            )
            
            self.is_initialized = True
            logger.info("Sentiment analysis models initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing sentiment models: {str(e)}")
            return False
    
    async def _download_nltk_data(self):
        """Download required NLTK data"""
        try:
            import ssl
            try:
                _create_unverified_https_context = ssl._create_unverified_context
            except AttributeError:
                pass
            else:
                ssl._create_default_https_context = _create_unverified_https_context
            
            nltk.download('vader_lexicon', quiet=True)
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            
        except Exception as e:
            logger.warning(f"Could not download NLTK data: {e}")
    
    async def analyze_text(
        self,
        text: str,
        use_financial_context: bool = True
    ) -> Dict[str, Any]:
        """Analyze sentiment of a single text"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            if not text or len(text.strip()) < 10:
                return self._default_sentiment()
            
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)
            
            # Run multiple sentiment analyses
            results = {}
            
            # 1. Transformer-based sentiment (FinBERT or RoBERTa)
            if self.financial_sentiment_pipeline:
                transformer_result = await self._analyze_with_transformer(
                    cleaned_text, use_financial_context
                )
                results['transformer'] = transformer_result
            
            # 2. VADER sentiment
            if self.vader_analyzer:
                vader_result = self._analyze_with_vader(cleaned_text)
                results['vader'] = vader_result
            
            # 3. TextBlob sentiment
            textblob_result = self._analyze_with_textblob(cleaned_text)
            results['textblob'] = textblob_result
            
            # 4. Keyword-based analysis
            keyword_result = self._analyze_with_keywords(cleaned_text)
            results['keywords'] = keyword_result
              # Ensemble the results
            ensemble_result = self._ensemble_sentiment_scores(results)
            
            # Add context and metadata
            ensemble_result.update({
                'text_length': len(text),
                'cleaned_text_length': len(cleaned_text),
                'financial_context': use_financial_context,
                'analysis_timestamp': datetime.now().isoformat(),
                'individual_scores': results
            })
            
            return ensemble_result
            
        except Exception as e:
            logger.error(f"Error analyzing text sentiment: {str(e)}")
            return self._default_sentiment()
    
    async def analyze_news_batch(
        self,
        news_items: List[Dict[str, Any]],
        symbol: str = None
    ) -> Dict[str, Any]:
        """Analyze sentiment for a batch of news items"""
        try:
            if not news_items:
                return {
                    'overall_sentiment': 0.0,
                    'sentiment_label': 'neutral',
                    'confidence': 0.0,
                    'positive_ratio': 0.0,
                    'negative_ratio': 0.0,
                    'neutral_ratio': 1.0,
                    'total_articles': 0,
                    'sentiment_trend': 'stable'
                }
            
            # Analyze each news item
            sentiment_tasks = []
            for item in news_items:
                # Combine title and summary for analysis
                text = f"{item.get('title', '')} {item.get('summary', '')}"
                sentiment_tasks.append(self.analyze_text(text, use_financial_context=True))
            
            # Process in batches to avoid overwhelming the models
            batch_size = 10
            all_sentiments = []
            
            for i in range(0, len(sentiment_tasks), batch_size):
                batch = sentiment_tasks[i:i + batch_size]
                batch_results = await asyncio.gather(*batch, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"Error in batch sentiment analysis: {result}")
                        all_sentiments.append(self._default_sentiment())
                    else:
                        all_sentiments.append(result)
            
            # Aggregate results
            return self._aggregate_sentiment_results(all_sentiments, news_items, symbol)
            
        except Exception as e:
            logger.error(f"Error analyzing news batch sentiment: {str(e)}")
            return self._default_sentiment()
    
    async def _analyze_with_transformer(
        self,
        text: str,
        use_financial_context: bool
    ) -> Dict[str, Any]:
        """Analyze sentiment using transformer models"""
        try:
            pipeline_to_use = (
                self.financial_sentiment_pipeline if use_financial_context 
                else self.general_sentiment_pipeline
            )
            
            if not pipeline_to_use:
                return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
            
            # Truncate text if too long (models have token limits)
            max_length = 512
            if len(text) > max_length:
                text = text[:max_length]
            
            # Get predictions
            results = pipeline_to_use(text)
            
            # Process results based on model type
            if isinstance(results, list) and len(results) > 0:
                if isinstance(results[0], list):
                    # All scores returned
                    scores = results[0]
                else:
                    scores = results
                
                # Convert to standardized format
                sentiment_map = {
                    'POSITIVE': 1.0, 'positive': 1.0, 'LABEL_2': 1.0,
                    'NEGATIVE': -1.0, 'negative': -1.0, 'LABEL_0': -1.0,
                    'NEUTRAL': 0.0, 'neutral': 0.0, 'LABEL_1': 0.0
                }
                
                total_score = 0.0
                max_confidence = 0.0
                predicted_label = 'neutral'
                
                for score_dict in scores:
                    label = score_dict['label']
                    confidence = score_dict['score']
                    
                    if confidence > max_confidence:
                        max_confidence = confidence
                        predicted_label = label.lower()
                    
                    if label in sentiment_map:
                        total_score += sentiment_map[label] * confidence
                
                return {
                    'score': float(np.clip(total_score, -1.0, 1.0)),
                    'confidence': float(max_confidence),
                    'label': predicted_label,
                    'all_scores': scores
                }
            
            return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
            
        except Exception as e:
            logger.error(f"Error in transformer sentiment analysis: {str(e)}")
            return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
    
    def _analyze_with_vader(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using VADER"""
        try:
            if not self.vader_analyzer:
                return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
            
            scores = self.vader_analyzer.polarity_scores(text)
            compound_score = scores['compound']
            
            # Determine label and confidence
            if compound_score >= 0.05:
                label = 'positive'
                confidence = abs(compound_score)
            elif compound_score <= -0.05:
                label = 'negative'
                confidence = abs(compound_score)
            else:
                label = 'neutral'
                confidence = 1.0 - abs(compound_score)
            
            return {
                'score': float(compound_score),
                'confidence': float(confidence),
                'label': label,
                'detailed_scores': scores
            }
            
        except Exception as e:
            logger.error(f"Error in VADER sentiment analysis: {str(e)}")
            return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
    
    def _analyze_with_textblob(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using TextBlob"""
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity  # -1 to 1
            subjectivity = blob.sentiment.subjectivity  # 0 to 1
            
            # Determine label
            if polarity > 0.1:
                label = 'positive'
            elif polarity < -0.1:
                label = 'negative'
            else:
                label = 'neutral'
            
            # Use subjectivity as confidence measure
            confidence = float(subjectivity)
            
            return {
                'score': float(polarity),
                'confidence': confidence,
                'label': label,
                'subjectivity': float(subjectivity)
            }
            
        except Exception as e:
            logger.error(f"Error in TextBlob sentiment analysis: {str(e)}")
            return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
    
    def _analyze_with_keywords(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using financial keywords"""
        try:
            text_lower = text.lower()
            
            positive_count = sum(1 for word in self.financial_keywords['positive'] if word in text_lower)
            negative_count = sum(1 for word in self.financial_keywords['negative'] if word in text_lower)
            neutral_count = sum(1 for word in self.financial_keywords['neutral'] if word in text_lower)
            
            total_keywords = positive_count + negative_count + neutral_count
            
            if total_keywords == 0:
                return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
            
            # Calculate sentiment score
            score = (positive_count - negative_count) / total_keywords
            
            # Determine label and confidence
            if score > 0.1:
                label = 'positive'
            elif score < -0.1:
                label = 'negative'
            else:
                label = 'neutral'
            
            confidence = min(total_keywords / 10.0, 1.0)  # More keywords = higher confidence
            
            return {
                'score': float(score),
                'confidence': float(confidence),
                'label': label,
                'keyword_counts': {
                    'positive': positive_count,
                    'negative': negative_count,
                    'neutral': neutral_count
                }
            }
            
        except Exception as e:
            logger.error(f"Error in keyword sentiment analysis: {str(e)}")
            return {'score': 0.0, 'confidence': 0.0, 'label': 'neutral'}
    
    def _ensemble_sentiment_scores(self, results: Dict[str, Dict]) -> Dict[str, Any]:
        """Ensemble multiple sentiment analysis results"""
        try:
            valid_results = {k: v for k, v in results.items() if v.get('score') is not None}
            
            if not valid_results:
                return self._default_sentiment()
            
            # Weighted ensemble based on confidence
            weights = {
                'transformer': 0.4,  # Highest weight for transformer models
                'vader': 0.3,        # Good for social media text
                'textblob': 0.2,     # General purpose
                'keywords': 0.1      # Financial context
            }
            
            total_score = 0.0
            total_weight = 0.0
            confidence_scores = []
            
            for method, result in valid_results.items():
                weight = weights.get(method, 0.1)
                score = result.get('score', 0.0)
                confidence = result.get('confidence', 0.0)
                
                # Weight by confidence as well
                effective_weight = weight * (1 + confidence)
                total_score += score * effective_weight
                total_weight += effective_weight
                confidence_scores.append(confidence)
            
            if total_weight == 0:
                return self._default_sentiment()
            
            final_score = total_score / total_weight
            final_confidence = np.mean(confidence_scores) if confidence_scores else 0.0
            
            # Determine final label
            if final_score > 0.1:
                label = 'positive'
            elif final_score < -0.1:
                label = 'negative'
            else:
                label = 'neutral'
            
            return {
                'sentiment_score': float(np.clip(final_score, -1.0, 1.0)),
                'confidence': float(final_confidence),
                'sentiment_label': label,
                'ensemble_weight': float(total_weight),
                'methods_used': list(valid_results.keys())
            }
            
        except Exception as e:
            logger.error(f"Error in ensemble sentiment scoring: {str(e)}")
            return self._default_sentiment()
    
    def _aggregate_sentiment_results(
        self,
        sentiments: List[Dict[str, Any]],
        news_items: List[Dict[str, Any]],
        symbol: str = None
    ) -> Dict[str, Any]:
        """Aggregate sentiment results for multiple news items"""
        try:
            if not sentiments:
                return self._default_sentiment()
            
            # Extract sentiment scores and labels
            scores = [s.get('sentiment_score', 0.0) for s in sentiments]
            labels = [s.get('sentiment_label', 'neutral') for s in sentiments]
            confidences = [s.get('confidence', 0.0) for s in sentiments]
            
            # Calculate overall metrics
            overall_sentiment = float(np.mean(scores))
            overall_confidence = float(np.mean(confidences))
            
            # Calculate label distribution
            label_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
            for label in labels:
                label_counts[label] = label_counts.get(label, 0) + 1
            
            total_articles = len(sentiments)
            positive_ratio = label_counts['positive'] / total_articles
            negative_ratio = label_counts['negative'] / total_articles
            neutral_ratio = label_counts['neutral'] / total_articles
            
            # Determine overall label
            if overall_sentiment > 0.1:
                overall_label = 'positive'
            elif overall_sentiment < -0.1:
                overall_label = 'negative'
            else:
                overall_label = 'neutral'
            
            # Calculate sentiment trend (if we have timestamps)
            sentiment_trend = self._calculate_sentiment_trend(sentiments, news_items)
            
            return {
                'overall_sentiment': overall_sentiment,
                'sentiment_label': overall_label,
                'confidence': overall_confidence,
                'positive_ratio': float(positive_ratio),
                'negative_ratio': float(negative_ratio),
                'neutral_ratio': float(neutral_ratio),
                'total_articles': total_articles,
                'sentiment_trend': sentiment_trend,
                'score_distribution': {
                    'mean': float(np.mean(scores)),
                    'std': float(np.std(scores)),
                    'min': float(np.min(scores)),
                    'max': float(np.max(scores))
                },
                'individual_sentiments': sentiments
            }
            
        except Exception as e:
            logger.error(f"Error aggregating sentiment results: {str(e)}")
            return self._default_sentiment()
    
    def _calculate_sentiment_trend(
        self,
        sentiments: List[Dict[str, Any]],
        news_items: List[Dict[str, Any]]
    ) -> str:
        """Calculate sentiment trend over time"""
        try:
            if len(sentiments) < 2:
                return 'stable'
            
            # If we have timestamps, use them for trend analysis
            timestamped_sentiments = []
            for i, item in enumerate(news_items):
                if i < len(sentiments):
                    timestamp = item.get('published_at')
                    if timestamp:
                        try:
                            if isinstance(timestamp, str):
                                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                            else:
                                dt = timestamp
                            timestamped_sentiments.append((dt, sentiments[i]['sentiment_score']))
                        except:
                            continue
            
            if len(timestamped_sentiments) < 2:
                # Fallback to simple comparison
                recent_sentiment = np.mean([s['sentiment_score'] for s in sentiments[:5]])
                older_sentiment = np.mean([s['sentiment_score'] for s in sentiments[-5:]])
                diff = recent_sentiment - older_sentiment
            else:
                # Sort by timestamp and calculate trend
                timestamped_sentiments.sort(key=lambda x: x[0])
                recent_scores = [s for _, s in timestamped_sentiments[-5:]]
                older_scores = [s for _, s in timestamped_sentiments[:5]]
                diff = np.mean(recent_scores) - np.mean(older_scores)
            
            if diff > 0.1:
                return 'improving'
            elif diff < -0.1:
                return 'declining'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Error calculating sentiment trend: {str(e)}")
            return 'stable'
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for sentiment analysis"""
        try:
            # Remove URLs
            text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
            
            # Remove email addresses
            text = re.sub(r'\\S+@\\S+', '', text)
            
            # Remove excessive whitespace
            text = re.sub(r'\\s+', ' ', text)
            
            # Remove special characters but keep basic punctuation
            text = re.sub(r'[^a-zA-Z0-9\\s.,!?;:-]', '', text)
            
            # Strip and return
            return text.strip()
            
        except Exception as e:
            logger.error(f"Error preprocessing text: {str(e)}")
            return text
    
    def _default_sentiment(self) -> Dict[str, Any]:
        """Return default neutral sentiment"""
        return {
            'overall_sentiment': 0.0,
            'sentiment_label': 'neutral',
            'confidence': 0.0,
            'positive_ratio': 0.0,
            'negative_ratio': 0.0,
            'neutral_ratio': 1.0,
            'total_articles': 0,
            'sentiment_trend': 'stable'
        }
