import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface SimpleMathRendererProps {
  text: string;
  style?: ViewStyle;
  fontSize?: number;
  color?: string;
}

const SimpleMathRenderer: React.FC<SimpleMathRendererProps> = ({
  text,
  style,
  fontSize = 24,
  color = '#333'
}) => {
    // Detect if input contains LaTeX and render accordingly
  const isLatex = (input: string): boolean => {
    return /\\[a-zA-Z]+\{|\\frac|\\sqrt|\^{|\_{/.test(input);
  };

  // Simple text formatting for common math expressions
  const formatMathText = (input: string): string => {
    let formatted = input;

    // If it's LaTeX, handle some basic LaTeX patterns
    if (isLatex(input)) {
      // Basic LaTeX to Unicode conversion
      formatted = formatted.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
      formatted = formatted.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
      formatted = formatted.replace(/\^{([^}]+)}/g, '^$1');
      formatted = formatted.replace(/_{([^}]+)}/g, '_$1');
    }

    // Replace common patterns with more readable versions
    formatted = formatted.replace(/\^2(?!\d)/g, '²');
    formatted = formatted.replace(/\^3(?!\d)/g, '³');
    formatted = formatted.replace(/\^([4-9])/g, (match, p1) => {
      const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
      return superscripts[parseInt(p1)] || `^${p1}`;
    });
    formatted = formatted.replace(/\*/g, '·');
    formatted = formatted.replace(/sqrt\(/g, '√(');

    return formatted;
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.mathText, { fontSize, color }]}>
        {formatMathText(text)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    width: '100%',
  },
  mathText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});

export default SimpleMathRenderer;
