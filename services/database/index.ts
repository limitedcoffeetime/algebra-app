// Main database service - Clean and simple interface for the app
import { logger } from '@/utils/logger';
import { getDBConnection, runInTransactionAsync } from './db';
import { getDummyBatchAndProblemsInput } from './dummyData';
import { mockDb } from './mockDb';
import * as problemBatchService from './problemBatchService';
import * as problemService from './problemService';
import { Achievement } from './schema';
import { IDatabase } from './types';
import * as userProgressService from './userProgressService';

// Re-export types
export * from './schema';

// Determine whether to use the in-memory mock DB or the real SQLite implementation.
// The decision is driven entirely by the EXPO_PUBLIC_USE_MOCK_DB env variable so that
// behaviour can be toggled at runtime (e.g. on CI or in production builds).
const USE_MOCK_DB = process.env.EXPO_PUBLIC_USE_MOCK_DB === 'true';

// To use real SQLite:
// 1. Export EXPO_PUBLIC_USE_MOCK_DB=false (or remove the variable entirely)
// 2. Run: npx expo run:ios (for local build)
// 3. OR: Create an EAS development build

// When running a bundled binary that would normally use SQLite you can still force the
// mock implementation with:
//   EXPO_PUBLIC_USE_MOCK_DB=true npx expo start

// Function to get current database type
export function getDatabaseType(): 'Mock Database' | 'SQLite' {
  return USE_MOCK_DB ? 'Mock Database' : 'SQLite';
}

