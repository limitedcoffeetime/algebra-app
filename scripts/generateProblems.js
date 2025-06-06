#!/usr/bin/env node

/*
 * Algebra Problem Generator Script
 *
 * Uses OpenAI's Responses API (the new agentic API primitive) with structured outputs
 * to generate algebra problems and upload them to S3. The Responses API provides:
 * - Better structured output handling
 * - Event-driven architecture
 * - Built-in tools support (web search, file search, computer use)
 * - Server-side conversation state management (disabled for batch generation)
 *
 * Migrated from Chat Completions API to Responses API for enhanced capabilities.
 */

const { OpenAI } = require('openai');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const fs = require('fs');

// Configuration – can be overridden via function parameter or the PROBLEMS_PER_BATCH env variable
let PROBLEMS_PER_BATCH = parseInt(process.env.PROBLEMS_PER_BATCH || '5', 10);

const TARGET_DIFFICULTY_MIX = {
  easy: 40,    // 40% of total batch
  medium: 40,  // 40% of total batch
  hard: 20     // 20% of total batch
};

const PROBLEM_TYPES = [
  'linear-one-variable',
  'linear-two-variables',
  'quadratic-factoring',
  'quadratic-formula',
  'polynomial-simplification'
];

// Map difficulty levels to the subset of problem types that are appropriate
// for that difficulty. This prevents, for example, quadratic-formula problems
// from ever appearing in the "easy" bucket.
const PROBLEM_TYPES_BY_DIFFICULTY = {
  easy: [
    'linear-one-variable',
    'polynomial-simplification'
  ],
  medium: [
    'linear-two-variables',
    'quadratic-factoring',
    'polynomial-simplification'
  ],
  hard: [
    'linear-two-variables',
    'quadratic-factoring',
    'quadratic-formula',
    'polynomial-simplification'
  ]
};

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Optionally set the number of problems to generate for the next batch. This is mainly
 * used by automated tests to request a very small batch without mutating global
 * environment state.
 * @param {number} count
 */
function configureProblemsPerBatch(count) {
  if (Number.isFinite(count) && count > 0) {
    PROBLEMS_PER_BATCH = count;
  }
}

/**
 * Calculate exact problem counts for each difficulty level
 */
function calculateProblemCounts() {
  const totalPercentage = Object.values(TARGET_DIFFICULTY_MIX).reduce((sum, val) => sum + val, 0);

  const counts = {};
  let remaining = PROBLEMS_PER_BATCH;

  // Calculate exact counts, ensuring we hit the target total
  Object.entries(TARGET_DIFFICULTY_MIX).forEach(([difficulty, percentage], index, entries) => {
    if (index === entries.length - 1) {
      // Last difficulty gets whatever remains to ensure exact total
      counts[difficulty] = remaining;
    } else {
      const count = Math.round((percentage / totalPercentage) * PROBLEMS_PER_BATCH);
      counts[difficulty] = count;
      remaining -= count;
    }
  });

  return counts;
}

/**
 * Clean and parse JSON response from OpenAI
 */
