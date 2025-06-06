import crypto from 'crypto';
import { Difficulty, PROBLEM_TYPES_BY_DIFFICULTY, ProblemType, TARGET_DIFFICULTY_MIX } from './constants';
import { GeneratedProblem, generateProblemsWithAI } from './openaiGenerator';

let PROBLEMS_PER_BATCH = parseInt(process.env.PROBLEMS_PER_BATCH || '5', 10);

export function configureProblemsPerBatch(count: number) {
  if (Number.isFinite(count) && count > 0) {
    PROBLEMS_PER_BATCH = count;
  }
}

function calculateProblemCounts() {
  const totalPercentage = Object.values(TARGET_DIFFICULTY_MIX).reduce((s, v) => s + v, 0);
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 } as any;
  let remaining = PROBLEMS_PER_BATCH;
  Object.entries(TARGET_DIFFICULTY_MIX).forEach(([difficulty, percentage], idx, arr) => {
    if (idx === arr.length - 1) {
      counts[difficulty as Difficulty] = remaining;
    } else {
      const c = Math.round((percentage / totalPercentage) * PROBLEMS_PER_BATCH);
      counts[difficulty as Difficulty] = c;
      remaining -= c;
    }
  });
  return counts;
}

export interface ProblemBatch {
  id: string;
  generationDate: string;
  problemCount: number;
  problems: GeneratedProblem[];
  targetCount: number;
  generationStats: {
    attempted: number;
    successful: number;
    failed: number;
    failedTypes: string[];
  };
}

export async function generateProblemBatch(): Promise<ProblemBatch> {
  const allProblems: GeneratedProblem[] = [];

  const now = new Date();
  const batchId = `${now.toISOString().split('T')[0]}-${now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '')}-${Math.random().toString(36).substring(2, 6)}`;

  const generationStats = { attempted: 0, successful: 0, failed: 0, failedTypes: [] as string[] };

  const difficultyCounts = calculateProblemCounts();

  for (const [difficulty, totalCount] of Object.entries(difficultyCounts) as [Difficulty, number][]) {
    if (totalCount === 0) continue;
    const allowedTypes = PROBLEM_TYPES_BY_DIFFICULTY[difficulty];
    const perType = Math.floor(totalCount / allowedTypes.length);
    const extra = totalCount % allowedTypes.length;

    for (let i = 0; i < allowedTypes.length; i++) {
      const type = allowedTypes[i] as ProblemType;
      const count = perType + (i < extra ? 1 : 0);
      if (count === 0) continue;
      generationStats.attempted += count;
      try {
        const problems = await generateProblemsWithAI(type, difficulty, count);
        allProblems.push(...problems);
        generationStats.successful += problems.length;
      } catch (e) {
        generationStats.failed += count;
        generationStats.failedTypes.push(`${type}-${difficulty}`);
      }
    }
  }

  const shuffled = allProblems.sort(() => Math.random() - 0.5).map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    batchId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return {
    id: batchId,
    generationDate: now.toISOString(),
    problemCount: shuffled.length,
    targetCount: PROBLEMS_PER_BATCH,
    problems: shuffled,
    generationStats,
  };
}