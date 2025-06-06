#!/usr/bin/env node

require('ts-node/register');
const { generateProblemBatch, configureProblemsPerBatch } = require('../services/problemGeneration/batchGenerator');
require('dotenv').config();

/**
 * Test the problem generation locally
 */
async function testGeneration() {
  console.log('🧪 Testing problem generation locally...\n');

  // Check required environment variables
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please create a .env file with your OpenAI API key:\n');
    console.error('OPENAI_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  try {
    // Generate a small batch for development/testing without mutating global env state
    configureProblemsPerBatch(5);
    const batch = await generateProblemBatch();

    console.log('\n✅ Test generation successful!');
    console.log('\n📋 Sample Problems:');

    batch.problems.slice(0, 3).forEach((problem, index) => {
      console.log(`\n${index + 1}. ${problem.problemType} (${problem.difficulty})`);
      console.log(`   Equation: ${problem.equation}`);
      console.log(`   Answer: ${JSON.stringify(problem.answer)}`);
      console.log(`   Steps: ${problem.solutionSteps.length} steps`);

      // Show if answer is calculator-free
      const answerType = typeof problem.answer === 'number' && Number.isInteger(problem.answer)
        ? '(integer)'
        : typeof problem.answer === 'number'
        ? '(fraction/decimal)'
        : Array.isArray(problem.answer)
        ? '(multiple solutions)'
        : '(expression)';
      console.log(`   Answer Type: ${answerType}`);
    });

    console.log('\n📊 Final Stats:');
    console.log(`   Generated: ${batch.problemCount}/${batch.targetCount} problems`);
    console.log(`   Success Rate: ${((batch.generationStats.successful / batch.generationStats.attempted) * 100).toFixed(1)}%`);

    // Show calculator-free compliance
    const calculatorFreeCount = batch.problems.filter(p => {
      if (typeof p.answer === 'number') {
        return Number.isInteger(p.answer) || [0.5, 0.25, 0.75, 0.333, 0.667].some(d => Math.abs(p.answer - d) < 0.01);
      }
      return true; // Expressions assumed calculator-free
    }).length;

    console.log(`   Calculator-Free: ${calculatorFreeCount}/${batch.problemCount} problems (${((calculatorFreeCount/batch.problemCount)*100).toFixed(1)}%)`);

    if (batch.generationStats.failedTypes.length > 0) {
      console.log(`   Failed Types: ${batch.generationStats.failedTypes.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Test generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testGeneration();
}