// Database initialization
export async function initializeDatabase() {
  try {
    logger.info('Initializing database...');
    await getDBConnection(); // This creates tables if they don't exist

    // Initialize user progress if it doesn't exist
    await userProgressService.initializeUserProgress();

    logger.info('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    return false;
  }
}

// Seed with dummy data (for development) - Now loads from JSON
export async function seedDummyData() {
  try {
    logger.info('Seeding dummy data from JSON file...');

    // Check if we already have data
    const existingBatches = await problemBatchService.getAllProblemBatches();
    if (existingBatches.length > 0) {
      logger.info('Database already has data, skipping seed');
      return;
    }

    // Load data from JSON file
    const dummyBatchAndProblemsInput = await getDummyBatchAndProblemsInput();

    // Add dummy batches
    for (const batchData of dummyBatchAndProblemsInput) {
      await problemBatchService.addProblemBatch(
        batchData.batch,
        batchData.problems
      );
    }

    logger.info('Dummy data seeded successfully from JSON file');
  } catch (error) {
    logger.error('Failed to seed dummy data:', error);
  }
}

// Export the appropriate database implementation
export const db: IDatabase = USE_MOCK_DB ? mockDb : {
  // Initialize
  init: initializeDatabase,
  seedDummy: seedDummyData,

  // Problem Batches
  addBatch: problemBatchService.addProblemBatch,
  importProblemBatch: problemBatchService.importProblemBatch,
  getLatestBatch: problemBatchService.getLatestProblemBatch,
  getAllBatches: problemBatchService.getAllProblemBatches,
  getBatchById: problemBatchService.getProblemBatchById,
  deleteProblemBatch: problemBatchService.deleteProblemBatch,
  deleteProblemBatches: problemBatchService.deleteProblemBatches,
  cleanupOrphanedBatches: problemBatchService.cleanupOrphanedBatches,
  getBatchStatistics: problemBatchService.getBatchStatistics,

  // Problems
  getProblemsByBatch: problemService.getProblemsByBatchId,
  getUnsolvedProblems: problemService.getUnsolvedProblemsByBatchId,
  getProblemById: problemService.getProblemById,
  updateProblem: problemService.updateProblem,

  // User Progress
  getUserProgress: userProgressService.getUserProgress,
  updateUserProgress: userProgressService.updateUserProgress,
  resetUserProgress: async () => {
    // Reset all problems back to unsolved
    await problemService.resetAllProblems();
    // Reset user progress stats
    return await userProgressService.resetUserProgress();
  },

  // Achievements
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const database = await getDBConnection();
      const rows = await database.getAllAsync('SELECT * FROM Achievements ORDER BY type, requirement');
      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        type: row.type,
        requirement: row.requirement,
        unlockedAt: row.unlockedAt,
        isUnlocked: Boolean(row.isUnlocked),
      }));
    } catch (error) {
      logger.error('Failed to get all achievements:', error);
      return [];
    }
  },

  async getUnlockedAchievements(): Promise<Achievement[]> {
    try {
      const database = await getDBConnection();
      const rows = await database.getAllAsync(
        'SELECT * FROM Achievements WHERE isUnlocked = 1 ORDER BY unlockedAt DESC'
      );
      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        type: row.type,
        requirement: row.requirement,
        unlockedAt: row.unlockedAt,
        isUnlocked: true,
      }));
    } catch (error) {
      logger.error('Failed to get unlocked achievements:', error);
      return [];
    }
  },

  async insertOrIgnoreAchievement(achievement: Achievement): Promise<void> {
    try {
      const database = await getDBConnection();
      await database.runAsync(
        `INSERT OR IGNORE INTO Achievements 
         (id, name, description, icon, type, requirement, unlockedAt, isUnlocked)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          achievement.id,
          achievement.name,
          achievement.description,
          achievement.icon,
          achievement.type,
          achievement.requirement,
          achievement.unlockedAt,
          achievement.isUnlocked ? 1 : 0,
        ]
      );
    } catch (error) {
      logger.error('Failed to insert achievement:', error);
      throw error;
    }
  },

  async unlockAchievement(achievementId: string, unlockedAt: string): Promise<void> {
    try {
      const database = await getDBConnection();
      await database.runAsync(
        'UPDATE Achievements SET isUnlocked = 1, unlockedAt = ? WHERE id = ?',
        [unlockedAt, achievementId]
      );
    } catch (error) {
      logger.error('Failed to unlock achievement:', error);
      throw error;
    }
  },

  // Utility function to get next problem for user
  async getNextProblem() {
    let progress = await userProgressService.getUserProgress();

    // If no current batch, default to the latest batch
    if (!progress?.currentBatchId) {
      const latestBatch = await problemBatchService.getLatestProblemBatch();
      if (!latestBatch) return null;

      await userProgressService.updateUserProgress({
        currentBatchId: latestBatch.id,
      });
      progress = await userProgressService.getUserProgress();
    }

    if (!progress?.currentBatchId) {
      return null;
    }

    // Try to get next unsolved problem from the current batch
    let problems = await problemService.getUnsolvedProblemsByBatchId(progress.currentBatchId, 1);
    if (problems.length > 0) {
      return problems[0];
    }

    // No problems left in current batch. Try to move to the next available batch
    const batches = await problemBatchService.getAllProblemBatches();
    const currentIndex = batches.findIndex((b) => b.id === progress!.currentBatchId);
    for (let i = currentIndex + 1; i < batches.length; i++) {
      problems = await problemService.getUnsolvedProblemsByBatchId(batches[i].id, 1);
      if (problems.length > 0) {
        await userProgressService.updateUserProgress({ currentBatchId: batches[i].id });
        return problems[0];
      }
    }

    // No more problems in any batch
    return null;
  },

    // Submit answer and update progress
  async submitAnswer(problemId: string, userAnswer: string, isCorrect: boolean) {
    return runInTransactionAsync(async () => {
      // Update the problem first
      await problemService.updateProblem(problemId, {
        isCompleted: true,
        userAnswer: userAnswer
      });

      // Then update user progress
      const progress = await userProgressService.getUserProgress();
      if (progress) {
        await userProgressService.updateUserProgress({
          problemsAttempted: progress.problemsAttempted + 1,
          problemsCorrect: progress.problemsCorrect + (isCorrect ? 1 : 0)
        });
      }
    });
  },

  // Get accuracy stats by topic
  async getTopicAccuracyStats() {
    return await problemService.getTopicAccuracyStats();
  }
};
