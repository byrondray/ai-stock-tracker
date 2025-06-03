/**
 * Services index - exports all service modules
 */

export { default as configService } from './config';
export type { AppConfig } from './config';

export { default as webSocketService } from './websocket';
export type {
  StockPriceUpdate,
  WebSocketMessage,
  PriceUpdateCallback,
  ConnectionCallback,
  ErrorCallback,
} from './websocket';

export { default as notificationService } from './notifications';
export type { NotificationData, PriceAlert } from './notifications';
