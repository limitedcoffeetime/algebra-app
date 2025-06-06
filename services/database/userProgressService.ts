import { logger } from '@/utils/logger';
import { getDBConnection } from './db';
import { UserProgress } from './schema';

const USER_PROGRESS_ID = 'currentUser'; // Singleton ID for user progress row
const nowISO = () => new Date().toISOString();

// Helper to map DB row to UserProgress object
function mapRowToUserProgress(row: any): UserProgress {
  return {
    id: row.id,
    currentBatchId: row.currentBatchId === undefined || row.currentBatchId === null ? null : row.currentBatchId,
    problemsAttempted: row.problemsAttempted || 0,
    problemsCorrect: row.problemsCorrect || 0,
    lastSyncTimestamp: row.lastSyncTimestamp === undefined || row.lastSyncTimestamp === null ? null : row.lastSyncTimestamp,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserProgress(): Promise<UserProgress | null> {
  const db = await getDBConnection();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM UserProgress WHERE id = ?',
    USER_PROGRESS_ID
  );
  return row ? mapRowToUserProgress(row) : null;
}

export async function initializeUserProgress(): Promise<UserProgress> {
  let progress = await getUserProgress();
  if (progress) {
    return progress;
  }

  const db = await getDBConnection();
  const currentTime = nowISO();
  const newProgressData = {
    id: USER_PROGRESS_ID,
    currentBatchId: null,
    problemsAttempted: 0,
    problemsCorrect: 0,
    lastSyncTimestamp: null,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  const sql = `
    INSERT INTO UserProgress (id, currentBatchId, problemsAttempted, problemsCorrect, lastSyncTimestamp, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  await db.runAsync(
    sql,
    newProgressData.id,
    newProgressData.currentBatchId,
    newProgressData.problemsAttempted,
    newProgressData.problemsCorrect,
    newProgressData.lastSyncTimestamp,
    newProgressData.createdAt,
    newProgressData.updatedAt
  );
  logger.info('User progress initialized.');
  return (await getUserProgress())!;
}

export async function updateUserProgress(
  updates: Partial<Omit<UserProgress, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<UserProgress> {
  const db = await getDBConnection();
  const existingProgress = await getUserProgress();
  if (!existingProgress) {
    logger.warn('UserProgress not found, initializing first.');
    await initializeUserProgress();
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if ('currentBatchId' in updates) {
    fields.push('currentBatchId = ?');
    values.push(updates.currentBatchId === undefined ? null : updates.currentBatchId);
  }
  if (updates.problemsAttempted !== undefined) {
    fields.push('problemsAttempted = ?');
    values.push(updates.problemsAttempted);
  }
  if (updates.problemsCorrect !== undefined) {
    fields.push('problemsCorrect = ?');
    values.push(updates.problemsCorrect);
  }
  if ('lastSyncTimestamp' in updates) {
    fields.push('lastSyncTimestamp = ?');
    values.push(updates.lastSyncTimestamp === undefined ? null : updates.lastSyncTimestamp);
  }

  if (fields.length === 0) {
    logger.info('No fields to update for UserProgress');
    return (await getUserProgress())!;
  }

  fields.push('updatedAt = ?');
  values.push(nowISO());

  const sql = `UPDATE UserProgress SET ${fields.join(', ')} WHERE id = ?`;
  values.push(USER_PROGRESS_ID);

  await db.runAsync(sql, ...values);
  logger.info('User progress updated.');

  const updatedProgress = await getUserProgress();
  if (!updatedProgress) {
    throw new Error('Failed to retrieve updated user progress.');
  }
  return updatedProgress;
}

/**
 * Resets user progress to its initial state.
 * Does not delete problem batches or problems.
 */
export async function resetUserProgress(): Promise<UserProgress> {
    const db = await getDBConnection();
    const currentTime = nowISO();

    const resetSql = `
        UPDATE UserProgress
        SET currentBatchId = ?,
            problemsAttempted = ?,
            problemsCorrect = ?,
            lastSyncTimestamp = ?,
            updatedAt = ?
        WHERE id = ?;
    `;

    await db.runAsync(
        resetSql,
        null,
        0,
        0,
        null,
        currentTime,
        USER_PROGRESS_ID
    );
    logger.info('User progress has been reset.');

    let progress = await getUserProgress();
    if (!progress) {
        logger.warn('UserProgress was not found after reset, re-initializing.');
        progress = await initializeUserProgress();
    }
    return progress;
}
