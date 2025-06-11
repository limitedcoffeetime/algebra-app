import { logger } from '@/utils/logger';
import * as SQLite from 'expo-sqlite';
import {
  CREATE_ACHIEVEMENTS_TABLE,
  CREATE_PROBLEM_BATCHES_TABLE,
  CREATE_PROBLEMS_TABLE,
  CREATE_USER_PROGRESS_TABLE,
} from './schema';

const DATABASE_NAME = 'algebro.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDBConnection(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  try {
    logger.info('Opening SQLite database...');
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON');

    // Check if tables exist and log their schemas
    await logDatabaseSchema(db);

    // Create tables
    await db.execAsync(CREATE_PROBLEM_BATCHES_TABLE);
    await db.execAsync(CREATE_PROBLEMS_TABLE);
    await db.execAsync(CREATE_USER_PROGRESS_TABLE);
    await db.execAsync(CREATE_ACHIEVEMENTS_TABLE);

    logger.info('Database initialized successfully');

    // Log schema again after creation
    await logDatabaseSchema(db);

    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

async function logDatabaseSchema(database: SQLite.SQLiteDatabase) {
  try {
    // Check if Problems table exists and get its schema
    const problemsTableInfo = await database.getAllAsync(
      "PRAGMA table_info(Problems)"
    );

    logger.debug('Problems table schema:', {
      exists: problemsTableInfo.length > 0,
      columns: problemsTableInfo.map((col: any) => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull,
        dflt_value: col.dflt_value
      }))
    });

    // Check for missing columns
    const hasVariablesColumn = problemsTableInfo.some((col: any) => col.name === 'variables');
    const hasDirectionColumn = problemsTableInfo.some((col: any) => col.name === 'direction');
    const hasAnswerLHSColumn = problemsTableInfo.some((col: any) => col.name === 'answerLHS');
    const hasAnswerRHSColumn = problemsTableInfo.some((col: any) => col.name === 'answerRHS');

    logger.info('Database column status:', {
      variables: hasVariablesColumn,
      direction: hasDirectionColumn,
      answerLHS: hasAnswerLHSColumn,
      answerRHS: hasAnswerRHSColumn
    });

    // Add missing variables column
    if (!hasVariablesColumn && problemsTableInfo.length > 0) {
      logger.warn('❌ Variables column missing - adding it now!');
      try {
        await database.execAsync(`
          ALTER TABLE Problems
          ADD COLUMN variables TEXT DEFAULT '["x"]'
        `);
        logger.info('✅ Added variables column to existing table');

        // Update existing records to have default variables
        await database.execAsync(`
          UPDATE Problems
          SET variables = '["x"]'
          WHERE variables IS NULL OR variables = ''
        `);
        logger.info('✅ Updated existing records with default variables');
      } catch (alterError) {
        logger.error('Failed to add variables column:', alterError);
      }
    }

    // Add missing direction column
    if (!hasDirectionColumn && problemsTableInfo.length > 0) {
      logger.warn('❌ Direction column missing - adding it now!');
      try {
        await database.execAsync(`
          ALTER TABLE Problems
          ADD COLUMN direction TEXT DEFAULT 'Solve for x'
        `);
        logger.info('✅ Added direction column to existing table');

        // Update existing records with default direction based on problem type
        await database.execAsync(`
          UPDATE Problems
          SET direction = CASE
            WHEN problemType LIKE '%quadratic%' THEN 'Find all solutions'
            WHEN problemType LIKE '%simplification%' THEN 'Simplify'
            WHEN problemType LIKE '%factoring%' THEN 'Factor'
            ELSE 'Solve for x'
          END
          WHERE direction IS NULL OR direction = ''
        `);
        logger.info('✅ Updated existing records with appropriate directions');
      } catch (alterError) {
        logger.error('Failed to add direction column:', alterError);
      }
    }

    // Add missing answerLHS column
    if (!hasAnswerLHSColumn && problemsTableInfo.length > 0) {
      logger.warn('❌ answerLHS column missing - adding it now!');
      try {
        await database.execAsync(`
          ALTER TABLE Problems
          ADD COLUMN answerLHS TEXT
        `);
        logger.info('✅ Added answerLHS column to existing table');
      } catch (alterError) {
        logger.error('Failed to add answerLHS column:', alterError);
      }
    }

    // Add missing answerRHS column
    if (!hasAnswerRHSColumn && problemsTableInfo.length > 0) {
      logger.warn('❌ answerRHS column missing - adding it now!');
      try {
        await database.execAsync(`
          ALTER TABLE Problems
          ADD COLUMN answerRHS TEXT
        `);
        logger.info('✅ Added answerRHS column to existing table');
      } catch (alterError) {
        logger.error('Failed to add answerRHS column:', alterError);
      }
    }

  } catch (error) {
    logger.error('Failed to check database schema:', error);
  }
}

// Utility for closing the database if ever needed (e.g., for testing or specific scenarios)
export async function closeDBConnection(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
      db = null;
      logger.info('Database connection closed.');
    } catch (error) {
      logger.error('Failed to close database connection:', error);
    }
  }
}

// Helper for transactions
export async function runInTransactionAsync<T>(
  fn: (tx: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const database = await getDBConnection();
  try {
    await database.execAsync('BEGIN TRANSACTION;');
    const result = await fn(database); // Pass the main db connection as it handles transactions internally
    await database.execAsync('COMMIT TRANSACTION;');
    return result;
  } catch (error) {
    logger.error('Transaction failed, rolling back:', error);
    await database.execAsync('ROLLBACK TRANSACTION;');
    throw error;
  }
}
