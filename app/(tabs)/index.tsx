import Button from '@/components/Button';
import FeedbackSection from '@/components/FeedbackSection';
import ProblemContainer from '@/components/ProblemContainer';
import { useProblemStore } from '@/store/problemStore';
import { isAnswerCorrect } from '@/utils/enhancedAnswerUtils';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function Index() {
  const [userAnswer, setUserAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const {
    currentProblem,
    userProgress,
    isLoading,
    error,
    initialize,
    loadNextProblem,
    submitAnswer
  } = useProblemStore();


  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

    const handleSubmit = async () => {
    if (!currentProblem || !userAnswer.trim()) return;

    Keyboard.dismiss();

    // Use the proper validation function that handles expressions correctly
    const correct = await isAnswerCorrect(userAnswer, currentProblem.answer);

    setIsCorrect(correct);
    setShowFeedback(true);

    // Update database
    await submitAnswer(userAnswer, correct);
  };

  const handleNextProblem = async () => {
    setUserAnswer('');
    setShowFeedback(false);
    await loadNextProblem();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ffd33d" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (error && !currentProblem) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button label="Retry" theme="primary" onPress={initialize} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Progress indicator */}
        {userProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Progress: {userProgress.problemsCorrect}/{userProgress.problemsAttempted}
            </Text>
          </View>
        )}

        {currentProblem && <ProblemContainer problem={currentProblem} />}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Your answer"
              placeholderTextColor="#999"
              keyboardType="numeric"
              onChangeText={(text) => {
                setUserAnswer(text);
                if (showFeedback) {
                  setShowFeedback(false);
                }
              }}
              value={userAnswer}
              editable={!showFeedback}
            />
            <Pressable
              style={styles.toggleSignButton}
              onPress={() => {
                if (userAnswer.startsWith('-')) {
                  setUserAnswer(userAnswer.slice(1));
                } else if (userAnswer) {
                  setUserAnswer('-' + userAnswer);
                } else {
                  setUserAnswer('-');
                }
              }}
            >
              <Text style={styles.toggleSignText}>±</Text>
            </Pressable>
          </View>
          <Button
            label={showFeedback ? "Next" : "Submit"}
            onPress={showFeedback ? handleNextProblem : handleSubmit}
          />
        </View>

        {showFeedback && currentProblem && (
          <FeedbackSection
            isCorrect={isCorrect}
            solutionSteps={currentProblem.solutionSteps}
          />
        )}

        {error && (
          <Text style={styles.warningText}>{error}</Text>
        )}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  progressText: {
    color: '#ffd33d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    justifyContent: 'space-between',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 18,
  },
  toggleSignButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#ffd33d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleSignText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#25292e',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  warningText: {
    color: '#ffa500',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});
