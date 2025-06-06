import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SmartMathRenderer from './SmartMathRenderer';

// Define the structure for a problem
export interface Problem {
  id: string; // For future use, like tracking problems
  equation: string;
  direction: string; // e.g., "Solve for x", "Simplify", "Factor"
  answer: string | number | number[]; // Answer can be string, number, or array
  solutionSteps?: string[]; // Example for future expansion
}

type Props = {
  problem: Problem;
};

const ProblemContainer = ({ problem }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.directionText}>{problem.direction}</Text>
      <SmartMathRenderer
        text={problem.equation}
        fontSize={28}
        color="#333"
        style={styles.mathContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0', // Light grey background
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20, // Added some vertical margin
    minHeight: 100, // Ensure enough space for direction + math rendering
  },
  directionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  mathContainer: {
    width: '100%',
    minHeight: 60,
  },
});

export default ProblemContainer;
