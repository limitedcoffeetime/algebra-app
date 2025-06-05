// Mock database for development - avoids SQLite native module issues
import { getDummyBatchAndProblemsInput } from './dummyData';
import { Problem, ProblemBatch, UserProgress } from './schema';

// In-memory storage
let problems: Problem[] = [];
let batches: ProblemBatch[] = [];
let userProgress: UserProgress | null = null;
let isInitialized = false;

// Initialize with dummy data from JSON
async function initializeMockData() {
  if (isInitialized) return;

  batches = [];
  problems = [];

  try {
    const dummyBatchAndProblemsInput = await getDummyBatchAndProblemsInput();

    dummyBatchAndProblemsInput.forEach((data, index) => {
      const batchId = data.batch.id || `batch-${index + 1}`;
      const now = new Date().toISOString();
      batches.push({
        ...data.batch,
        id: batchId,
        importedAt: now
      });

      data.problems.forEach((problem, pIndex) => {
        problems.push({
          ...problem,
          id: problem.id || `${batchId}-problem-${pIndex + 1}`,
          batchId,
          isCompleted: false,
          userAnswer: null,
          createdAt: now,
          updatedAt: now
        });
      });
    });

    const now = new Date().toISOString();
    userProgress = {
      id: 'user-1',
      currentBatchId: batches[0]?.id || null,
      problemsAttempted: 0,
      problemsCorrect: 0,
      createdAt: now,
      updatedAt: now
    };

    isInitialized = true;
    console.log('Mock database initialized with data from JSON file');
  } catch (error) {
    console.error('Failed to initialize mock database with JSON data:', error);
    // Initialize with empty data as fallback
    userProgress = {
      id: 'user-1',
      currentBatchId: null,
      problemsAttempted: 0,
      problemsCorrect: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    isInitialized = true;
  }
}

export const mockDb = {
  async init() {
    console.log('Initializing mock database...');
    await initializeMockData();
    return true;
  },

  async seedDummy() {
    console.log('Mock database already seeded with JSON data');
  },

  async getLatestBatch() {
    await initializeMockData();
    return batches[batches.length - 1] || null;
  },

  async getAllBatches() {
    await initializeMockData();
    return batches;
  },

  async getBatchById(id: string) {
    await initializeMockData();
    return batches.find(b => b.id === id) || null;
  },

  async getProblemsByBatch(batchId: string) {
    await initializeMockData();
    return problems.filter(p => p.batchId === batchId);
  },

  async getUnsolvedProblems(batchId: string, limit?: number) {
    await initializeMockData();
    const unsolved = problems.filter(p => p.batchId === batchId && !p.isCompleted);
    return limit ? unsolved.slice(0, limit) : unsolved;
  },

  async getProblemById(id: string) {
    await initializeMockData();
    return problems.find(p => p.id === id) || null;
  },

  async updateProblem(id: string, updates: Partial<Problem>) {
    await initializeMockData();
    const index = problems.findIndex(p => p.id === id);
    if (index >= 0) {
      problems[index] = { ...problems[index], ...updates };
    }
  },

  async getUserProgress() {
    await initializeMockData();
    return userProgress;
  },

  async updateUserProgress(updates: Partial<UserProgress>) {
    await initializeMockData();
    if (userProgress) {
      userProgress = { ...userProgress, ...updates };
    }
  },

  async resetUserProgress() {
    await initializeMockData();
    if (userProgress) {
      userProgress.problemsAttempted = 0;
      userProgress.problemsCorrect = 0;
    }

    // Also reset all problems back to unsolved
    problems.forEach(problem => {
      problem.isCompleted = false;
      problem.userAnswer = null;
    });
  },

  async getNextProblem() {
    await initializeMockData();
    if (!userProgress?.currentBatchId) {
      const latestBatch = batches[batches.length - 1];
      if (latestBatch) {
        userProgress = {
          ...userProgress!,
          currentBatchId: latestBatch.id
        };
      }
    }

    const unsolved = problems.find(p =>
      p.batchId === userProgress?.currentBatchId && !p.isCompleted
    );
    return unsolved || null;
  },

  async submitAnswer(problemId: string, userAnswer: string, isCorrect: boolean) {
    // Update the problem first
    await this.updateProblem(problemId, {
      isCompleted: true,
      userAnswer
    });

    // Then update user progress
    if (userProgress) {
      const newUserProgress = {
        problemsAttempted: userProgress.problemsAttempted + 1,
        problemsCorrect: userProgress.problemsCorrect + (isCorrect ? 1 : 0)
      };
      await this.updateUserProgress(newUserProgress);
    }
  },

  async getTopicAccuracyStats() {
    await initializeMockData();
    const stats: Record<string, { attempted: number; correct: number }> = {};
    problems.forEach((p) => {
      if (!p.isCompleted) return;
      const type = p.problemType;
      if (!stats[type]) {
        stats[type] = { attempted: 0, correct: 0 };
      }
      stats[type].attempted += 1;

      // Use the same validation logic as answer submission
      const userAns = String(p.userAnswer ?? '').trim();
      const correctAns = String(p.answer ?? '').trim();

      // Try numeric comparison (exact match for integer solutions)
      const numericUserAnswer = parseFloat(userAns);
      const numericCorrectAnswer = parseFloat(correctAns);

      const isCorrect = !isNaN(numericUserAnswer) && !isNaN(numericCorrectAnswer) &&
                       numericUserAnswer === numericCorrectAnswer;

      if (isCorrect) {
        stats[type].correct += 1;
      }
    });
    return Object.entries(stats).map(([problemType, data]) => ({
      problemType,
      attempted: data.attempted,
      correct: data.correct,
      incorrect: data.attempted - data.correct,
    }));
  },

  // Add batch function for completeness
  async addBatch(batch: Omit<ProblemBatch, 'id' | 'importedAt'>, problemsData: Omit<Problem, 'id' | 'batchId' | 'isCompleted' | 'userAnswer' | 'createdAt' | 'updatedAt'>[]) {
    await initializeMockData();
    const batchId = `batch-${batches.length + 1}`;
    const now = new Date().toISOString();
    const newBatch: ProblemBatch = {
      ...batch,
      id: batchId,
      importedAt: now
    };
    batches.push(newBatch);

    problemsData.forEach((problem, index) => {
      problems.push({
        ...problem,
        id: `${batchId}-problem-${index + 1}`,
        batchId,
        isCompleted: false,
        userAnswer: null,
        createdAt: now,
        updatedAt: now
      });
    });

    return newBatch;
  },

  // Import problem batch (for sync service)
  async importProblemBatch(batchData: { id: string; generationDate: string; problemCount: number; problems: any[] }): Promise<'SKIPPED_EXISTING' | 'REPLACED_EXISTING' | 'IMPORTED_NEW'> {
    await initializeMockData();

    // Check if batch with exact same ID already exists
    const existingBatch = batches.find(b => b.id === batchData.id);
    if (existingBatch) {
      console.log(`Batch ${batchData.id} already exists, skipping import`);
      return 'SKIPPED_EXISTING';
    }

    // Check if a batch with the same generation date (but different ID) exists
    const batchDateOnly = batchData.generationDate.split('T')[0];
    const existingBatchSameDate = batches.find(b =>
      b.generationDate.split('T')[0] === batchDateOnly && b.id !== batchData.id
    );

    let isReplacement = false;
    if (existingBatchSameDate) {
      console.log(`Replacing existing batch ${existingBatchSameDate.id} from same date with newer batch ${batchData.id}`);

      // Remove the old batch and its problems
      batches = batches.filter(b => b.id !== existingBatchSameDate.id);
      problems = problems.filter(p => p.batchId !== existingBatchSameDate.id);
      isReplacement = true;
    }

    const now = new Date().toISOString();

    const newBatch: ProblemBatch = {
      id: batchData.id,
      generationDate: batchData.generationDate,
      problemCount: batchData.problemCount,
      importedAt: now
    };
    batches.push(newBatch);

    batchData.problems.forEach((problem) => {
      problems.push({
        ...problem,
        batchId: batchData.id,
        isCompleted: false,
        userAnswer: null,
        createdAt: now,
        updatedAt: now
      });
    });

    console.log(`Importing ${isReplacement ? 'replacement' : 'new'} batch ${batchData.id} with ${batchData.problems.length} problems`);
    return isReplacement ? 'REPLACED_EXISTING' : 'IMPORTED_NEW';
  }
};