function parseOpenAIResponse(content) {
  // Remove markdown code blocks if present
  let cleanContent = content.trim();

  // Remove ```json and ``` markers
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Remove any leading/trailing whitespace
  cleanContent = cleanContent.trim();

  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('Failed to parse cleaned content:', cleanContent.substring(0, 200) + '...');
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

/**
 * Get problem type specific instructions
 */
function getProblemTypeInstructions(problemType) {
  switch (problemType) {
    case 'linear-one-variable':
      return {
        instructions: 'Solve for x. Answer should be an integer or simple fraction (like 1/2, 2/3). NO complex decimals.',
        answerFormat: 'number or simple fraction'
      };
    case 'linear-two-variables':
      return {
        instructions: 'Solve for x in terms of y (express x = ... ). Answer should use integer coefficients only. Example: "x = 3 + 2y" or "x = (5 - 3y)/2".',
        answerFormat: 'expression with integer coefficients'
      };
    case 'quadratic-factoring':
    case 'quadratic-formula':
      return {
        instructions: 'Find all solutions. Solutions should be integers or simple fractions. Always provide answers as an array, even for single solutions (e.g., [3] or [-2, 5]). NO irrational numbers or complex decimals.',
        answerFormat: 'array of integer(s) or simple fraction(s)'
      };
    case 'polynomial-simplification':
      return {
        instructions: 'Simplify the polynomial expression. Use integer coefficients only. Example: "3x^2 + 2x - 5".',
        answerFormat: 'polynomial with integer coefficients'
      };
    default:
      return {
        instructions: 'Solve the equation with calculator-free answer.',
        answerFormat: 'integer or simple fraction'
      };
  }
}

/**
 * Check if an answer requires a calculator (complex decimal)
 */
function isCalculatorFreeAnswer(answer) {
  if (typeof answer === 'number') {
    // Check if it's an integer
    if (Number.isInteger(answer)) return true;

    // Check if it's a simple decimal that represents a common fraction
    const simpleDecimals = [0.5, 0.25, 0.75, 0.2, 0.4, 0.6, 0.8,
                           0.125, 0.375, 0.625, 0.875, 0.333, 0.667];
    if (simpleDecimals.some(d => Math.abs(answer - d) < 0.001)) return true;

    // If it has more than 3 decimal places or is a complex decimal, flag it
    const decimalPart = answer - Math.floor(answer);
    if (decimalPart !== 0) {
      const decimalString = decimalPart.toString();
      if (decimalString.length > 5) return false; // Complex decimal
    }

    return true;
  }

  if (Array.isArray(answer)) {
    return answer.every(a => isCalculatorFreeAnswer(a));
  }

  if (typeof answer === 'string') {
    // Check for expressions with decimals
    if (/\d+\.\d{4,}/.test(answer)) return false; // 4+ decimal places
    if (/[√π]/.test(answer)) return false; // Square roots, pi, etc.
    return true;
  }

  return true;
}

/**
 * Validate answer format based on problem type
 */
function validateAnswerFormat(answer, problemType) {
  // First check if it's calculator-free
  const isCalculatorFree = isCalculatorFreeAnswer(answer);
  if (!isCalculatorFree) {
    console.warn(`⚠️  Calculator-requiring answer detected: ${JSON.stringify(answer)}`);
  }

  switch (problemType) {
    case 'linear-one-variable':
      return typeof answer === 'number';

    case 'linear-two-variables':
    case 'polynomial-simplification':
      return typeof answer === 'string';

    case 'quadratic-factoring':
    case 'quadratic-formula':
      // Now always expecting array format for quadratic solutions
      return Array.isArray(answer) && answer.every(a => typeof a === 'number');

    default:
      return true; // Accept any format for unknown types
  }
}

/**
 * Get JSON Schema for structured output based on problem type
 */
function getProblemResponseSchema(problemType, count) {
  // Define answer type based on problem type
  let answerSchema;
  switch (problemType) {
    case 'linear-one-variable':
      answerSchema = { "type": "number" };
      break;
    case 'linear-two-variables':
    case 'polynomial-simplification':
      answerSchema = { "type": "string" };
      break;
    case 'quadratic-factoring':
    case 'quadratic-formula':
      // Use array format for all quadratic solutions to avoid oneOf restriction
      answerSchema = {
        "type": "array",
        "items": { "type": "number" },
        "minItems": 1,
        "maxItems": 3,
        "description": "Array of solution(s). Use single-element array for one solution."
      };
      break;
    default:
      answerSchema = { "type": "number" };
  }

  return {
    "type": "object",
    "properties": {
      "problems": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "equation": {
              "type": "string",
              "description": "The algebra problem equation"
            },
            "answer": {
              ...answerSchema,
              "description": "The solution to the equation"
            },
            "solutionSteps": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "minItems": 1,
              "description": "Step-by-step solution process"
            }
          },
          "required": ["equation", "answer", "solutionSteps"],
          "additionalProperties": false
        },
        "minItems": count,
        "maxItems": count,
        "description": `Exactly ${count} algebra problems`
      }
    },
    "required": ["problems"],
    "additionalProperties": false
  };
}

/**
 * Generate problems using OpenAI Responses API
 */
