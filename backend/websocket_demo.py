"""
Minimal WebSocket demo for testing real-time stock price updates
This script demonstrates the WebSocket functionality without requiring full database setup
"""
import asyncio
import json
import random
from datetime import datetime
from typing import Dict, Set, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Simulated stock data
DEMO_STOCKS = {
    "AAPL": {"name": "Apple Inc.", "base_price": 175.00},
    "GOOGL": {"name": "Alphabet Inc.", "base_price": 140.00},
    "MSFT": {"name": "Microsoft Corporation", "base_price": 420.00},
    "TSLA": {"name": "Tesla Inc.", "base_price": 250.00},
    "AMZN": {"name": "Amazon.com Inc.", "base_price": 155.00},
    "NVDA": {"name": "NVIDIA Corporation", "base_price": 875.00},
    "META": {"name": "Meta Platforms Inc.", "base_price": 485.00},
    "NFLX": {"name": "Netflix Inc.", "base_price": 630.00},
}

app = FastAPI(title="Stock WebSocket Demo", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    """Manages WebSocket connections and stock price subscriptions"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        self.symbol_subscribers: Dict[str, Set[WebSocket]] = {}
        self.price_update_task = None
        self.current_prices: Dict[str, dict] = {}
        
        # Initialize with base prices
        for symbol, data in DEMO_STOCKS.items():
            self.current_prices[symbol] = {
                "symbol": symbol,
                "price": data["base_price"],
                "change": 0.0,
                "changePercent": 0.0,
                "volume": random.randint(1000000, 5000000),
                "timestamp": datetime.now().isoformat()
            }
        
    async def connect(self, websocket: WebSocket):
        """Accept WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection and clean up subscriptions"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        if websocket in self.subscriptions:
            symbols = self.subscriptions[websocket].copy()
            for symbol in symbols:
                self.unsubscribe_symbol(websocket, symbol)
            del self.subscriptions[websocket]
            
        print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
    def subscribe_symbol(self, websocket: WebSocket, symbol: str):
        """Subscribe websocket to symbol updates"""
        symbol = symbol.upper()
        
        if websocket not in self.subscriptions:
            self.subscriptions[websocket] = set()
        self.subscriptions[websocket].add(symbol)
        
        if symbol not in self.symbol_subscribers:
            self.symbol_subscribers[symbol] = set()
        self.symbol_subscribers[symbol].add(websocket)
        
        print(f"Subscribed to {symbol}. Subscribers: {len(self.symbol_subscribers.get(symbol, set()))}")
        
    def unsubscribe_symbol(self, websocket: WebSocket, symbol: str):
        """Unsubscribe websocket from symbol updates"""
        symbol = symbol.upper()
        
        if websocket in self.subscriptions:
            self.subscriptions[websocket].discard(symbol)
            
        if symbol in self.symbol_subscribers:
            self.symbol_subscribers[symbol].discard(websocket)
            if not self.symbol_subscribers[symbol]:
                del self.symbol_subscribers[symbol]
                
        print(f"Unsubscribed from {symbol}")
        
    def get_all_subscribed_symbols(self) -> Set[str]:
        """Get all symbols that have active subscriptions"""
        return set(self.symbol_subscribers.keys())
        
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific websocket"""
        try:
            if websocket in self.active_connections:
                await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending message: {e}")
            self.disconnect(websocket)
            
    async def broadcast_to_symbol_subscribers(self, symbol: str, message: dict):
        """Broadcast message to all subscribers of a symbol"""
        symbol = symbol.upper()
        if symbol in self.symbol_subscribers:
            disconnected = []
            for websocket in self.symbol_subscribers[symbol].copy():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Error broadcasting: {e}")
                    disconnected.append(websocket)
                    
            for websocket in disconnected:
                self.disconnect(websocket)

    def generate_price_update(self, symbol: str) -> dict:
        """Generate realistic price update for a symbol"""
        if symbol not in self.current_prices:
            return None
            
        current = self.current_prices[symbol]
        base_price = DEMO_STOCKS[symbol]["base_price"]
        
        # Generate small random price change (-2% to +2%)
        change_percent = random.uniform(-2.0, 2.0)
        new_price = base_price * (1 + change_percent / 100)
        
        # Calculate change from base price
        price_change = new_price - base_price
        change_percent = (price_change / base_price) * 100
        
        # Update current price
        self.current_prices[symbol] = {
            "symbol": symbol,
            "price": round(new_price, 2),
            "change": round(price_change, 2),
            "changePercent": round(change_percent, 2),
            "volume": current["volume"] + random.randint(-10000, 10000),
            "timestamp": datetime.now().isoformat()
        }
        
        return self.current_prices[symbol]

    async def start_price_updates(self):
        """Start background task for price updates"""
        if self.price_update_task is None:
            self.price_update_task = asyncio.create_task(self._price_update_loop())
            
    async def stop_price_updates(self):
        """Stop background price update task"""
        if self.price_update_task:
            self.price_update_task.cancel()
            try:
                await self.price_update_task
            except asyncio.CancelledError:
                pass
            self.price_update_task = None
            
    async def _price_update_loop(self):
        """Background loop to generate and broadcast price updates"""
        while True:
            try:
                subscribed_symbols = self.get_all_subscribed_symbols()
                
                if not subscribed_symbols:
                    await asyncio.sleep(2)
                    continue
                    
                # Update prices for subscribed symbols
                for symbol in subscribed_symbols:
                    if symbol in DEMO_STOCKS:
                        price_data = self.generate_price_update(symbol)
                        
                        if price_data:
                            message = {
                                "type": "price_update",
                                "data": price_data
                            }
                            
                            await self.broadcast_to_symbol_subscribers(symbol, message)
                
                # Wait before next update (2-5 seconds)
                await asyncio.sleep(random.uniform(2, 5))
                
            except asyncio.CancelledError:
                print("Price update loop cancelled")
                break
            except Exception as e:
                print(f"Error in price update loop: {e}")
                await asyncio.sleep(2)

# Global connection manager instance
manager = ConnectionManager()

@app.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time stock price updates"""
    await manager.connect(websocket)
    
    # Start price updates if not already running
    await manager.start_price_updates()
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "subscribe":
                    symbols = message.get("data", {}).get("symbols", [])
                    if isinstance(symbols, str):
                        symbols = [symbols]
                    
                    for symbol in symbols:
                        symbol = symbol.upper()
                        if symbol in DEMO_STOCKS:
                            manager.subscribe_symbol(websocket, symbol)
                            
                            # Send current price immediately
                            if symbol in manager.current_prices:
                                await manager.send_personal_message({
                                    "type": "price_update", 
                                    "data": manager.current_prices[symbol]
                                }, websocket)
                        
                    await manager.send_personal_message({
                        "type": "subscription_confirmed",
                        "data": {"symbols": symbols}
                    }, websocket)
                    
                elif message_type == "unsubscribe":
                    symbols = message.get("data", {}).get("symbols", [])
                    if isinstance(symbols, str):
                        symbols = [symbols]
                    
                    for symbol in symbols:
                        manager.unsubscribe_symbol(websocket, symbol)
                        
                    await manager.send_personal_message({
                        "type": "unsubscription_confirmed",
                        "data": {"symbols": symbols}
                    }, websocket)
                    
                elif message_type == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "data": {"timestamp": datetime.now().isoformat()}
                    }, websocket)
                    
                else:
                    await manager.send_personal_message({
                        "type": "error",
                        "data": {"message": f"Unknown message type: {message_type}"}
                    }, websocket)
                    
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "data": {"message": "Invalid JSON format"}
                }, websocket)
                
    except WebSocketDisconnect:
        print("WebSocket disconnected normally")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Stock WebSocket Demo API",
        "active_connections": len(manager.active_connections),
        "subscribed_symbols": list(manager.get_all_subscribed_symbols()),
        "available_symbols": list(DEMO_STOCKS.keys())
    }

@app.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "active_connections": len(manager.active_connections),
        "subscribed_symbols": list(manager.get_all_subscribed_symbols()),
        "total_subscriptions": sum(len(symbols) for symbols in manager.subscriptions.values()),
        "available_symbols": list(DEMO_STOCKS.keys()),
        "current_prices": manager.current_prices
    }

if __name__ == "__main__":
    print("Starting Stock WebSocket Demo Server...")
    print("Available endpoints:")
    print("  - WebSocket: ws://localhost:8000/ws/prices")
    print("  - API: http://localhost:8000")
    print("  - Stats: http://localhost:8000/ws/stats")
    print("  - Available symbols:", list(DEMO_STOCKS.keys()))
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
