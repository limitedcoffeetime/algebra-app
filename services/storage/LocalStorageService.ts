import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class LocalStorageService {
  private static readonly LAST_SYNC_KEY = 'lastSyncTimestamp';
  private static readonly LAST_HASH_KEY = 'lastProblemHash';

  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LocalStorageService.LAST_SYNC_KEY);
    } catch (error) {
      throw new StorageError(
        `Failed to get last sync timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_LAST_SYNC'
      );
    }
  }

  async setLastSyncTimestamp(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LocalStorageService.LAST_SYNC_KEY, timestamp);
    } catch (error) {
      throw new StorageError(
        `Failed to set last sync timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SET_LAST_SYNC'
      );
    }
  }

  async getLastHash(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LocalStorageService.LAST_HASH_KEY);
    } catch (error) {
      throw new StorageError(
        `Failed to get last hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_LAST_HASH'
      );
    }
  }

  async setLastHash(hash: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LocalStorageService.LAST_HASH_KEY, hash);
    } catch (error) {
      throw new StorageError(
        `Failed to set last hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SET_LAST_HASH'
      );
    }
  }

  async clearLastHash(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LocalStorageService.LAST_HASH_KEY);
    } catch (error) {
      throw new StorageError(
        `Failed to clear last hash: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_LAST_HASH'
      );
    }
  }

  async clearAllSyncData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(LocalStorageService.LAST_SYNC_KEY),
        AsyncStorage.removeItem(LocalStorageService.LAST_HASH_KEY),
      ]);
    } catch (error) {
      throw new StorageError(
        `Failed to clear sync data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_ALL_SYNC_DATA'
      );
    }
  }
}