async function generateProblemsWithAI(problemType, difficulty, count) {
  console.log(`Generating ${count} ${difficulty} ${problemType} problems...`);

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

ACCEPTABLE ANSWERS: 3, -2, 1/2, 2/3, 0, 7, -1/4, 5/3
UNACCEPTABLE ANSWERS: 1.2839, 2.7182, 0.3333..., √2, 3.14159, 1.7320

Generate problems following the exact JSON schema structure.

Constraints:
- ${difficulty} difficulty means: ${getDifficultyDescription(difficulty)}
- For ${problemType}: ${typeInstructions.instructions}
- Solution steps should be clear and educational
- Each problem should be unique
- CRITICAL: Ensure your answer matches the final step of your solution
- CRITICAL: All answers must be calculator-free (integers or simple fractions only)`;

  try {
    // MIGRATED TO RESPONSES API: Using the new Responses API with structured outputs
    console.log(`🔧 DEBUG: Making OpenAI Responses API call with model: o4-mini-2025-04-16`);
    const response = await openai.responses.create({
      // MODEL CHANGE LOCATION: Replace the model name below with your desired model
      model: 'o4-mini-2025-04-16', // Using the correct model name from the official OpenAI models site
      // RESPONSES API FORMAT: Using 'input' instead of 'messages'
      input: [
        {
          role: 'system',
          content: 'You are a math teacher creating algebra problems. Follow the JSON schema exactly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      // RESPONSES API STRUCTURED OUTPUT: Using 'text.format' instead of 'response_format'
      text: {
        format: {
          type: "json_schema",
          name: "algebra_problems_response",
          description: "Response containing algebra problems with equations, answers, and solution steps",
          schema: responseSchema,
          strict: true
        }
      },
      // Disable storage to avoid server-side conversation state for this batch generation
      store: false
    });

    // RESPONSES API OUTPUT PARSING: Extract content from the new response format
    const content = response.output_text.trim();

    // With JSON Schema structured output, we can parse directly without cleaning
    let responseObj;
    try {
      responseObj = JSON.parse(content);
    } catch (error) {
      // Fallback to our cleaning function for any edge cases
      console.warn('Direct JSON parse failed, trying with cleanup...');
      responseObj = parseOpenAIResponse(content);
    }

    // Extract problems array from response object
    const problems = responseObj.problems;

    // Validate that we got an array (should be guaranteed by schema)
    if (!Array.isArray(problems)) {
      throw new Error('Schema validation failed: Expected array of problems, got: ' + typeof problems);
    }

    // Validate exact count (should be guaranteed by schema)
    if (problems.length !== count) {
      throw new Error(`Schema validation failed: Expected ${count} problems, got ${problems.length}`);
    }

    // Validate the problems (most validation should be handled by schema)
    return problems.map((problem, index) => {
      // Schema should guarantee these fields exist, but let's double-check
      if (!problem.equation || problem.answer === undefined || !problem.solutionSteps) {
        throw new Error(`Schema validation failed: Problem ${index} missing required fields: ${JSON.stringify(problem)}`);
      }

      // Validate answer format based on problem type
      const isValidAnswer = validateAnswerFormat(problem.answer, problemType);
      if (!isValidAnswer) {
        console.warn(`Problem ${index} has unexpected answer format for ${problemType}: ${JSON.stringify(problem.answer)}`);
      }

      return {
        equation: problem.equation,
        answer: problem.answer,
        solutionSteps: Array.isArray(problem.solutionSteps) ? problem.solutionSteps : [problem.solutionSteps],
        difficulty,
        problemType,
        isCompleted: false
      };
    });

  } catch (error) {
    console.error(`Error generating ${problemType} problems:`, error);
    throw error;
  }
}

/**
 * Get difficulty description for prompts
 */
function getDifficultyDescription(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'very simple, single step equations (e.g., x + 3 = 7), integer coefficients between -10 and 10, answers should be small integers or common simple fractions. A student should be able to mentally solve within a few seconds.';
    case 'medium':
      return 'moderately challenging, 2-3 step equations (e.g., 3x - 4 = 2x + 5 or factoring quadratics with small coefficients) that a strong student could solve mentally in under 10 seconds. Use integer coefficients between -15 and 15 and answers that are integers or common simple fractions.';
    case 'hard':
      return 'multi-step or multi-variable problems that typically require scratch work (e.g., simultaneous linear equations, quadratic formula, or polynomial simplification with several terms). Coefficients may be up to ±20 but remain integer, and answers must still be calculator-free (integers or simple fractions).';
    default:
      return 'moderate complexity with calculator-free answers';
  }
}

/**
 * Generate problems with retry logic
 */
async function generateProblemsWithRetry(problemType, difficulty, count, maxRetries = 2) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generating ${count} ${difficulty} ${problemType} problems... (attempt ${attempt}/${maxRetries})`);
      const problems = await generateProblemsWithAI(problemType, difficulty, count);

      if (problems.length !== count) {
        console.warn(`Expected ${count} problems, got ${problems.length}. Continuing with what we have.`);
      }

      return problems;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for ${problemType} ${difficulty}:`, error.message);

      if (attempt < maxRetries) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed to generate ${problemType} ${difficulty} problems after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Generate a complete batch of problems
 */
async function generateProblemBatch() {
  console.log('Starting problem generation...');

  const allProblems = [];

  // Generate unique batch ID with timestamp to avoid conflicts on same day
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toISOString().split('T')[1].split('.')[0].replace(/:/g, ''); // HHMMSS
  const randomSuffix = Math.random().toString(36).substring(2, 6); // 4 random chars
  const batchId = `${dateStr}-${timeStr}-${randomSuffix}`; // e.g., "2025-06-05-143052-a7d2"

  console.log(`📦 Generated unique batch ID: ${batchId}`);

  const generationStats = {
    attempted: 0,
    successful: 0,
    failed: 0,
    failedTypes: []
  };

  // Calculate exact problem counts for each difficulty
  const difficultyCounts = calculateProblemCounts();
  console.log('Target difficulty distribution:', difficultyCounts);

  // Generate problems for each difficulty level
  for (const [difficulty, totalCount] of Object.entries(difficultyCounts)) {
    if (totalCount === 0) continue;

    // Determine the subset of problem types allowed for this difficulty
    const allowedTypes = PROBLEM_TYPES_BY_DIFFICULTY[difficulty] || PROBLEM_TYPES;

    // Distribute problems across the allowed types, ensuring we hit the exact total
    const problemsPerType = Math.floor(totalCount / allowedTypes.length);
    const extraProblems = totalCount % allowedTypes.length;

    for (let i = 0; i < allowedTypes.length; i++) {
      const problemType = allowedTypes[i];
      // Give extra problems to the first few types if needed
      const count = problemsPerType + (i < extraProblems ? 1 : 0);

      if (count > 0) {
        generationStats.attempted += count;

        try {
          const problems = await generateProblemsWithRetry(problemType, difficulty, count);
          allProblems.push(...problems);
          generationStats.successful += problems.length;

          // Small delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          generationStats.failed += count;
          generationStats.failedTypes.push(`${problemType}-${difficulty}`);
          console.error(`Failed to generate ${problemType} ${difficulty} problems:`, error.message);
          // Continue with other types rather than failing completely
        }
      }
    }
  }

  // Log generation statistics
  console.log(`\n📊 Generation Statistics:`);
  console.log(`  Attempted: ${generationStats.attempted} problems`);
  console.log(`  Successful: ${generationStats.successful} problems`);
  console.log(`  Failed: ${generationStats.failed} problems`);
  if (generationStats.failedTypes.length > 0) {
    console.log(`  Failed types: ${generationStats.failedTypes.join(', ')}`);
  }
  console.log(`  Success rate: ${((generationStats.successful / generationStats.attempted) * 100).toFixed(1)}%\n`);

  // Shuffle the problems to mix types and difficulties
  const shuffledProblems = allProblems
    .sort(() => Math.random() - 0.5)
    .map((problem, index) => ({
      ...problem,
      id: crypto.randomUUID(),
      batchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

  const batch = {
    id: batchId,
    generationDate: now.toISOString(), // Full ISO timestamp for when this batch was generated
    generationDateOnly: dateStr, // Just the date part for grouping/comparison
    problemCount: shuffledProblems.length,
    targetCount: PROBLEMS_PER_BATCH,
    generationStats,
    problems: shuffledProblems
  };

  console.log(`Generated ${shuffledProblems.length} problems for batch ${batchId}`);
  console.log(`Generation date: ${batch.generationDate}`);

  // Log the actual difficulty distribution
  const actualDistribution = {};
  shuffledProblems.forEach(problem => {
    actualDistribution[problem.difficulty] = (actualDistribution[problem.difficulty] || 0) + 1;
  });
  console.log('Actual difficulty distribution:', actualDistribution);

  return batch;
}

/**
 * Upload batch to S3
 */
async function uploadToS3(batch) {
  const bucketName = process.env.S3_BUCKET_NAME;

  // Upload the full batch
  const batchKey = `problems/${batch.id}.json`;
  const batchContent = JSON.stringify(batch, null, 2);

  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: batchKey,
    Body: batchContent,
    ContentType: 'application/json'
  }));

  console.log(`Uploaded batch to s3://${bucketName}/${batchKey}`);

  // Update the latest.json pointer
  const latestContent = JSON.stringify({
    batchId: batch.id,
    url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${batchKey}`,
    hash: crypto.createHash('sha256').update(batchContent).digest('hex'),
    generatedAt: batch.generationDate,
    problemCount: batch.problemCount
  }, null, 2);

  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: 'latest.json',
    Body: latestContent,
    ContentType: 'application/json'
  }));

  console.log(`Updated latest.json pointer`);
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/latest.json`;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔥 Starting daily problem generation...');
    console.log('🔧 DEBUG: Configuration details:');
    console.log(`   📦 OpenAI Model: o4-mini-2025-04-16`);
    console.log(`   🚀 API Type: OpenAI Responses API (structured outputs)`);
    console.log(`   📊 Target problems per batch: ${PROBLEMS_PER_BATCH}`);
    console.log(`   🎯 Problem types: ${PROBLEM_TYPES.join(', ')}`);
    console.log(`   📈 Difficulty mix: ${JSON.stringify(TARGET_DIFFICULTY_MIX)}`);
    console.log('');

    // Generate problems
    const batch = await generateProblemBatch();

    // Upload to S3
    const latestUrl = await uploadToS3(batch);

    console.log('✅ Problem generation complete!');
    console.log(`📦 Batch ID: ${batch.id}`);
    console.log(`📄 Problems generated: ${batch.problemCount}`);
    console.log(`🌐 Latest URL: ${latestUrl}`);

  } catch (error) {
    console.error('❌ Problem generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateProblemBatch, uploadToS3, configureProblemsPerBatch };
