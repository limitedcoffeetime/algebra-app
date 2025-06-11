import { logger } from '@/utils/logger';
import { db } from './database';
import { Achievement, UserProgress } from './database/schema';

// Predefined achievements
const ACHIEVEMENTS: Omit<Achievement, 'unlockedAt' | 'isUnlocked'>[] = [
  // Streak achievements
  { id: 'streak_3', name: 'Getting Started', description: 'Solve problems for 3 days in a row', icon: '🔥', type: 'streak', requirement: 3 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '⚡', type: 'streak', requirement: 7 },
  { id: 'streak_30', name: 'Month Master', description: 'Keep a 30-day streak alive', icon: '🏆', type: 'streak', requirement: 30 },
  { id: 'streak_100', name: 'Century Scholar', description: 'Incredible 100-day streak!', icon: '💎', type: 'streak', requirement: 100 },
  
  // Volume achievements  
  { id: 'volume_10', name: 'First Steps', description: 'Solve 10 problems', icon: '📚', type: 'volume', requirement: 10 },
  { id: 'volume_50', name: 'Problem Solver', description: 'Solve 50 problems', icon: '🎯', type: 'volume', requirement: 50 },
  { id: 'volume_200', name: 'Math Machine', description: 'Solve 200 problems', icon: '🚀', type: 'volume', requirement: 200 },
  
  // Accuracy achievements
  { id: 'accuracy_80', name: 'Sharp Shooter', description: 'Achieve 80% accuracy with 20+ problems', icon: '🎪', type: 'accuracy', requirement: 80 },
  { id: 'accuracy_90', name: 'Precision Master', description: 'Achieve 90% accuracy with 50+ problems', icon: '🎖️', type: 'accuracy', requirement: 90 },
  { id: 'accuracy_95', name: 'Perfectionist', description: 'Achieve 95% accuracy with 100+ problems', icon: '⭐', type: 'accuracy', requirement: 95 },
];

export class StreakService {
  /**
   * Initialize achievements in the database
   */
  static async initializeAchievements(): Promise<void> {
    try {
      for (const achievement of ACHIEVEMENTS) {
        await db.insertOrIgnoreAchievement({
          ...achievement,
          unlockedAt: null,
          isUnlocked: false,
        });
      }
      logger.info('🏆 Achievements initialized');
    } catch (error) {
      logger.error('Failed to initialize achievements:', error);
    }
  }

