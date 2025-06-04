import { db, Problem, UserProgress } from '@/services/database';
import { ProblemSyncService } from '@/services/problemSyncService';
import { create } from 'zustand';

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
  forceSync: () => Promise<void>;
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
        console.log('🔄 Checking for new problems...');
        try {
          const newProblems = await ProblemSyncService.syncProblems();
          if (newProblems) {
            console.log('✅ Downloaded new problems');
          }
        } catch (syncError) {
          console.error('⚠️ Sync failed but continuing with local data:', syncError);
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
      console.error('Initialization error:', error);
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
      console.error('Failed to load problem:', error);
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
      console.error('Failed to submit answer:', error);
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
      console.error('Failed to reset progress:', error);
      set({ error: 'Failed to reset progress' });
    }
  },

  // Force sync
  forceSync: async () => {
    try {
      await ProblemSyncService.syncProblems();
      const progress = await db.getUserProgress();
      set({ userProgress: progress });
    } catch (error) {
      console.error('Failed to force sync:', error);
      set({ error: 'Failed to force sync' });
    }
  }
}));
