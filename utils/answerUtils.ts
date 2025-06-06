import { evaluate, parse, simplify } from 'mathjs';

/**
 * Enhanced mathematical equivalence checker that handles more algebraic forms
 */
export function isAnswerCorrect(userAnswer: string, correctAnswer: string | number): boolean {
  const trimmedUser = userAnswer.trim();
  if (!trimmedUser) return false;

  // Convert correctAnswer to string for consistency
  const correctStr = String(correctAnswer);

  try {
    // Method 1: Direct mathjs comparison (handles most cases)
    const diff = simplify(`(${trimmedUser}) - (${correctStr})`);
    if (diff.equals(parse('0'))) {
      return true;
    }

    // Method 2: Test with multiple variable values for algebraic expressions
    // This catches cases where simplify() doesn't fully expand expressions
    const variables = extractVariables(trimmedUser, correctStr);
    if (variables.length > 0) {
      return testAlgebraicEquivalence(trimmedUser, correctStr, variables);
    }

    // Method 3: Numeric comparison for pure numbers
    if (variables.length === 0) {
      const userVal = evaluate(trimmedUser);
      const correctVal = evaluate(correctStr);
      return Math.abs(userVal - correctVal) < 1e-10;
    }

    return false;

  } catch (error) {
    console.warn('Answer validation error:', error);
    return false;
  }
}

/**
 * Extract variable names from expressions
 */
function extractVariables(expr1: string, expr2: string): string[] {
  const combined = expr1 + ' ' + expr2;
  const variablePattern = /\b([a-zA-Z])\b(?![a-zA-Z])/g;
  const matches = combined.match(variablePattern) || [];
  return [...new Set(matches)].filter(v => !['e', 'pi', 'i'].includes(v));
}

/**
 * Test algebraic equivalence by substituting multiple values
 */
function testAlgebraicEquivalence(expr1: string, expr2: string, variables: string[]): boolean {
  // Test with multiple values to verify algebraic equivalence
  const testValues = [-2, -1, 0, 1, 2, 3, 0.5, -0.5];
  
  try {
    for (const value of testValues) {
      const scope: { [key: string]: number } = {};
      variables.forEach(variable => {
        scope[variable] = value;
      });

      const result1 = evaluate(expr1, scope);
      const result2 = evaluate(expr2, scope);
      
      if (Math.abs(result1 - result2) > 1e-10) {
        return false;
      }
    }
    return true;
  } catch {
    // If evaluation fails, fall back to false
    return false;
  }
}
