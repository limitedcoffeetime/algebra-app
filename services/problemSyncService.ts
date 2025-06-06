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
    return this.handleAsync('🔄 Checking for new problems...', async () => {
      if (!this.LATEST_URL) {
        console.log('⚠️ No sync URL configured, skipping sync');
        return false;
      }

      const latestInfo = await this.fetchLatestInfo();
      if (!latestInfo) return false;

      // Check if we already have this batch
      const lastHash = await AsyncStorage.getItem(this.LAST_HASH_KEY);
      if (lastHash === latestInfo.hash) {
        console.log('✅ Already have latest problems');
        await this.updateLastSyncTime();
        return false;
      }

      // Download and import new batch
      console.log(`📥 Downloading new batch: ${latestInfo.batchId}`);
      const hasNewContent = await this.downloadAndImportBatch(latestInfo);

      if (hasNewContent) {
        await AsyncStorage.setItem(this.LAST_HASH_KEY, latestInfo.hash);
        await this.updateLastSyncTime();
        console.log('✅ Successfully synced new problems');
      }

      return hasNewContent;
    });
  }

  /**
   * Fetch the latest.json info from server
   */
  private static async fetchLatestInfo(): Promise<LatestInfo | null> {
    try {
      const response = await fetch(this.LATEST_URL, { cache: 'no-cache' });
      
      if (!response.ok) {
        console.error('Failed to fetch latest.json:', response.status);
        return null;
      }

      return await response.json();
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
      if (!response.ok) {
        console.error('Failed to download batch:', response.status);
        return false;
      }

      const batchData: ProblemBatchData = await response.json();

      // Validate the data
      if (!batchData.problems || !Array.isArray(batchData.problems)) {
        console.error('Invalid batch data format');
        return false;
      }

      // Import into database
      const result = await db.importProblemBatch(batchData);
      const hasNewContent = result !== 'SKIPPED_EXISTING';
      
      const message = result === 'SKIPPED_EXISTING' 
        ? `✅ Batch ${batchData.id} already exists locally - no import needed`
        : `✅ ${result === 'REPLACED_EXISTING' ? 'Replaced existing batch and imported' : 'Imported new batch with'} ${batchData.problems.length} problems`;
      
      console.log(message);
      return hasNewContent;
    } catch (error) {
      console.error('Error downloading/importing batch:', error);
      return false;
    }
  }

  /**
   * Update the last sync timestamp
   */
  private static async updateLastSyncTime(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, timestamp);
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
      return hoursSinceSync > 20; // Sync if it's been more than 20 hours
    } catch (error) {
      console.error('Error checking if sync needed:', error);
      return true; // Default to sync on error
    }
  }

  /**
   * Helper method to handle async operations with consistent error handling
   */
  private static async handleAsync<T>(logMessage: string | null, operation: () => Promise<T>): Promise<T> {
    try {
      if (logMessage) console.log(logMessage);
      return await operation();
    } catch (error) {
      console.error('❌ Operation failed:', error);
      throw error;
    }
  }
}
