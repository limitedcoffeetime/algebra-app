import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCollapsible } from 'react-native-fast-collapsible';
import Animated from 'react-native-reanimated';
import SmartMathRenderer from './SmartMathRenderer';

interface StepByStepSolutionProps {
  steps: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

const StepByStepSolution: React.FC<StepByStepSolutionProps> = ({
  steps,
  isExpanded,
  onToggle
}) => {
  const { animatedStyles, onLayout } = useCollapsible({
    isVisible: isExpanded,
    duration: 300,
  });

  return (
    <>
      <Pressable onPress={onToggle} style={styles.toggleButton}>
        <Text style={styles.toggleText}>
          {isExpanded ? 'Hide' : 'Show'} step-by-step solution
        </Text>
      </Pressable>

      <Animated.View
        style={[animatedStyles, styles.collapsibleOverflow]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <View onLayout={onLayout} style={styles.collapsibleContent}>
          <View style={styles.solutionContainer}>
            <Text style={styles.solutionTitle}>Step-by-step solution:</Text>
            {steps.map((step, index) => (
              <SolutionStep key={index} step={step} />
            ))}
          </View>
        </View>
      </Animated.View>
    </>
  );
};

// Individual step component for better modularity
const SolutionStep: React.FC<{ step: string }> = ({ step }) => {
  // Check if the step contains math expressions
  const hasMath = /[x-z]|[\^]|[\+\-\*\/]|=/.test(step);

  if (hasMath) {
    return (
      <View style={styles.stepContainer}>
                                 <SmartMathRenderer
          text={step}
          fontSize={16}
          color="#ffffff"
          style={styles.stepMath}
        />
      </View>
    );
  }

  return <Text style={styles.solutionStep}>{step}</Text>;
};

const styles = StyleSheet.create({
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toggleText: {
    fontSize: 16,
    color: '#ffd33d',
    textDecorationLine: 'underline',
  },
  collapsibleOverflow: {
    overflow: 'hidden',
    width: '100%',
  },
  collapsibleContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  solutionContainer: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  solutionTitle: {
    fontSize: 16,
    color: '#ffd33d',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  solutionStep: {
    fontSize: 16,
    color: '#ffffff',
    marginVertical: 3,
  },
  stepContainer: {
    marginVertical: 3,
  },
  stepMath: {
    minHeight: 30,
  },
});

export default StepByStepSolution;
