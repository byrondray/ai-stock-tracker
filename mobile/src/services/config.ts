/**
 * Configuration service for managing app settings and API configuration
 */
import Constants from 'expo-constants';

export interface AppConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  version: string;
}

class ConfigService {
  private config: AppConfig;

  constructor() {
    const extra = Constants.expoConfig?.extra || {};

    this.config = {
      apiBaseUrl: extra.apiBaseUrl || 'http://localhost:8000',
      wsBaseUrl: extra.wsBaseUrl || 'ws://localhost:8000',
      isDevelopment: __DEV__,
      isProduction: !__DEV__,
      version: Constants.expoConfig?.version || '1.0.0',
    };

    // Override with environment variables in development
    if (__DEV__) {
      // You can override these during development
      this.config.apiBaseUrl =
        process.env.EXPO_PUBLIC_API_BASE_URL || this.config.apiBaseUrl;
      this.config.wsBaseUrl =
        process.env.EXPO_PUBLIC_WS_BASE_URL || this.config.wsBaseUrl;
    }
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  getWsBaseUrl(): string {
    return this.config.wsBaseUrl;
  }

  isDev(): boolean {
    return this.config.isDevelopment;
  }

  isProd(): boolean {
    return this.config.isProduction;
  }

  getVersion(): string {
    return this.config.version;
  }

  // API endpoint builders
  buildApiUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.apiBaseUrl}/api/v1${cleanPath}`;
  }

  buildWsUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.wsBaseUrl}/ws${cleanPath}`;
  }
}

export const configService = new ConfigService();
export default configService;
