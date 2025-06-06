import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './database';

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

export class ProblemSyncService {
  private static readonly LATEST_URL = process.env.EXPO_PUBLIC_PROBLEMS_LATEST_URL || '';
  private static readonly LAST_SYNC_KEY = 'lastSyncTimestamp';
  private static readonly LAST_HASH_KEY = 'lastProblemHash';

  /**
   * Check if new problems are available and download them
   */
  static async syncProblems(): Promise<boolean> {
    return this.withErrorHandling('🔄 Checking for new problems...', async () => {
      if (!this.LATEST_URL) {
        console.log('⚠️ No sync URL configured, skipping sync');
        return false;
      }

      const latestInfo = await this.fetchLatestInfo();
      if (!latestInfo) return false;

      const lastHash = await AsyncStorage.getItem(this.LAST_HASH_KEY);
      if (lastHash === latestInfo.hash) {
        console.log('✅ Already have latest problems');
        await this.updateLastSyncTime();
        return false;
      }

      console.log(`📥 Downloading new batch: ${latestInfo.batchId}`);
      const success = await this.downloadAndImportBatch(latestInfo);

      if (success) {
        await AsyncStorage.setItem(this.LAST_HASH_KEY, latestInfo.hash);
        await this.updateLastSyncTime();
        console.log('✅ Successfully synced new problems');
      }

      return success;
    });
  }

  /**
   * Fetch the latest.json info from server
   */
  private static async fetchLatestInfo(): Promise<LatestInfo | null> {
    return this.withErrorHandling('Fetching latest info...', async () => {
      const response = await fetch(this.LATEST_URL, { cache: 'no-cache' });
      
      if (!response.ok) {
        console.error('Failed to fetch latest.json:', response.status);
        return null;
      }

      return await response.json() as LatestInfo;
    });
  }

  /**
   * Download and import a problem batch
   */
  private static async downloadAndImportBatch(latestInfo: LatestInfo): Promise<boolean> {
    return this.withErrorHandling(`Downloading batch from: ${latestInfo.url}`, async () => {
      const response = await fetch(latestInfo.url);
      if (!response.ok) {
        console.error('Failed to download batch:', response.status);
        return false;
      }

      const batchData: ProblemBatchData = await response.json();

      if (!Array.isArray(batchData.problems)) {
        console.error('Invalid batch data format');
        return false;
      }

      const result = await db.importProblemBatch(batchData);
      const messages = {
        'SKIPPED_EXISTING': `✅ Batch ${batchData.id} already exists locally - no import needed`,
        'REPLACED_EXISTING': `✅ Replaced existing batch and imported ${batchData.problems.length} problems`,
        'IMPORTED_NEW': `✅ Imported new batch with ${batchData.problems.length} problems`
      };

      console.log(messages[result] || messages['IMPORTED_NEW']);
      return result !== 'SKIPPED_EXISTING';
    });
  }

  /**
   * Update the last sync timestamp
   */
  private static async updateLastSyncTime(): Promise<void> {
    await this.withErrorHandling('Updating sync time...', async () => {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, timestamp);
      await db.updateUserProgress({ lastSyncTimestamp: timestamp });
    });
  }

  /**
   * Get last sync timestamp
   */
  static async getLastSyncTime(): Promise<string | null> {
    return this.withErrorHandling('Getting last sync time...', () => 
      AsyncStorage.getItem(this.LAST_SYNC_KEY)
    );
  }

  /**
   * Force a sync check (for manual testing)
   */
  static async forceSyncCheck(): Promise<boolean> {
    await AsyncStorage.removeItem(this.LAST_HASH_KEY);
    return this.syncProblems();
  }

  /**
   * Check if sync is needed (called once per day)
   */
  static async shouldSync(): Promise<boolean> {
    return this.withErrorHandling('Checking if sync needed...', async () => {
      const lastSync = await this.getLastSyncTime();
      if (!lastSync) return true;

      const hoursSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
      return hoursSinceSync > 20;
    }, true); // Default to sync on error
  }

  /**
   * Generic error handling wrapper
   */
  private static async withErrorHandling<T>(
    operation: string, 
    fn: () => Promise<T>, 
    defaultValue?: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error(`❌ ${operation} failed:`, error);
      if (defaultValue !== undefined) return defaultValue;
      throw error;
    }
  }
}
