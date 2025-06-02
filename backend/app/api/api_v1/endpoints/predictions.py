from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.schemas import StockPrediction, PredictionRequest
from app.services.prediction_service import PredictionService

router = APIRouter()


@router.get("/{symbol}", response_model=StockPrediction)
async def get_stock_prediction(
    symbol: str,
    days: int = Query(default=7, ge=1, le=365, description="Number of days to predict"),
    model_type: str = Query(default="ensemble", regex="^(lstm|random_forest|ensemble)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> StockPrediction:
    """Get AI predictions for a stock."""
    prediction_service = PredictionService(db)
    
    request = PredictionRequest(
        symbol=symbol.upper(),
        days=days,
        model_type=model_type,
        include_confidence_bands=True
    )
    
    try:
        prediction = await prediction_service.get_prediction(request)
        return prediction
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
    prediction_service = PredictionService(db)
    
    try:
        prediction = await prediction_service.generate_prediction(request)
        return prediction
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
