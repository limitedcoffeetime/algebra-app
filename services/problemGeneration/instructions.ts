import { Difficulty, ProblemType } from './constants';

export function getProblemTypeInstructions(problemType: ProblemType): {
  instructions: string;
  answerFormat: string;
} {
  switch (problemType) {
    case 'linear-one-variable':
      return {
        instructions:
          'Solve for x. Answer should be an integer or simple fraction (like 1/2, 2/3). NO complex decimals.',
        answerFormat: 'number or simple fraction',
      };
    case 'linear-two-variables':
      return {
        instructions:
          'Solve for x in terms of y (express x = ... ). Answer should use integer coefficients only. Example: "x = 3 + 2y" or "x = (5 - 3y)/2".',
        answerFormat: 'expression with integer coefficients',
      };
    case 'quadratic-factoring':
    case 'quadratic-formula':
      return {
        instructions:
          'Find all solutions. Solutions should be integers or simple fractions. Always provide answers as an array, even for single solutions (e.g., [3] or [-2, 5]). NO irrational numbers or complex decimals.',
        answerFormat: 'array of integer(s) or simple fraction(s)',
      };
    case 'polynomial-simplification':
      return {
        instructions:
          'Simplify the polynomial expression. Use integer coefficients only. Example: "3x^2 + 2x - 5".',
        answerFormat: 'polynomial with integer coefficients',
      };
    default:
      return {
        instructions: 'Solve the equation with calculator-free answer.',
        answerFormat: 'integer or simple fraction',
      };
  }
}

export function getDifficultyDescription(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'very simple, single step equations (e.g., x + 3 = 7), integer coefficients between -10 and 10, answers should be small integers or common simple fractions.';
    case 'medium':
      return 'moderately challenging, 2-3 step equations (e.g., 3x - 4 = 2x + 5 or factoring quadratics with small coefficients) using integer coefficients between -15 and 15.';
    case 'hard':
      return 'multi-step or multi-variable problems that typically require scratch work (e.g., simultaneous linear equations, quadratic formula, or polynomial simplification with several terms). Coefficients may be up to ±20 but remain integer.';
    default:
      return 'moderate complexity with calculator-free answers';
  }
}