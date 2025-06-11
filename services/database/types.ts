import { Achievement, Problem, ProblemBatch, UserProgress } from './schema';

export type ImportResult = 'SKIPPED_EXISTING' | 'REPLACED_EXISTING' | 'IMPORTED_NEW';

export interface IDatabase {
  /* Initialization / seeding */
  init(): Promise<boolean>;
  seedDummy(): Promise<void>;

  /* Batch operations */
  getLatestBatch(): Promise<ProblemBatch | null>;
  getAllBatches(): Promise<ProblemBatch[]>;
  getBatchById(id: string): Promise<ProblemBatch | null>;
  addBatch?(batch: Omit<ProblemBatch, 'id' | 'importedAt'>, problemsData: any[]): Promise<any>;
  importProblemBatch(batchData: {
    id: string;
    generationDate: string;
    problemCount: number;
    problems: any[];
  }): Promise<ImportResult>;
  deleteProblemBatch(batchId: string): Promise<void>;
  deleteProblemBatches(batchIds: string[]): Promise<number>;
  cleanupOrphanedBatches(validBatchIds: string[]): Promise<number>;
  getBatchStatistics(): Promise<{
    totalBatches: number;
    totalProblems: number;
    completedProblems: number;
    oldestBatch: string | null;
    newestBatch: string | null;
  }>;

  /* Problem queries */
  getProblemsByBatch(batchId: string): Promise<Problem[]>;
  getUnsolvedProblems(batchId: string, limit?: number): Promise<Problem[]>;
  getProblemById(id: string): Promise<Problem | null>;
  updateProblem(id: string, updates: Partial<Problem>): Promise<void>;

  /* User progress */
  getUserProgress(): Promise<UserProgress | null>;
  updateUserProgress(updates: Partial<UserProgress>): Promise<UserProgress>;
  resetUserProgress(): Promise<UserProgress | void>;

  /* Achievement operations */
  getAllAchievements(): Promise<Achievement[]>;
  getUnlockedAchievements(): Promise<Achievement[]>;
  insertOrIgnoreAchievement(achievement: Achievement): Promise<void>;
  unlockAchievement(achievementId: string, unlockedAt: string): Promise<void>;

  /* Convenience helpers */
  getNextProblem(): Promise<Problem | null>;
  submitAnswer(problemId: string, userAnswer: string, isCorrect: boolean): Promise<void>;
  getTopicAccuracyStats?(): Promise<any>; // Optional because mockDb implements it, SQLite variant too
}
