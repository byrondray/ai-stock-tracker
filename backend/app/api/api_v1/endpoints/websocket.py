"""
WebSocket endpoint for real-time stock price updates
"""
import json
import asyncio
import logging
from typing import Dict, Set, List
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_websocket
from app.services.stock_service import StockService
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and stock price subscriptions"""
    
    def __init__(self):
        # Active WebSocket connections
        self.active_connections: List[WebSocket] = []
        # User subscriptions: websocket -> set of symbols
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        # Symbol subscribers: symbol -> set of websockets
        self.symbol_subscribers: Dict[str, Set[WebSocket]] = {}
        # Price update task
        self.price_update_task = None
        
    async def connect(self, websocket: WebSocket, user: User):
        """Accept WebSocket connection and add to active connections"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()
        logger.info(f"WebSocket connected for user {user.username}")
        
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection and clean up subscriptions"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        # Clean up subscriptions
        if websocket in self.subscriptions:
            symbols = self.subscriptions[websocket].copy()
            for symbol in symbols:
                self.unsubscribe_symbol(websocket, symbol)
            del self.subscriptions[websocket]
            
        logger.info("WebSocket disconnected")
        
    def subscribe_symbol(self, websocket: WebSocket, symbol: str):
        """Subscribe websocket to symbol updates"""
        symbol = symbol.upper()
        
        # Add to user subscriptions
        if websocket not in self.subscriptions:
            self.subscriptions[websocket] = set()
        self.subscriptions[websocket].add(symbol)
        
        # Add to symbol subscribers
        if symbol not in self.symbol_subscribers:
            self.symbol_subscribers[symbol] = set()
        self.symbol_subscribers[symbol].add(websocket)
        
        logger.info(f"Subscribed to {symbol}")
        
    def unsubscribe_symbol(self, websocket: WebSocket, symbol: str):
        """Unsubscribe websocket from symbol updates"""
        symbol = symbol.upper()
        
        # Remove from user subscriptions
        if websocket in self.subscriptions:
            self.subscriptions[websocket].discard(symbol)
            
        # Remove from symbol subscribers
        if symbol in self.symbol_subscribers:
            self.symbol_subscribers[symbol].discard(websocket)
            # Clean up empty symbol entries
            if not self.symbol_subscribers[symbol]:
                del self.symbol_subscribers[symbol]
                
        logger.info(f"Unsubscribed from {symbol}")
        
    def get_all_subscribed_symbols(self) -> Set[str]:
        """Get all symbols that have active subscriptions"""
        return set(self.symbol_subscribers.keys())
        
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific websocket"""
        try:
            if websocket in self.active_connections:
                await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to websocket: {e}")
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
                    logger.error(f"Error broadcasting to websocket: {e}")
                    disconnected.append(websocket)
                    
            # Clean up disconnected websockets
            for websocket in disconnected:
                self.disconnect(websocket)

    async def start_price_updates(self, db: Session):
        """Start background task for price updates"""
        if self.price_update_task is None:
            self.price_update_task = asyncio.create_task(
                self._price_update_loop(db)
            )
            
    async def stop_price_updates(self):
        """Stop background price update task"""
        if self.price_update_task:
            self.price_update_task.cancel()
            try:
                await self.price_update_task
            except asyncio.CancelledError:
                pass
            self.price_update_task = None
            
    async def _price_update_loop(self, db: Session):
        """Background loop to fetch and broadcast price updates"""
        stock_service = StockService(db)
        
        while True:
            try:
                # Get all subscribed symbols
                symbols = self.get_all_subscribed_symbols()
                
                if not symbols:
                    await asyncio.sleep(5)  # Wait before checking again
                    continue
                    
                # Fetch current prices for all subscribed symbols
                for symbol in symbols:
                    try:
                        price_data = await stock_service.get_current_price(symbol)
                        
                        if price_data:
                            # Create price update message
                            message = {
                                "type": "price_update",
                                "data": {
                                    "symbol": symbol,
                                    "price": price_data.price,
                                    "change": price_data.change,
                                    "changePercent": price_data.change_percent,
                                    "volume": price_data.volume,
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            }
                            
                            # Broadcast to symbol subscribers
                            await self.broadcast_to_symbol_subscribers(symbol, message)
                            
                    except Exception as e:
                        logger.error(f"Error fetching price for {symbol}: {e}")
                        
                # Wait before next update cycle
                await asyncio.sleep(10)  # Update every 10 seconds
                
            except asyncio.CancelledError:
                logger.info("Price update loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in price update loop: {e}")
                await asyncio.sleep(5)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/prices")
async def websocket_endpoint(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time stock price updates"""
    
    # For now, we'll skip authentication to get basic functionality working
    # In production, you'd want to authenticate the WebSocket connection
    # user = await get_current_user_websocket(websocket, db)
    
    # Create a dummy user for testing
    class DummyUser:
        username = "websocket_user"
    
    user = DummyUser()
    
    await manager.connect(websocket, user)
    
    # Start price updates if not already running
    await manager.start_price_updates(db)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "subscribe":
                    # Subscribe to symbol(s)
                    symbols = message.get("data", {}).get("symbols", [])
                    if isinstance(symbols, str):
                        symbols = [symbols]
                    
                    for symbol in symbols:
                        manager.subscribe_symbol(websocket, symbol)
                        
                    # Send confirmation
                    await manager.send_personal_message({
                        "type": "subscription_confirmed",
                        "data": {"symbols": symbols}
                    }, websocket)
                    
                elif message_type == "unsubscribe":
                    # Unsubscribe from symbol(s)
                    symbols = message.get("data", {}).get("symbols", [])
                    if isinstance(symbols, str):
                        symbols = [symbols]
                    
                    for symbol in symbols:
                        manager.unsubscribe_symbol(websocket, symbol)
                        
                    # Send confirmation
                    await manager.send_personal_message({
                        "type": "unsubscription_confirmed",
                        "data": {"symbols": symbols}
                    }, websocket)
                    
                elif message_type == "ping":
                    # Respond to ping with pong
                    await manager.send_personal_message({
                        "type": "pong",
                        "data": {"timestamp": datetime.utcnow().isoformat()}
                    }, websocket)
                    
                else:
                    # Unknown message type
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
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "active_connections": len(manager.active_connections),
        "subscribed_symbols": list(manager.get_all_subscribed_symbols()),
        "total_subscriptions": sum(len(symbols) for symbols in manager.subscriptions.values())
    }
