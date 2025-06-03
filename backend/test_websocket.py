"""
Simple WebSocket client test to verify the demo server functionality
"""
import asyncio
import json
import websockets

async def test_websocket():
    uri = "ws://localhost:8000/ws/prices"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket server")
            
            # Subscribe to some stocks
            subscribe_message = {
                "type": "subscribe",
                "data": {
                    "symbols": ["AAPL", "GOOGL", "TSLA"]
                }
            }
            
            await websocket.send(json.dumps(subscribe_message))
            print("📤 Sent subscription request for AAPL, GOOGL, TSLA")
            
            # Listen for messages for 30 seconds
            timeout = 30
            print(f"📡 Listening for price updates for {timeout} seconds...")
            
            try:
                async with asyncio.timeout(timeout):
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)
                        
                        if data["type"] == "subscription_confirmed":
                            print(f"✅ Subscription confirmed: {data['data']['symbols']}")
                        elif data["type"] == "price_update":
                            price_data = data["data"]
                            symbol = price_data["symbol"]
                            price = price_data["price"]
                            change = price_data["change"]
                            change_percent = price_data["changePercent"]
                            
                            print(f"💰 {symbol}: ${price:.2f} ({change:+.2f}, {change_percent:+.2f}%)")
                        elif data["type"] == "pong":
                            print("🏓 Received pong")
                        else:
                            print(f"📨 Received: {data}")
                            
            except asyncio.TimeoutError:
                print(f"⏰ {timeout} seconds elapsed, ending test")
                
            # Send ping before closing
            ping_message = {"type": "ping", "data": {}}
            await websocket.send(json.dumps(ping_message))
            
            # Wait for pong
            try:
                async with asyncio.timeout(5):
                    message = await websocket.recv()
                    data = json.loads(message)
                    if data["type"] == "pong":
                        print("🏓 Ping-pong successful")
            except asyncio.TimeoutError:
                print("⚠️ Ping-pong timeout")
            
            print("🔌 Disconnecting...")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Starting WebSocket test client...")
    asyncio.run(test_websocket())
    print("✅ Test completed")
