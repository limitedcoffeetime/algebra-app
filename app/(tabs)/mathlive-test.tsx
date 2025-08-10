import TrainingMathInput from '@/components/TrainingMathInput';
import { useInitializeApp, useProblemStore, useUserProgressStore } from '@/store';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Add the VerificationResult interface to match the component
interface VerificationResult {
  isCorrect: boolean;
  userAnswerSimplified: string;
  correctAnswerSimplified: string;
  errorMessage?: string;
}

export default function MathLiveTest() {
  const [userAnswer, setUserAnswer] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [buttonState, setButtonState] = useState<'verify' | 'next'>('verify');
  const [hasRecordedAttempt, setHasRecordedAttempt] = useState(false);
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);

  // Store hooks
  const problemStore = useProblemStore();
  const userProgressStore = useUserProgressStore();
  const { initializeAll } = useInitializeApp();

  // Get safe area insets
  const insets = useSafeAreaInsets();

  // Initialize on mount
  useEffect(() => {
    initializeAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset answer when problem changes
  useEffect(() => {
    setUserAnswer('');
    setVerificationResult(null);
    setShowSolution(false);
    setButtonState('verify');
    setHasRecordedAttempt(false);
    setHadWrongAttempt(false);
  }, [problemStore.currentProblem?.id]);

  const handleInput = (latex: string) => {
    setUserAnswer(latex);
    // Clear previous verification when user changes input (but keep them in verify mode if they were there)
    if (buttonState === 'verify') {
      setVerificationResult(null);
      setShowSolution(false);
    }
  };

  // Handle answer verification using MathLive
  const handleVerifyAnswer = async (result: VerificationResult) => {
    setVerificationResult(result);

    if (result.isCorrect) {
      // Record as correct if they got it right (either first try or after trying again)
      if (!hasRecordedAttempt) {
        await userProgressStore.recordAttempt(true);
        setHasRecordedAttempt(true);
      }

      // Correct answer flow
      Alert.alert(
        '🎉 Correct!',
        'Great job! You solved the equation correctly.\n\nWould you like to see the step-by-step solution?',
        [
          {
            text: 'No, Next Problem',
            onPress: () => {
              setButtonState('next');
            }
          },
          {
            text: 'Show Solution',
            onPress: () => {
              setShowSolution(true);
              setButtonState('next');
            }
          },
        ]
      );
    } else {
      // Track that they had a wrong attempt (but don't record it yet)
      setHadWrongAttempt(true);

      // Incorrect answer flow - use appropriate title based on the error message
      const isAlmostThere = result.errorMessage?.includes('Almost there') || result.errorMessage?.includes('Fully simplify');
      const alertTitle = isAlmostThere ? '🔍 Almost there!' : '🔄 Not Quite';
      const alertMessage = result.errorMessage || 'Your answer doesn\'t match our solution. Would you like to try again or see the solution?';

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'Try Again',
            style: 'cancel',
            onPress: () => {
              // Reset for another attempt
              setVerificationResult(null);
              setShowSolution(false);
              setButtonState('verify');
            }
          },
          {
            text: 'Show Solution',
            onPress: async () => {
              // Record as incorrect if they give up by showing solution after getting it wrong
              // We are already in the incorrect-answer branch, so avoid relying on potentially stale state
              if (!hasRecordedAttempt) {
                await userProgressStore.recordAttempt(false);
                setHasRecordedAttempt(true);
              }
              setShowSolution(true);
              setButtonState('next');
            }
          },
        ]
      );
    }
  };

  // This is only called when button is in "next" state
  const handleButtonPress = () => {
    handleNextProblem();
  };

  const handleNextProblem = async () => {
    await problemStore.loadNextProblem();
  };

  // Always render TrainingMathInput, let it handle loading states internally
  return (
    <View style={[styles.fullScreen, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <View style={styles.mathLiveContainer}>
          <TrainingMathInput
            value={userAnswer}
            onInput={handleInput}
            onVerifyAnswer={handleVerifyAnswer}
            onButtonPress={handleButtonPress}
            buttonState={buttonState}
            placeholder="Enter your answer using the full screen..."
            problem={problemStore.currentProblem || undefined}
            userProgress={userProgressStore.userProgress || undefined}
            showSolution={showSolution}
            isLoading={problemStore.isLoading}
            error={problemStore.error}
            onRetry={initializeAll}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  mathLiveContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
