import { db, TopicAccuracy } from '@/services/database';
import { useProblemStore } from '@/store/problemStore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProgressScreen() {
  const { userProgress } = useProblemStore();
  const [topicStats, setTopicStats] = useState<TopicAccuracy[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const stats = await db.getTopicAccuracyStats();
      setTopicStats(stats);
    };
    fetchStats();
  }, [userProgress]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Progress</Text>

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
});
