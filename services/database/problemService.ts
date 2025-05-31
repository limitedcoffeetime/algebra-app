import { getDBConnection } from './db';
import { Problem } from './schema';

const nowISO = () => new Date().toISOString();

// Helper to map DB row to Problem object (handles JSON and boolean)
function mapRowToProblem(row: any): Problem {
  return {
    ...row,
    solutionSteps: row.solutionSteps ? JSON.parse(row.solutionSteps) : [],
    isCompleted: !!row.isCompleted, // Convert 0/1 to boolean
    solutionStepsShown: !!row.solutionStepsShown, // Convert 0/1 to boolean
  };
}

export async function getProblemsByBatchId(batchId: string): Promise<Problem[]> {
  const db = await getDBConnection();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM Problems WHERE batchId = ? ORDER BY createdAt ASC',
    batchId
  );
  return (rows || []).map(mapRowToProblem);
}

export async function getUnsolvedProblemsByBatchId(
  batchId: string,
  limit: number = 10
): Promise<Problem[]> {
  const db = await getDBConnection();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM Problems WHERE batchId = ? AND isCompleted = 0 ORDER BY createdAt ASC LIMIT ?',
    batchId,
    limit
  );
  return (rows || []).map(mapRowToProblem);
}

export async function getProblemById(id: string): Promise<Problem | null> {
  const db = await getDBConnection();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM Problems WHERE id = ?',
    id
  );
  return row ? mapRowToProblem(row) : null;
}

export async function updateProblem(
  problemId: string,
  updates: Partial<{
    isCompleted: boolean;
    userAnswer: string | number | null;
    solutionStepsShown: boolean;
  }>
): Promise<void> {
  const db = await getDBConnection();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.isCompleted !== undefined) {
    fields.push('isCompleted = ?');
    values.push(updates.isCompleted ? 1 : 0);
  }
  if (updates.userAnswer !== undefined) {
    fields.push('userAnswer = ?');
    values.push(updates.userAnswer === null ? null : String(updates.userAnswer));
  }
  if (updates.solutionStepsShown !== undefined) {
    fields.push('solutionStepsShown = ?');
    values.push(updates.solutionStepsShown ? 1 : 0);
  }

  if (fields.length === 0) {
    console.log('No fields to update for problem', problemId);
    return;
  }

  fields.push('updatedAt = ?');
  values.push(nowISO());

  const sql = `UPDATE Problems SET ${fields.join(', ')} WHERE id = ?`;
  values.push(problemId);

  try {
    const result = await db.runAsync(sql, ...values);
    if (result.changes > 0) {
        console.log(`Problem ${problemId} updated successfully.`);
    } else {
        console.warn(`Problem ${problemId} not found or no changes made.`);
    }
  } catch (error) {
    console.error(`Error updating problem ${problemId}:`, error);
    throw error;
  }
}

/**
 * Gets the count of completed problems for a given batch.
 */
export async function getCompletedProblemsCountByBatch(batchId: string): Promise<number> {
    const db = await getDBConnection();
    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Problems WHERE batchId = ? AND isCompleted = 1',
        batchId
    );
    return result?.count || 0;
}

/**
 * Gets the total count of problems for a given batch.
 */
export async function getTotalProblemsCountByBatch(batchId: string): Promise<number> {
    const db = await getDBConnection();
    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Problems WHERE batchId = ?',
        batchId
    );
    return result?.count || 0;
}
