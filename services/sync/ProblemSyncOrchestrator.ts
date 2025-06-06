import { SyncConfig, SyncConfigService } from '../config/SyncConfig';
import { db } from '../database';
import { LogContext, Logger } from '../logging/Logger';
import { LatestInfo, NetworkError, NetworkService } from '../network/NetworkService';
import { LocalStorageService } from '../storage/LocalStorageService';
import { SyncStateError, SyncStateManager } from './SyncStateManager';

export interface SyncResult {
  success: boolean;
  hasNewContent: boolean;
  error?: string;
  batchId?: string;
  problemCount?: number;
}

export class SyncError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public operation?: string
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export class ProblemSyncOrchestrator {
  private config: SyncConfig;
  private networkService: NetworkService;
  private storageService: LocalStorageService;
  private stateManager: SyncStateManager;

  constructor() {
    this.config = SyncConfigService.getConfig();
    this.networkService = new NetworkService(this.config);
    this.storageService = new LocalStorageService();
    this.stateManager = new SyncStateManager(this.config, this.storageService);
  }

  async syncProblems(): Promise<SyncResult> {
    const startTime = Date.now();
    const context: LogContext = { operation: 'SYNC_PROBLEMS' };

    try {
      Logger.sync('Starting problem synchronization', context);

      // Validate configuration
      if (!SyncConfigService.isConfigValid(this.config)) {
        Logger.warn('No sync URL configured, skipping sync', context);
        return { success: false, hasNewContent: false, error: 'No sync URL configured' };
      }

      // Check if sync is needed based on time
      const syncDecision = await this.stateManager.shouldSync();
      Logger.debug(`Sync decision: ${syncDecision.reason}`, { 
        ...context, 
        operation: 'TIME_CHECK' 
      });

      // Always check for new content, regardless of time
      const latestInfo = await this.fetchLatestInfo(context);
      if (!latestInfo) {
        return { success: false, hasNewContent: false, error: 'Failed to fetch latest info' };
      }

      // Check if download is needed
      const downloadDecision = await this.stateManager.needsDownload(latestInfo);
      Logger.debug(`Download decision: ${downloadDecision.reason}`, { 
        ...context, 
        operation: 'HASH_CHECK',
        hash: latestInfo.hash 
      });

      if (!downloadDecision.shouldSync) {
        Logger.info('Already have latest problems', { 
          ...context, 
          hash: latestInfo.hash 
        });
        await this.stateManager.recordSuccessfulSync(latestInfo.hash);
        return { success: true, hasNewContent: false };
      }

      // Download and import new batch
      const importResult = await this.downloadAndImportBatch(latestInfo, context);
      
      if (importResult.success) {
        await this.stateManager.recordSuccessfulSync(latestInfo.hash);
        const duration = Date.now() - startTime;
        Logger.success('Successfully synced new problems', { 
          ...context, 
          batchId: latestInfo.batchId,
          duration 
        });
        return importResult;
      }

      return importResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Sync failed', { 
        ...context, 
        duration 
      });
      
      if (error instanceof SyncError) {
        return { success: false, hasNewContent: false, error: error.message };
      }
      
      return { 
        success: false, 
        hasNewContent: false, 
        error: `Unexpected sync error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async forceSyncCheck(): Promise<SyncResult> {
    const context: LogContext = { operation: 'FORCE_SYNC' };
    
    try {
      Logger.sync('Force sync requested', context);
      await this.stateManager.forceNextSync();
      return await this.syncProblems();
    } catch (error) {
      Logger.error('Force sync failed', context);
      
      if (error instanceof SyncStateError) {
        throw new SyncError(
          'Failed to force sync',
          error,
          'FORCE_SYNC'
        );
      }
      
      throw new SyncError(
        `Unexpected error during force sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        'FORCE_SYNC'
      );
    }
  }

  async shouldSync(): Promise<boolean> {
    try {
      const decision = await this.stateManager.shouldSync();
      return decision.shouldSync;
    } catch (error) {
      Logger.error('Failed to check if sync is needed', { operation: 'SHOULD_SYNC' });
      return true; // Default to sync on error
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    try {
      return await this.storageService.getLastSyncTimestamp();
    } catch (error) {
      Logger.error('Failed to get last sync time', { operation: 'GET_LAST_SYNC' });
      return null;
    }
  }

  private async fetchLatestInfo(context: LogContext): Promise<LatestInfo | null> {
    try {
      Logger.debug('Fetching latest info', { ...context, operation: 'FETCH_LATEST' });
      return await this.networkService.fetchLatestInfo();
    } catch (error) {
      if (error instanceof NetworkError) {
        Logger.error(`Network error: ${error.message}`, { 
          ...context, 
          operation: error.operation,
          statusCode: error.statusCode 
        });
      } else {
        Logger.error('Unexpected error fetching latest info', { 
          ...context, 
          operation: 'FETCH_LATEST' 
        });
      }
      return null;
    }
  }

  private async downloadAndImportBatch(
    latestInfo: LatestInfo, 
    context: LogContext
  ): Promise<SyncResult> {
    try {
      Logger.download(`Downloading batch: ${latestInfo.batchId}`, { 
        ...context, 
        operation: 'DOWNLOAD_BATCH',
        batchId: latestInfo.batchId 
      });

      const batchData = await this.networkService.downloadBatch(latestInfo.url);
      
      Logger.debug('Importing batch into database', { 
        ...context, 
        operation: 'IMPORT_BATCH',
        batchId: batchData.id 
      });

      const result = await db.importProblemBatch(batchData);

      switch (result) {
        case 'SKIPPED_EXISTING':
          Logger.info('Batch already exists locally - no import needed', { 
            ...context, 
            batchId: batchData.id 
          });
          return { 
            success: true, 
            hasNewContent: false, 
            batchId: batchData.id,
            problemCount: batchData.problems.length 
          };

        case 'REPLACED_EXISTING':
          Logger.success('Replaced existing batch and imported problems', { 
            ...context, 
            batchId: batchData.id 
          });
          return { 
            success: true, 
            hasNewContent: true, 
            batchId: batchData.id,
            problemCount: batchData.problems.length 
          };

        default:
          Logger.success('Imported new batch', { 
            ...context, 
            batchId: batchData.id 
          });
          return { 
            success: true, 
            hasNewContent: true, 
            batchId: batchData.id,
            problemCount: batchData.problems.length 
          };
      }
    } catch (error) {
      if (error instanceof NetworkError) {
        const errorMessage = `Download failed: ${error.message}`;
        Logger.error(errorMessage, { 
          ...context, 
          operation: error.operation,
          statusCode: error.statusCode 
        });
        return { success: false, hasNewContent: false, error: errorMessage };
      }
      
      const errorMessage = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      Logger.error(errorMessage, { ...context, operation: 'IMPORT_BATCH' });
      return { success: false, hasNewContent: false, error: errorMessage };
    }
  }
}

// Create and export a singleton instance
export const problemSyncOrchestrator = new ProblemSyncOrchestrator();