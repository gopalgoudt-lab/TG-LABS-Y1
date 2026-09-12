import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTestDescriptionPrompt, cleanTestDescription } from '../lib/test-description-ai';

test('AI test description prompt is partner-neutral and educational only', () => {
  const prompt = buildTestDescriptionPrompt({ name: 'Complete Blood Count (CBC)', aliases: ['CBC'] });
  assert.match(prompt, /Complete Blood Count/);
  assert.match(prompt, /CBC/);
  assert.match(prompt, /educational only/i);
  assert.match(prompt, /do not diagnose/i);
  assert.match(prompt, /reusable across lab partners/i);
});

test('AI test description prompt explicitly separates operational instructions', () => {
  const prompt = buildTestDescriptionPrompt({ name: 'Glucose, Fasting', aliases: ['FBS'] });
  assert.match(prompt, /do not provide or infer specimen\/sample requirements/i);
  assert.match(prompt, /fasting instructions or hours/i);
  assert.match(prompt, /preparation instructions/i);
  assert.match(prompt, /turnaround time/i);
  assert.match(prompt, /maintained separately/i);
});

test('cleanTestDescription normalizes safe plain text', () => {
  const input = '```text\nThis test measures a laboratory marker in the submitted sample. It may be used with other clinical information to support assessment and monitoring when appropriate.\n```';
  const value = cleanTestDescription(input);
  assert.equal(value.includes('```'), false);
  assert.match(value, /^This test measures/);
});

test('cleanTestDescription rejects unusably short AI output', () => {
  assert.throws(() => cleanTestDescription('Too short.'), /AI_DESCRIPTION_TOO_SHORT/);
});
