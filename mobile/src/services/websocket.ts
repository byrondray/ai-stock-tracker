/**
 * WebSocket service for real-time stock price updates
 */
import { configService } from './config';

export interface StockPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'price_update' | 'error' | 'connection' | 'subscription' | 'ping';
  data: any;
}

export type PriceUpdateCallback = (update: StockPriceUpdate) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type ErrorCallback = (error: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimer = 30000; // 30 seconds

  // Callbacks
  private priceUpdateCallbacks: Set<PriceUpdateCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  // Subscription management
  private subscribedSymbols: Set<string> = new Set();
  private connected = false;

  constructor() {
    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    try {
      const wsUrl = configService.buildWsUrl('/prices');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.notifyError('Failed to create WebSocket connection');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.notifyConnection(true);

    // Start heartbeat
    this.startHeartbeat();

    // Re-subscribe to any existing symbols
    if (this.subscribedSymbols.size > 0) {
      this.resubscribeAll();
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'price_update':
          this.notifyPriceUpdate(message.data as StockPriceUpdate);
          break;
        case 'error':
          this.notifyError(message.data.message || 'Unknown error');
          break;
        case 'connection':
          console.log('Connection status:', message.data);
          break;
        case 'subscription':
          console.log('Subscription status:', message.data);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log('WebSocket disconnected');
    this.connected = false;
    this.stopHeartbeat();
    this.notifyConnection(false);
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.notifyError('WebSocket connection error');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.notifyError('Failed to reconnect to WebSocket server');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', data: {} });
      }
    }, this.heartbeatTimer);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Re-subscribe to all symbols after reconnection
   */
  private resubscribeAll(): void {
    const symbols = Array.from(this.subscribedSymbols);
    symbols.forEach((symbol) => {
      this.send({
        type: 'subscription',
        data: { action: 'subscribe', symbol },
      });
    });
  }

  /**
   * Subscribe to price updates for a symbol
   */
  subscribe(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    this.subscribedSymbols.add(upperSymbol);

    if (this.connected) {
      this.send({
        type: 'subscription',
        data: { action: 'subscribe', symbol: upperSymbol },
      });
    }
  }

  /**
   * Unsubscribe from price updates for a symbol
   */
  unsubscribe(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    this.subscribedSymbols.delete(upperSymbol);

    if (this.connected) {
      this.send({
        type: 'subscription',
        data: { action: 'unsubscribe', symbol: upperSymbol },
      });
    }
  }

  /**
   * Subscribe to multiple symbols at once
   */
  subscribeToSymbols(symbols: string[]): void {
    symbols.forEach((symbol) => this.subscribe(symbol));
  }

  /**
   * Unsubscribe from multiple symbols at once
   */
  unsubscribeFromSymbols(symbols: string[]): void {
    symbols.forEach((symbol) => this.unsubscribe(symbol));
  }

  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    const symbols = Array.from(this.subscribedSymbols);
    this.unsubscribeFromSymbols(symbols);
  }

  /**
   * Add price update callback
   */
  onPriceUpdate(callback: PriceUpdateCallback): () => void {
    this.priceUpdateCallbacks.add(callback);
    return () => this.priceUpdateCallbacks.delete(callback);
  }

  /**
   * Add connection status callback
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Add error callback
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Notify all price update callbacks
   */
  private notifyPriceUpdate(update: StockPriceUpdate): void {
    this.priceUpdateCallbacks.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in price update callback:', error);
      }
    });
  }

  /**
   * Notify all connection callbacks
   */
  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  /**
   * Notify all error callbacks
   */
  private notifyError(error: string): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.subscribedSymbols.clear();
    this.priceUpdateCallbacks.clear();
    this.connectionCallbacks.clear();
    this.errorCallbacks.clear();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
