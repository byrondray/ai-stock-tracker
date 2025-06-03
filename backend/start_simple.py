"""
Simplified FastAPI startup without database dependencies
Perfect for development and testing
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI(
    title="AI Stock Analyzer API - Simple Mode",
    description="Simplified version for development",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Stock Analyzer API - Simple Mode",
        "status": "running",
        "websocket_demo": "http://localhost:8001",
        "docs": "http://localhost:8000/api/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "AI Stock Analyzer API - Simple Mode",
        "version": "1.0.0"
    }

@app.get("/api/stocks/demo")
async def demo_stocks():
    """Demo stocks endpoint."""
    return {
        "stocks": [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "price": 175.00,
                "change": 2.50,
                "changePercent": 1.45
            },
            {
                "symbol": "GOOGL", 
                "name": "Alphabet Inc.",
                "price": 140.00,
                "change": -1.20,
                "changePercent": -0.85
            },
            {
                "symbol": "MSFT",
                "name": "Microsoft Corporation", 
                "price": 420.00,
                "change": 5.75,
                "changePercent": 1.39
            }
        ]
    }

if __name__ == "__main__":
    print("🚀 Starting AI Stock Analyzer API - Simple Mode")
    print("📊 WebSocket Demo should be running on: http://localhost:8001")
    print("📝 API Documentation: http://localhost:8000/api/docs")
    print("🔄 Real-time WebSocket: ws://localhost:8001/ws/prices")
    
    uvicorn.run(
        "start_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 