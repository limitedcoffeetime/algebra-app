import { logger } from '@/utils/logger';
import { getSampleBatchAndProblemsInput, getSampleProblemBatches, getSampleProblems } from './sampleDataLoader';
import { ProblemBatchInput, ProblemInput } from "./schema";

// Helper to create ISO timestamps
const now = () => new Date().toISOString();

// Keep legacy constants for any code that might reference them
// These will now be dynamically loaded but we maintain the same IDs
export const DUMMY_BATCH_1_ID = "batch_sample_001";
export const DUMMY_BATCH_2_ID = "batch_sample_002";

// Legacy function to get dummy problem batches (now loads from JSON)
export const getDummyProblemBatchesInput = async (): Promise<ProblemBatchInput[]> => {
  return await getSampleProblemBatches();
};

// Legacy function to get dummy problems (now loads from JSON)
export const getDummyProblemsInput = async (): Promise<ProblemInput[]> => {
  return await getSampleProblems();
};

// Main export that maintains the same structure as before
export const getDummyBatchAndProblemsInput = async () => {
  return await getSampleBatchAndProblemsInput();
};

// For backward compatibility, export synchronous versions that will be loaded once
let cachedBatchAndProblemsInput: any[] = [];
let cacheInitialized = false;

// Initialize cache on first access
const initializeCache = async () => {
  if (!cacheInitialized) {
    cachedBatchAndProblemsInput = await getSampleBatchAndProblemsInput();
    cacheInitialized = true;
  }
};

// Backward compatibility exports (these will load async on first access)
export let dummyProblemBatchesInput: ProblemBatchInput[] = [];
export let dummyProblemsInput: ProblemInput[] = [];
export let dummyBatchAndProblemsInput: any[] = [];

// Initialize the cache and update the exports
const initializeLegacyExports = async () => {
  try {
    await initializeCache();

    // Update the legacy exports with loaded data
    const batches = await getSampleProblemBatches();
    const problems = await getSampleProblems();

    dummyProblemBatchesInput.length = 0;
    dummyProblemBatchesInput.push(...batches);

    dummyProblemsInput.length = 0;
    dummyProblemsInput.push(...problems);

    dummyBatchAndProblemsInput.length = 0;
    dummyBatchAndProblemsInput.push(...cachedBatchAndProblemsInput);

    logger.info('Sample problems loaded from JSON file');
  } catch (error) {
    logger.error('Failed to load sample problems from JSON, falling back to empty arrays:', error);
  }
};

// Initialize immediately
initializeLegacyExports();
