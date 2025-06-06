import { ProblemType } from './constants';

export function getProblemResponseSchema(problemType: ProblemType, count: number) {
  let answerSchema: any;
  switch (problemType) {
    case 'linear-one-variable':
      answerSchema = { type: 'number' };
      break;
    case 'linear-two-variables':
    case 'polynomial-simplification':
      answerSchema = { type: 'string' };
      break;
    case 'quadratic-factoring':
    case 'quadratic-formula':
      answerSchema = {
        type: 'array',
        items: { type: 'number' },
        minItems: 1,
        maxItems: 3,
        description: 'Array of solution(s). Use single-element array for one solution.',
      };
      break;
    default:
      answerSchema = { type: 'number' };
  }

  return {
    type: 'object',
    properties: {
      problems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            equation: { type: 'string', description: 'The algebra problem equation' },
            answer: {
              ...answerSchema,
              description: 'The solution to the equation',
            },
            solutionSteps: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              description: 'Step-by-step solution process',
            },
          },
          required: ['equation', 'answer', 'solutionSteps'],
          additionalProperties: false,
        },
        minItems: count,
        maxItems: count,
        description: `Exactly ${count} algebra problems`,
      },
    },
    required: ['problems'],
    additionalProperties: false,
  };
}