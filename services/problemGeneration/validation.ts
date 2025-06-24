import { ProblemType } from './constants';

/** Strip markdown ```json wrapping and parse JSON safely */
export function parseOpenAIResponse(content: string): any {
  let cleanContent = content.trim();

  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  cleanContent = cleanContent.trim();
  return JSON.parse(cleanContent);
}

export function isCalculatorFreeAnswer(answer: any): boolean {
  if (typeof answer === 'number') {
    if (Number.isInteger(answer)) return true;
    const simpleDecimals = [0.5, 0.25, 0.75, 0.2, 0.4, 0.6, 0.8, 0.125, 0.375, 0.625, 0.875, 0.333, 0.667];
    if (simpleDecimals.some((d) => Math.abs(answer - d) < 0.001)) return true;
    const decimalPart = answer - Math.floor(answer);
    if (decimalPart !== 0) {
      const decimalString = decimalPart.toString();
      if (decimalString.length > 5) return false;
    }
    return true;
  }

  if (Array.isArray(answer)) {
    return answer.every((a) => isCalculatorFreeAnswer(a));
  }

  if (typeof answer === 'string') {
    // Allow LaTeX fraction format like \frac{3}{4}
    if (/\\frac\{[\d\s+-]+\}\{[\d\s+-]+\}/.test(answer)) return true;
    // Still check for complex decimals in plain text
    if (/\d+\.\d{4,}/.test(answer)) return false;
    // Allow LaTeX symbols but reject complex expressions with π, √ unless in LaTeX format
    if(/[π]/.test(answer) && !/\\pi/.test(answer)) return false;
    if(/√/.test(answer) && !/\\sqrt/.test(answer)) return false;
    return true;
  }

  return true;
}

export function validateAnswerFormat(answer: any, problemType: ProblemType): boolean {
  const calcFree = isCalculatorFreeAnswer(answer);
  if (!calcFree) {
    // logger could be used; keep silent to avoid circular dep.
    return false;
  }

  switch (problemType) {
    case 'linear-one-variable':
      // Now accepts both strings (LaTeX fractions) and numbers (integers)
      return typeof answer === 'string' || typeof answer === 'number';
    case 'linear-two-variables':
    case 'polynomial-simplification':
      return typeof answer === 'string';
    case 'quadratic-factoring':
    case 'quadratic-formula':
      // Now accepts arrays of strings (LaTeX fractions) or numbers (integers)
      return Array.isArray(answer) && answer.every((a) => typeof a === 'string' || typeof a === 'number');
    default:
      return true;
  }
}
