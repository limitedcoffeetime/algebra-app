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

  private static handleError(message: string, error?: any): false {
    console.error(`❌ ${message}`, error || '');
    return false;
  }

  private static async updateStorage(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  /**
   * Check if new problems are available and download them
   */
  static async syncProblems(): Promise<boolean> {
    try {
      console.log('🔄 Checking for new problems...');

      if (!this.LATEST_URL) {
        console.log('⚠️ No sync URL configured, skipping sync');
        return false;
      }

      const latestInfo = await this.fetchLatestInfo();
      if (!latestInfo) return this.handleError('Failed to fetch latest info');

      const lastHash = await AsyncStorage.getItem(this.LAST_HASH_KEY);
      if (lastHash === latestInfo.hash) {
        console.log('✅ Already have latest problems');
        await this.updateLastSyncTime();
        return false;
      }

      console.log(`📥 Downloading new batch: ${latestInfo.batchId}`);
      const success = await this.downloadAndImportBatch(latestInfo);

      if (success) {
        await this.updateStorage(this.LAST_HASH_KEY, latestInfo.hash);
        await this.updateLastSyncTime();
        console.log('✅ Successfully synced new problems');
      }

      return success;
    } catch (error) {
      return this.handleError('Sync failed:', error);
    }
  }

  /**
   * Fetch the latest.json info from server
   */
  private static async fetchLatestInfo(): Promise<LatestInfo | null> {
    try {
      const response = await fetch(this.LATEST_URL, { cache: 'no-cache' });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error fetching latest info:', error);
      return null;
    }
  }

  /**
   * Download and import a problem batch
   */
  private static async downloadAndImportBatch(latestInfo: LatestInfo): Promise<boolean> {
    try {
      console.log(`Downloading batch from: ${latestInfo.url}`);

      const response = await fetch(latestInfo.url);
      if (!response.ok) return this.handleError('Failed to download batch:', response.status);

      const batchData: ProblemBatchData = await response.json();

      if (!Array.isArray(batchData?.problems)) {
        return this.handleError('Invalid batch data format');
      }

      const result = await db.importProblemBatch(batchData);
      const wasImported = result !== 'SKIPPED_EXISTING';
      
      console.log(wasImported 
        ? `✅ Imported ${batchData.problems.length} problems (${result.toLowerCase()})`
        : `✅ Batch ${batchData.id} already exists locally - no import needed`
      );

      return wasImported;
    } catch (error) {
      return this.handleError('Error downloading/importing batch:', error);
    }
  }

  /**
   * Update the last sync timestamp
   */
  private static async updateLastSyncTime(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await this.updateStorage(this.LAST_SYNC_KEY, timestamp);
      await db.updateUserProgress({ lastSyncTimestamp: timestamp });
    } catch (error) {
      console.error('Error updating sync time:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  static async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.LAST_SYNC_KEY);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
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
    try {
      const lastSync = await this.getLastSyncTime();
      if (!lastSync) return true;

      const hoursSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
      return hoursSinceSync > 20;
    } catch (error) {
      console.error('Error checking if sync needed:', error);
      return true;
    }
  }
}
