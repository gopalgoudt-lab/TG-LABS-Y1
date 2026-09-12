import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTestDescriptionPrompt, cleanTestDescription, descriptionNeedsSafetyRefresh } from '../lib/test-description-ai';

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

test('legacy operational wording is flagged for safety refresh', () => {
  assert.equal(descriptionNeedsSafetyRefresh('This test measures blood cells. It is performed on a whole blood sample and does not require fasting.'), true);
  assert.equal(descriptionNeedsSafetyRefresh('This test evaluates red and white blood cells and may help assess general health.'), false);
});

test('cleanTestDescription normalizes safe plain text', () => {
  const input = '```text\nThis test evaluates a laboratory marker and may be used with other clinical information to support assessment and monitoring when appropriate.\n```';
  const value = cleanTestDescription(input);
  assert.equal(value.includes('```'), false);
  assert.match(value, /^This test evaluates/);
});

test('cleanTestDescription rejects operational AI output', () => {
  assert.throws(() => cleanTestDescription('This test measures a marker. A blood sample is required and fasting is not required before collection.'), /AI_DESCRIPTION_OPERATIONAL_CONTENT/);
});

test('cleanTestDescription rejects unusably short AI output', () => {
  assert.throws(() => cleanTestDescription('Too short.'), /AI_DESCRIPTION_TOO_SHORT/);
});
