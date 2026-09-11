import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTestDescriptionPrompt, cleanTestDescription } from '../lib/test-description-ai';

test('AI test description prompt is partner-neutral and preserves supplied metadata', () => {
  const prompt = buildTestDescriptionPrompt({
    name: 'Complete Blood Count (CBC)',
    aliases: ['CBC'],
    sampleTypes: ['EDTA'],
    fastingNeeded: false,
  });
  assert.match(prompt, /Complete Blood Count/);
  assert.match(prompt, /EDTA/);
  assert.match(prompt, /do not invent/i);
  assert.match(prompt, /do not diagnose/i);
  assert.match(prompt, /reusable across lab partners/i);
});

test('AI test description prompt includes only recorded fasting hours', () => {
  const prompt = buildTestDescriptionPrompt({ name: 'Glucose, Fasting', fastingNeeded: true, fastingHours: 8, sampleTypes: ['Fluoride'] });
  assert.match(prompt, /8 hours/);
  assert.match(prompt, /Fluoride/);
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
