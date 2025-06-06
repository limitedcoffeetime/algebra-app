import { logger } from '@/utils/logger';
import { ProblemBatchInput, ProblemInput } from "./schema";

// Define the structure of our JSON file
interface SampleProblemsData {
  batches: Array<{
    id: string;
    generationDate: string;
    sourceUrl: string;
    problemCount: number;
  }>;
  problems: Array<{
    id: string;
    batchId: string;
    equation: string;
    answer: string;
    solutionSteps: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    problemType: string;
    isCompleted: boolean;
  }>;
}

// Load the JSON data
const loadSampleProblemsData = async (): Promise<SampleProblemsData> => {
  try {
    // Load the JSON file from assets
    const jsonData = require('../../assets/data/sampleProblems.json');
    return jsonData as SampleProblemsData;
  } catch (error) {
    logger.error('Failed to load sample problems JSON:', error);
    throw new Error('Failed to load sample problems data');
  }
};

// Convert JSON data to database input format
export const getSampleBatchAndProblemsInput = async () => {
  const data = await loadSampleProblemsData();

  // Convert to the expected format for database insertion
  const batchAndProblemsInput = data.batches.map(batch => {
    const batchInput: ProblemBatchInput = {
      id: batch.id,
      generationDate: batch.generationDate,
      sourceUrl: batch.sourceUrl,
      problemCount: batch.problemCount
    };

    const problemsInput: ProblemInput[] = data.problems
      .filter(problem => problem.batchId === batch.id)
      .map(problem => ({
        id: problem.id,
        batchId: problem.batchId,
        equation: problem.equation,
        answer: problem.answer,
        solutionSteps: problem.solutionSteps,
        difficulty: problem.difficulty,
        problemType: problem.problemType,
        isCompleted: problem.isCompleted
      }));

    return {
      batch: batchInput,
      problems: problemsInput
    };
  });

  return batchAndProblemsInput;
};

// Export individual arrays for backward compatibility
export const getSampleProblemBatches = async (): Promise<ProblemBatchInput[]> => {
  const data = await loadSampleProblemsData();
  return data.batches.map(batch => ({
    id: batch.id,
    generationDate: batch.generationDate,
    sourceUrl: batch.sourceUrl,
    problemCount: batch.problemCount
  }));
};

export const getSampleProblems = async (): Promise<ProblemInput[]> => {
  const data = await loadSampleProblemsData();
  return data.problems.map(problem => ({
    id: problem.id,
    batchId: problem.batchId,
    equation: problem.equation,
    answer: problem.answer,
    solutionSteps: problem.solutionSteps,
    difficulty: problem.difficulty,
    problemType: problem.problemType,
    isCompleted: problem.isCompleted
  }));
};
