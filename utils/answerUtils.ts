/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

// Dynamically import mathjs only when needed to avoid ESM/CommonJS issues.
async function getMath() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const mathjs = await import('mathjs');
  return { parse: mathjs.parse, simplify: mathjs.simplify };
}

/**
 * Determine if the user's answer matches the correct answer.
 * Supports numeric and algebraic string expressions.
 */
export async function isAnswerCorrect(userAnswer: string, correctAnswer: string | number): Promise<boolean> {
  const trimmedUser = userAnswer.trim();
  if (!trimmedUser) return false;

  try {
    // Use mathjs to compare the expressions. This correctly handles numeric
    // expressions (e.g., "2+3" vs 5) and algebraic expressions (e.g., "x*2" vs "2x").
    // We subtract one expression from the other and check if the simplified result is 0.
    const { parse, simplify } = await getMath();
    const diff = simplify(`(${trimmedUser}) - (${correctAnswer})`);
    return diff.equals(parse('0'));
  } catch {
    // If mathjs cannot parse the expression (e.g., it's not a valid algebraic
    // or numeric expression), we consider the answer incorrect.
    return false;
  }
}
