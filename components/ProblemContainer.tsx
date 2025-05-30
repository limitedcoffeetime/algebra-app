import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Define the structure for a problem
export interface Problem {
  id: string; // For future use, like tracking problems
  equation: string;
  answer: string | number; // Answer can be string or number
  solutionSteps?: string[]; // Example for future expansion
}

type Props = {
  problem: Problem;
};

const ProblemContainer = ({ problem }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.problemText}>{problem.equation}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0', // Light grey background
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20, // Added some vertical margin
  },
  problemText: {
    fontSize: 28, // Slightly larger font for the equation
    fontWeight: 'bold',
    color: '#333', // Darker text for contrast
  },
});

export default ProblemContainer;
