import { db, TopicAccuracy } from '@/services/database';
import { useProblemStore } from '@/store/problemStore';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Define Achievement interface locally to avoid circular imports
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'streak' | 'accuracy' | 'volume' | 'mastery';
  requirement: number;
  unlockedAt?: string | null;
  isUnlocked: boolean;
}

export default function ProgressScreen() {
  const { userProgress } = useProblemStore();
  const [topicStats, setTopicStats] = useState<TopicAccuracy[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const stats = await db.getTopicAccuracyStats();
      setTopicStats(stats);
    };
    
    const fetchAchievements = async () => {
      const allAchievements = await db.getAllAchievements();
      setAchievements(allAchievements);
    };
    
    fetchStats();
    fetchAchievements();
  }, [userProgress]);

  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const lockedAchievements = achievements.filter(a => !a.isUnlocked);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Progress</Text>

      {/* Streak Section */}
      {userProgress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Streak Progress</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Current Streak:</Text>
              <Text style={styles.statValue}>{userProgress.currentStreak} days</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Streak:</Text>
              <Text style={styles.statValue}>{userProgress.longestStreak} days</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Stats</Text>
        {userProgress ? (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Problems Attempted:</Text>
              <Text style={styles.statValue}>{userProgress.problemsAttempted}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Problems Correct:</Text>
              <Text style={styles.statValue}>{userProgress.problemsCorrect}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Accuracy:</Text>
              <Text style={styles.statValue}>
                {userProgress.problemsAttempted > 0
                  ? `${Math.round((userProgress.problemsCorrect / userProgress.problemsAttempted) * 100)}%`
                  : '0%'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>No progress data available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accuracy by Topic</Text>
        {topicStats.length === 0 ? (
          <Text style={styles.noDataText}>No attempts yet</Text>
        ) : (
          <View style={styles.statsContainer}>
            {topicStats.map((stat) => (
              <View key={stat.problemType} style={styles.statItem}>
                <Text style={styles.statLabel}>{stat.problemType}</Text>
                <Text style={styles.statValue}>{stat.correct}/{stat.attempted} correct</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Achievements Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Achievements</Text>
        
        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Unlocked ({unlockedAchievements.length})</Text>
            <View style={styles.achievementContainer}>
              {unlockedAchievements.map((achievement) => (
                <View key={achievement.id} style={[styles.achievementCard, styles.unlockedCard]}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementName}>{achievement.name}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                    {achievement.unlockedAt && (
                      <Text style={styles.unlockedDate}>
                        Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>
              Locked ({lockedAchievements.length})
            </Text>
            <View style={styles.achievementContainer}>
              {lockedAchievements.map((achievement) => (
                <View key={achievement.id} style={[styles.achievementCard, styles.lockedCard]}>
                  <Text style={styles.achievementIconLocked}>🔒</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementNameLocked}>{achievement.name}</Text>
                    <Text style={styles.achievementDescriptionLocked}>{achievement.description}</Text>
                    <Text style={styles.requirementText}>
                      {achievement.type === 'streak' && `Reach ${achievement.requirement}-day streak`}
                      {achievement.type === 'volume' && `Solve ${achievement.requirement} problems`}
                      {achievement.type === 'accuracy' && `Achieve ${achievement.requirement}% accuracy`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {achievements.length === 0 && (
          <Text style={styles.noDataText}>Loading achievements...</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd33d',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    marginTop: 10,
  },
  statsContainer: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  statLabel: {
    fontSize: 16,
    color: '#fff',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd33d',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  achievementContainer: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
  },
  unlockedCard: {
    backgroundColor: '#1a3a16',
    borderColor: '#10b981',
  },
  lockedCard: {
    backgroundColor: '#2a2a2a',
    borderColor: '#555',
  },
  achievementIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  achievementIconLocked: {
    fontSize: 24,
    marginRight: 15,
    opacity: 0.5,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  achievementNameLocked: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#a7f3d0',
    marginBottom: 4,
  },
  achievementDescriptionLocked: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  unlockedDate: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
  },
  requirementText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
