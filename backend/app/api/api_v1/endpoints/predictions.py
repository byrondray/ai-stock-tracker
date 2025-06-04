from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import StockPrediction, PredictionRequest
from app.services.prediction_service import PredictionService
from app.ml import LSTMPredictor, TechnicalIndicators

router = APIRouter()


@router.get("/{symbol}", response_model=StockPrediction)
async def get_stock_prediction(
    symbol: str,
    days: int = Query(default=7, ge=1, le=365, description="Number of days to predict"),
    model_type: str = Query(default="lstm", regex="^(lstm|random_forest|ensemble)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockPrediction:
    """Get AI predictions for a stock."""
    try:
        prediction = await PredictionService.get_prediction(
            db=db,
            symbol=symbol.upper(),
            days_ahead=days,
            force_refresh=False
        )
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not generate prediction for {symbol}"
            )
        
        # Convert PredictionResponse to StockPrediction format
        return StockPrediction(
            symbol=prediction.symbol,
            predictions=prediction.predictions,
            model_version=prediction.model_version,
            model_type=prediction.model_type,
            created_at=prediction.created_at
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


@router.post("/", response_model=StockPrediction)
async def create_prediction(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockPrediction:
    """Generate new prediction for a stock."""
    try:
        prediction = await PredictionService.get_prediction(
            db=db,
            symbol=request.symbol,
            days_ahead=request.days,
            force_refresh=True  # Force refresh for POST requests
        )
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not generate prediction for {request.symbol}"
            )
        
        # Convert PredictionResponse to StockPrediction format
        return StockPrediction(
            symbol=prediction.symbol,
            predictions=prediction.predictions,
            model_version=prediction.model_version,
            model_type=prediction.model_type,
            created_at=prediction.created_at
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