  /**
   * Update streak based on whether user got problems correct today
   */
  static async updateStreak(hadCorrectAnswersToday: boolean): Promise<{ 
    streakChanged: boolean; 
    newStreak: number; 
    achievementsUnlocked: Achievement[] 
  }> {
    try {
      const progress = await db.getUserProgress();
      if (!progress) {
        throw new Error('No user progress found');
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lastStreakDate = progress.lastStreakDate;
      
      let newStreak = progress.currentStreak;
      let streakChanged = false;

      // Check if we already processed today
      if (lastStreakDate === today) {
        return { streakChanged: false, newStreak, achievementsUnlocked: [] };
      }

      // Check if this is a consecutive day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (hadCorrectAnswersToday) {
        // Extend or start streak
        if (lastStreakDate === yesterdayStr) {
          // Consecutive day - extend streak
          newStreak = progress.currentStreak + 1;
        } else if (!lastStreakDate || lastStreakDate < yesterdayStr) {
          // First day or gap - start new streak
          newStreak = 1;
        }
        streakChanged = newStreak !== progress.currentStreak;
      } else {
        // No correct answers today - check if streak should break
        if (lastStreakDate && lastStreakDate < yesterdayStr) {
          // Gap in streak - reset to 0
          newStreak = 0;
          streakChanged = true;
        }
        // If lastStreakDate === yesterdayStr, keep current streak (allow 1 day gap)
      }

      // Update the database
      const updatedProgress: Partial<UserProgress> = {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, progress.longestStreak),
        lastStreakDate: hadCorrectAnswersToday ? today : progress.lastStreakDate,
        updatedAt: new Date().toISOString(),
      };

      await db.updateUserProgress(updatedProgress);

      // Check for newly unlocked achievements
      const achievementsUnlocked = await this.checkAndUnlockAchievements();

      logger.info(`🔥 Streak updated: ${progress.currentStreak} → ${newStreak}`);
      
      return { streakChanged, newStreak, achievementsUnlocked };
    } catch (error) {
      logger.error('Failed to update streak:', error);
      return { streakChanged: false, newStreak: 0, achievementsUnlocked: [] };
    }
  }

  /**
   * Check if any achievements should be unlocked based on current progress
   */
  static async checkAndUnlockAchievements(): Promise<Achievement[]> {
    try {
      const progress = await db.getUserProgress();
      if (!progress) return [];

      const unlockedAchievements: Achievement[] = [];
      const allAchievements = await db.getAllAchievements();

      for (const achievement of allAchievements) {
        if (achievement.isUnlocked) continue; // Already unlocked

        let shouldUnlock = false;

        switch (achievement.type) {
          case 'streak':
            shouldUnlock = progress.currentStreak >= achievement.requirement;
            break;
          
          case 'volume':
            shouldUnlock = progress.problemsCorrect >= achievement.requirement;
            break;
          
          case 'accuracy':
            if (progress.problemsAttempted >= 20) { // Minimum threshold for accuracy achievements
              const accuracy = Math.round((progress.problemsCorrect / progress.problemsAttempted) * 100);
              shouldUnlock = accuracy >= achievement.requirement;
            }
            break;
        }

        if (shouldUnlock) {
          const now = new Date().toISOString();
          await db.unlockAchievement(achievement.id, now);
          unlockedAchievements.push({
            ...achievement,
            isUnlocked: true,
            unlockedAt: now,
          });
          logger.info(`🏆 Achievement unlocked: ${achievement.name}`);
        }
      }

      return unlockedAchievements;
    } catch (error) {
      logger.error('Failed to check achievements:', error);
      return [];
    }
  }

  /**
   * Get streak motivation message
   */
  static getStreakMessage(streak: number): string {
    if (streak === 0) return "Start your streak today! 🔥";
    if (streak === 1) return "Great start! Keep it going 💪";
    if (streak < 7) return `${streak} days strong! 🔥`;
    if (streak < 30) return `Amazing ${streak}-day streak! ⚡`;
    if (streak < 100) return `Incredible ${streak}-day streak! 🏆`;
    return `Legendary ${streak}-day streak! 💎`;
  }

  /**
   * Check if user can use streak freeze (once per week)
   */
  static async canUseStreakFreeze(): Promise<boolean> {
    try {
      const progress = await db.getUserProgress();
      if (!progress || progress.streakFreezeUsed) return false;

      // Check if it's been a week since last freeze
      if (progress.lastStreakFreezeDate) {
        const lastFreeze = new Date(progress.lastStreakFreezeDate);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return lastFreeze < weekAgo;
      }

      return true; // Never used freeze before
    } catch (error) {
      logger.error('Failed to check streak freeze:', error);
      return false;
    }
  }

  /**
   * Use streak freeze to protect current streak
   */
  static async useStreakFreeze(): Promise<boolean> {
    try {
      const canUse = await this.canUseStreakFreeze();
      if (!canUse) return false;

      const now = new Date().toISOString();
      await db.updateUserProgress({
        streakFreezeUsed: true,
        lastStreakFreezeDate: now,
        updatedAt: now,
      });

      logger.info('❄️ Streak freeze used');
      return true;
    } catch (error) {
      logger.error('Failed to use streak freeze:', error);
      return false;
    }
  }

  /**
   * Reset weekly streak freeze (call this weekly)
   */
  static async resetWeeklyStreakFreeze(): Promise<void> {
    try {
      await db.updateUserProgress({
        streakFreezeUsed: false,
        updatedAt: new Date().toISOString(),
      });
      logger.info('❄️ Weekly streak freeze reset');
    } catch (error) {
      logger.error('Failed to reset streak freeze:', error);
    }
  }
}