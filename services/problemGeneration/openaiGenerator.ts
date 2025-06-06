import { OpenAI } from 'openai';
import { Difficulty, ProblemType } from './constants';
import { getDifficultyDescription, getProblemTypeInstructions } from './instructions';
import { getProblemResponseSchema } from './schema';
import { parseOpenAIResponse, validateAnswerFormat } from './validation';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedProblem {
  equation: string;
  answer: unknown;
  solutionSteps: string[];
  difficulty: Difficulty;
  problemType: ProblemType;
  isCompleted: boolean;
}

export async function generateProblemsWithAI(
  problemType: ProblemType,
  difficulty: Difficulty,
  count: number,
): Promise<GeneratedProblem[]> {
  const typeInstructions = getProblemTypeInstructions(problemType);
  const responseSchema = getProblemResponseSchema(problemType, count);

  const prompt = `Generate exactly ${count} ${difficulty} algebra problems of type "${problemType}".

Problem Type Specific Instructions:
${typeInstructions.instructions}

CRITICAL CONSTRAINT - CALCULATOR-FREE PROBLEMS ONLY:
- Answers must be integers or simple fractions (like 1/2, 2/3, 3/4, 5/6)
- NO complex decimals like 1.2839, 2.7182, 0.3333... etc.
- NO irrational numbers like √2, √3 unless they simplify to integers
- Design problems so the algebra works out to clean, simple answers
- Students should never need a calculator to verify the answer

Generate problems following the exact JSON schema structure.

Constraints:
- ${difficulty} difficulty means: ${getDifficultyDescription(difficulty)}
- For ${problemType}: ${typeInstructions.instructions}
- Solution steps should be clear and educational
- Each problem should be unique
- CRITICAL: Ensure your answer matches the final step of your solution
- CRITICAL: All answers must be calculator-free (integers or simple fractions only)`;

  const response = await openai.responses.create({
    model: 'o4-mini-2025-04-16',
    input: [
      { role: 'system', content: 'You are a math teacher creating algebra problems. Follow the JSON schema exactly.' },
      { role: 'user', content: prompt },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'algebra_problems_response',
        description: 'Response containing algebra problems with equations, answers, and solution steps',
        schema: responseSchema,
        strict: true,
      },
    },
    store: false,
  });

  let data;
  try {
    data = JSON.parse(response.output_text.trim());
  } catch {
    data = parseOpenAIResponse(response.output_text.trim());
  }

  const problems = data.problems as any[];
  if (!Array.isArray(problems) || problems.length !== count) {
    throw new Error('Invalid number of problems in LLM response');
  }

  return problems.map((p: any): GeneratedProblem => {
    if (!validateAnswerFormat(p.answer, problemType)) {
      // we still return but mark
    }
    return {
      equation: p.equation,
      answer: p.answer,
      solutionSteps: Array.isArray(p.solutionSteps) ? p.solutionSteps : [p.solutionSteps],
      difficulty,
      problemType,
      isCompleted: false,
    };
  });
}
