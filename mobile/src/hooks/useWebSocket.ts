/**
 * React hook for managing WebSocket connections and real-time price updates
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService, StockPriceUpdate } from '../services/websocket';

export interface UseWebSocketOptions {
  symbols?: string[];
  autoConnect?: boolean;
  onPriceUpdate?: (update: StockPriceUpdate) => void;
  onError?: (error: string) => void;
}

export interface WebSocketState {
  connected: boolean;
  prices: Record<string, StockPriceUpdate>;
  error: string | null;
  lastUpdate: Date | null;
}

/**
 * Hook for managing WebSocket connection and real-time price updates
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { symbols = [], autoConnect = true, onPriceUpdate, onError } = options;

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    prices: {},
    error: null,
    lastUpdate: null,
  });

  const symbolsRef = useRef<string[]>([]);
  const callbacksRef = useRef({ onPriceUpdate, onError });

  // Update callback refs
  useEffect(() => {
    callbacksRef.current = { onPriceUpdate, onError };
  }, [onPriceUpdate, onError]);

  // Handle price updates
  const handlePriceUpdate = useCallback((update: StockPriceUpdate) => {
    setState((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [update.symbol]: update,
      },
      lastUpdate: new Date(),
      error: null, // Clear error on successful update
    }));

    // Call external callback if provided
    callbacksRef.current.onPriceUpdate?.(update);
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setState((prev) => ({
      ...prev,
      connected,
      error: connected ? null : prev.error, // Clear error on successful connection
    }));
  }, []);

  // Handle errors
  const handleError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      error,
    }));

    // Call external callback if provided
    callbacksRef.current.onError?.(error);
  }, []);

  // Subscribe to symbols
  const subscribe = useCallback((symbolsToSubscribe: string[]) => {
    webSocketService.subscribeToSymbols(symbolsToSubscribe);
  }, []);

  // Unsubscribe from symbols
  const unsubscribe = useCallback((symbolsToUnsubscribe: string[]) => {
    webSocketService.unsubscribeFromSymbols(symbolsToUnsubscribe);
  }, []);

  // Clear all subscriptions
  const clearSubscriptions = useCallback(() => {
    webSocketService.clearSubscriptions();
    setState((prev) => ({
      ...prev,
      prices: {},
    }));
  }, []);

  // Get price for specific symbol
  const getPrice = useCallback(
    (symbol: string): StockPriceUpdate | null => {
      return state.prices[symbol.toUpperCase()] || null;
    },
    [state.prices]
  );

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!autoConnect) return;

    const unsubscribePriceUpdate =
      webSocketService.onPriceUpdate(handlePriceUpdate);
    const unsubscribeConnection = webSocketService.onConnectionChange(
      handleConnectionChange
    );
    const unsubscribeError = webSocketService.onError(handleError);

    // Set initial connection state
    setState((prev) => ({
      ...prev,
      connected: webSocketService.isConnected(),
    }));

    return () => {
      unsubscribePriceUpdate();
      unsubscribeConnection();
      unsubscribeError();
    };
  }, [autoConnect, handlePriceUpdate, handleConnectionChange, handleError]);

  // Manage symbol subscriptions
  useEffect(() => {
    if (!autoConnect) return;

    const currentSymbols = symbolsRef.current;
    const newSymbols = symbols;

    // Find symbols to subscribe and unsubscribe
    const toSubscribe = newSymbols.filter(
      (symbol) => !currentSymbols.includes(symbol)
    );
    const toUnsubscribe = currentSymbols.filter(
      (symbol) => !newSymbols.includes(symbol)
    );

    // Update subscriptions
    if (toSubscribe.length > 0) {
      subscribe(toSubscribe);
    }
    if (toUnsubscribe.length > 0) {
      unsubscribe(toUnsubscribe);
    }

    // Update ref
    symbolsRef.current = newSymbols;
  }, [symbols, autoConnect, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (symbolsRef.current.length > 0) {
        unsubscribe(symbolsRef.current);
      }
    };
  }, [unsubscribe]);

  return {
    // State
    connected: state.connected,
    prices: state.prices,
    error: state.error,
    lastUpdate: state.lastUpdate,

    // Actions
    subscribe,
    unsubscribe,
    clearSubscriptions,
    getPrice,

    // Service reference for advanced usage
    service: webSocketService,
  };
};

/**
 * Hook for getting real-time price of a single stock
 */
export const useStockPrice = (symbol: string) => {
  const { prices, connected, error, getPrice } = useWebSocket({
    symbols: symbol ? [symbol] : [],
    autoConnect: true,
  });

  return {
    price: getPrice(symbol),
    connected,
    error,
    loading: connected && !getPrice(symbol),
  };
};

/**
 * Hook for getting real-time prices of multiple stocks
 */
export const useStockPrices = (symbols: string[]) => {
  const { prices, connected, error } = useWebSocket({
    symbols,
    autoConnect: true,
  });

  const getPrices = useCallback(() => {
    return symbols.reduce((acc, symbol) => {
      const price = prices[symbol.toUpperCase()];
      if (price) {
        acc[symbol] = price;
      }
      return acc;
    }, {} as Record<string, StockPriceUpdate>);
  }, [symbols, prices]);

  return {
    prices: getPrices(),
    connected,
    error,
    loading:
      connected && symbols.some((symbol) => !prices[symbol.toUpperCase()]),
  };
};

export default useWebSocket;
