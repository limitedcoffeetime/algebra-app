export interface SyncConfig {
  latestUrl: string;
  syncIntervalHours: number;
  requestTimeoutMs: number;
  maxRetryAttempts: number;
}

export class SyncConfigService {
  private static readonly DEFAULT_SYNC_INTERVAL_HOURS = 20;
  private static readonly DEFAULT_TIMEOUT_MS = 30000;
  private static readonly DEFAULT_MAX_RETRIES = 3;

  static getConfig(): SyncConfig {
    return {
      latestUrl: process.env.EXPO_PUBLIC_PROBLEMS_LATEST_URL || '',
      syncIntervalHours: this.DEFAULT_SYNC_INTERVAL_HOURS,
      requestTimeoutMs: this.DEFAULT_TIMEOUT_MS,
      maxRetryAttempts: this.DEFAULT_MAX_RETRIES,
    };
  }

  static isConfigValid(config: SyncConfig): boolean {
    return Boolean(config.latestUrl);
  }
}

// Type declaration for process.env in React Native/Expo environment
declare const process: {
  env: {
    EXPO_PUBLIC_PROBLEMS_LATEST_URL?: string;
  };
};