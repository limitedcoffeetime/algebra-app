import { SyncConfig } from '../config/SyncConfig';
import { LatestInfo } from '../network/NetworkService';
import { LocalStorageService, StorageError } from '../storage/LocalStorageService';

export class SyncStateError extends Error {
  constructor(message: string, public operation?: string) {
    super(message);
    this.name = 'SyncStateError';
  }
}

export interface SyncDecision {
  shouldSync: boolean;
  reason: string;
  lastSyncTime?: string;
  currentHash?: string;
  latestHash?: string;
}

export class SyncStateManager {
  constructor(
    private config: SyncConfig,
    private storageService: LocalStorageService
  ) {}

  async shouldSync(): Promise<SyncDecision> {
    try {
      const lastSyncTime = await this.storageService.getLastSyncTimestamp();
      
      if (!lastSyncTime) {
        return {
          shouldSync: true,
          reason: 'No previous sync timestamp found',
        };
      }

      const lastSyncDate = new Date(lastSyncTime);
      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

      const shouldSyncBasedOnTime = hoursSinceSync > this.config.syncIntervalHours;
      
      return {
        shouldSync: shouldSyncBasedOnTime,
        reason: shouldSyncBasedOnTime 
          ? `Last sync was ${hoursSinceSync.toFixed(1)} hours ago (threshold: ${this.config.syncIntervalHours}h)`
          : `Recent sync: ${hoursSinceSync.toFixed(1)} hours ago`,
        lastSyncTime,
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw new SyncStateError(
          `Storage error while checking sync status: ${error.message}`,
          'CHECK_SYNC_STATUS'
        );
      }
      throw new SyncStateError(
        `Unexpected error while checking sync status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHECK_SYNC_STATUS'
      );
    }
  }

  async needsDownload(latestInfo: LatestInfo): Promise<SyncDecision> {
    try {
      const currentHash = await this.storageService.getLastHash();
      
      if (!currentHash) {
        return {
          shouldSync: true,
          reason: 'No local hash found, download needed',
          latestHash: latestInfo.hash,
        };
      }

      const needsUpdate = currentHash !== latestInfo.hash;
      
      return {
        shouldSync: needsUpdate,
        reason: needsUpdate 
          ? 'Hash mismatch, new content available'
          : 'Hash matches, no update needed',
        currentHash,
        latestHash: latestInfo.hash,
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw new SyncStateError(
          `Storage error while checking download needs: ${error.message}`,
          'CHECK_DOWNLOAD_NEEDS'
        );
      }
      throw new SyncStateError(
        `Unexpected error while checking download needs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHECK_DOWNLOAD_NEEDS'
      );
    }
  }

  async recordSuccessfulSync(hash: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await Promise.all([
        this.storageService.setLastSyncTimestamp(timestamp),
        this.storageService.setLastHash(hash),
      ]);
    } catch (error) {
      if (error instanceof StorageError) {
        throw new SyncStateError(
          `Storage error while recording sync: ${error.message}`,
          'RECORD_SYNC'
        );
      }
      throw new SyncStateError(
        `Unexpected error while recording sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RECORD_SYNC'
      );
    }
  }

  async resetSyncState(): Promise<void> {
    try {
      await this.storageService.clearAllSyncData();
    } catch (error) {
      if (error instanceof StorageError) {
        throw new SyncStateError(
          `Storage error while resetting sync state: ${error.message}`,
          'RESET_SYNC_STATE'
        );
      }
      throw new SyncStateError(
        `Unexpected error while resetting sync state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RESET_SYNC_STATE'
      );
    }
  }

  async forceNextSync(): Promise<void> {
    try {
      await this.storageService.clearLastHash();
    } catch (error) {
      if (error instanceof StorageError) {
        throw new SyncStateError(
          `Storage error while forcing sync: ${error.message}`,
          'FORCE_SYNC'
        );
      }
      throw new SyncStateError(
        `Unexpected error while forcing sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FORCE_SYNC'
      );
    }
  }
}