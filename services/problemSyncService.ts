import { db } from './database';
import { problemSyncOrchestrator } from './sync/ProblemSyncOrchestrator';

// Legacy interfaces maintained for backward compatibility
interface LatestInfo {
  batchId: string;
  url: string;
  hash: string;
  generatedAt: string;
  problemCount: number;
}

interface ProblemBatchData {
  id: string;
  generationDate: string;
  problemCount: number;
  problems: any[];
}

/**
 * Legacy ProblemSyncService class that now delegates to the new orchestrator
 * @deprecated Use ProblemSyncOrchestrator directly for new code
 */
export class ProblemSyncService {
  /**
   * Check if new problems are available and download them
   */
  static async syncProblems(): Promise<boolean> {
    try {
      const result = await problemSyncOrchestrator.syncProblems();
      return result.hasNewContent;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return false;
    }
  }

  /**
   * Get last sync timestamp
   */
  static async getLastSyncTime(): Promise<string | null> {
    return await problemSyncOrchestrator.getLastSyncTime();
  }

  /**
   * Force a sync check (for manual testing)
   */
  static async forceSyncCheck(): Promise<boolean> {
    try {
      const result = await problemSyncOrchestrator.forceSyncCheck();
      return result.hasNewContent;
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return false;
    }
  }

  /**
   * Check if sync is needed (called once per day)
   */
  static async shouldSync(): Promise<boolean> {
    return await problemSyncOrchestrator.shouldSync();
  }

  // Legacy methods - kept for compatibility but no longer recommended

  /**
   * @deprecated Use ProblemSyncOrchestrator.fetchLatestInfo() instead
   */
  private static async fetchLatestInfo(): Promise<LatestInfo | null> {
    console.warn('⚠️ Using deprecated fetchLatestInfo method. Consider using ProblemSyncOrchestrator directly.');
    return null;
  }

  /**
   * @deprecated Use ProblemSyncOrchestrator.downloadAndImportBatch() instead
   */
  private static async downloadAndImportBatch(latestInfo: LatestInfo): Promise<boolean> {
    console.warn('⚠️ Using deprecated downloadAndImportBatch method. Consider using ProblemSyncOrchestrator directly.');
    return false;
  }

  /**
   * @deprecated Use LocalStorageService.setLastSyncTimestamp() instead
   */
  private static async updateLastSyncTime(): Promise<void> {
    console.warn('⚠️ Using deprecated updateLastSyncTime method. Consider using ProblemSyncOrchestrator directly.');
    try {
      const timestamp = new Date().toISOString();
      await db.updateUserProgress({ lastSyncTimestamp: timestamp });
    } catch (error) {
      console.error('Error updating sync time:', error);
    }
  }
}
