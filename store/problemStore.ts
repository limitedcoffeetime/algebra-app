import { db, Problem, UserProgress } from '@/services/database';
import { ProblemSyncService } from '@/services/problemSyncService';
import { logger } from '@/utils/logger';
import { create } from 'zustand';

interface BatchInfo {
  id: string;
  generationDate: string;
  importedAt: string;
  problemCount: number;
  completedCount: number;
  isCurrentBatch: boolean;
  sourceUrl?: string | null;
}

interface ProblemStore {
  // State
  currentProblem: Problem | null;
  userProgress: UserProgress | null;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: string | null;

  // Actions
  initialize: () => Promise<void>;
  loadNextProblem: () => Promise<void>;
  submitAnswer: (userAnswer: string, isCorrect: boolean) => Promise<void>;
  resetProgress: () => Promise<void>;
  forceSync: () => Promise<boolean>;
  getBatchesInfo: () => Promise<BatchInfo[]>;
}

export const useProblemStore = create<ProblemStore>((set, get) => ({
  // Initial state
  currentProblem: null,
  userProgress: null,
  isLoading: false,
  error: null,
  lastSyncTime: null,

  // Initialize the app
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // Initialize database
      const success = await db.init();
      if (!success) {
        throw new Error('Failed to initialize database');
      }

      // Seed dummy data for development
      await db.seedDummy();

      // Check for new problems if we should sync
      const shouldSync = await ProblemSyncService.shouldSync();
      if (shouldSync) {
        logger.info('🔄 Checking for new problems...');
        try {
          const newProblems = await ProblemSyncService.syncProblems();
          if (newProblems) {
            logger.info('✅ Downloaded new problems');
          }
        } catch (syncError) {
          logger.error('⚠️ Sync failed but continuing with local data:', syncError);
          // Don't fail initialization if sync fails
        }
      }

      // Load user progress
      const progress = await db.getUserProgress();
      const lastSync = await ProblemSyncService.getLastSyncTime();
      set({ userProgress: progress, lastSyncTime: lastSync });

      // Load first problem
      await get().loadNextProblem();
    } catch (error) {
      logger.error('Initialization error:', error);
      set({ error: 'Failed to initialize app' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Load next problem
  loadNextProblem: async () => {
    try {
      const problem = await db.getNextProblem();
      if (problem) {
        set({ currentProblem: problem, error: null });
      } else {
        set({ error: 'No more problems available!' });
      }
    } catch (error) {
      logger.error('Failed to load problem:', error);
      set({ error: 'Failed to load problem' });
    }
  },

  // Submit answer
  submitAnswer: async (userAnswer: string, isCorrect: boolean) => {
    const { currentProblem } = get();
    if (!currentProblem) return;

    try {
      await db.submitAnswer(currentProblem.id, userAnswer, isCorrect);

      // Refresh user progress
      const progress = await db.getUserProgress();
      set({ userProgress: progress, error: null });
    } catch (error) {
      logger.error('Failed to submit answer:', error);
      set({ error: 'Failed to save answer' });
    }
  },

  // Reset progress
  resetProgress: async () => {
    try {
      set({ error: null }); // Clear any existing errors
      await db.resetUserProgress();
      const progress = await db.getUserProgress();
      set({ userProgress: progress });
      await get().loadNextProblem();
    } catch (error) {
      logger.error('Failed to reset progress:', error);
      set({ error: 'Failed to reset progress' });
    }
  },

  // Force sync
  forceSync: async () => {
    try {
      const hasNewProblems = await ProblemSyncService.forceSyncCheck();
      const progress = await db.getUserProgress();
      set({ userProgress: progress });
      return hasNewProblems;
    } catch (error) {
      logger.error('Failed to force sync:', error);
      set({ error: 'Failed to force sync' });
      return false;
    }
  },

  // Get batches info for debugging
  getBatchesInfo: async () => {
    try {
      const allBatches = await db.getAllBatches();
      const userProgress = await db.getUserProgress();

      const batchesInfo = await Promise.all(
        allBatches.map(async (batch) => {
          const problems = await db.getProblemsByBatch(batch.id);
          const completedProblems = problems.filter(p => p.isCompleted);

          return {
            id: batch.id,
            generationDate: batch.generationDate,
            importedAt: batch.importedAt,
            problemCount: batch.problemCount,
            completedCount: completedProblems.length,
            isCurrentBatch: batch.id === userProgress?.currentBatchId,
            sourceUrl: batch.sourceUrl
          };
        })
      );

      return batchesInfo;
    } catch (error) {
      logger.error('Failed to get batches info:', error);
      return [];
    }
  }
}));
