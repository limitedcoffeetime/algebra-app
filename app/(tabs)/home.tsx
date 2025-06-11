import Button from '@/components/Button';
import { useProblemStore } from '@/store/problemStore';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const tips = [
  "Focus on one problem at a time",
  "Don't rush - understand each step",
  "Practice makes perfect",
  "Check your work before submitting",
];

export default function HomeScreen() {
  const { userProgress, streakMessage, recentAchievements, dismissAchievements } = useProblemStore();

  // Get a random tip (deterministic based on day for consistency)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const currentTip = tips[dayOfYear % tips.length];

  const handleStartPractice = () => {
    router.navigate('/(tabs)');
  };

  const handleOpenSettings = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* App Title */}
        <View style={styles.headerSection}>
          <Text style={styles.appTitle}>🧮 Algebro</Text>
          <Text style={styles.subtitle}>Master algebra with step-by-step practice</Text>
        </View>

        {/* Streak Section */}
        {userProgress && (
          <View style={styles.streakSection}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View style={styles.streakInfo}>
                <Text style={styles.streakNumber}>{userProgress.currentStreak}</Text>
                <Text style={styles.streakLabel}>Day Streak</Text>
              </View>
              {userProgress.longestStreak > 0 && (
                <View style={styles.bestStreakInfo}>
                  <Text style={styles.bestStreakLabel}>Best: {userProgress.longestStreak}</Text>
                </View>
              )}
            </View>
            <Text style={styles.streakMessage}>{streakMessage}</Text>
          </View>
        )}

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <View style={styles.achievementSection}>
            <Text style={styles.achievementTitle}>🏆 Achievement Unlocked!</Text>
            {recentAchievements.map((achievement, index) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <View style={styles.achievementText}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                </View>
              </View>
            ))}
            <Button
              label="Awesome! ✨"
              onPress={dismissAchievements}
            />
          </View>
        )}

        {/* Progress Summary (if available) */}
        {userProgress && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProgress.problemsCorrect}</Text>
                <Text style={styles.statLabel}>Solved</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProgress.problemsAttempted}</Text>
                <Text style={styles.statLabel}>Attempted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {userProgress.problemsAttempted > 0
                    ? Math.round((userProgress.problemsCorrect / userProgress.problemsAttempted) * 100)
                    : 0}%
                </Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Action Buttons */}
        <View style={styles.actionsSection}>
          <View style={styles.primaryButtonContainer}>
            <Button
              label="📚 Start Practice"
              onPress={handleStartPractice}
              theme="primary"
            />
          </View>

          <View style={styles.secondaryButtonContainer}>
            <Button
              label="⚙️ Settings"
              onPress={handleOpenSettings}
            />
          </View>
        </View>

        {/* Tip of the Day */}
        <View style={styles.tipSection}>
          <Text style={styles.tipLabel}>💡 Tip:</Text>
          <Text style={styles.tipText}>{currentTip}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffd33d',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  streakSection: {
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  streakInfo: {
    alignItems: 'center',
    flex: 1,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  streakLabel: {
    fontSize: 16,
    color: '#fff',
    marginTop: 4,
  },
  bestStreakInfo: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bestStreakLabel: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  streakMessage: {
    fontSize: 16,
    color: '#ff6b35',
    textAlign: 'center',
    fontWeight: '500',
  },
  achievementSection: {
    width: '100%',
    backgroundColor: '#2d4a22',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  achievementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 15,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a16',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  achievementText: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#a7f3d0',
    lineHeight: 18,
  },
  progressSection: {
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd33d',
    textAlign: 'center',
    marginBottom: 15,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd33d',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  actionsSection: {
    width: '100%',
    marginBottom: 20,
  },
  primaryButtonContainer: {
    marginBottom: 15,
  },
  secondaryButtonContainer: {
    // Secondary button styling
  },
  tipSection: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  tipLabel: {
    fontSize: 16,
    color: '#ffd33d',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
  },
});
