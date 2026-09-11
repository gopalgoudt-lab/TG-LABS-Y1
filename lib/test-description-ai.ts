type TestDescriptionInput = {
  name: string;
  aliases?: string[];
  sampleTypes?: string[];
  fastingNeeded?: boolean;
  fastingHours?: number | null;
  preparation?: string | null;
};

export function buildTestDescriptionPrompt(test: TestDescriptionInput) {
  const context = [
    `Test name: ${test.name}`,
    test.aliases?.length ? `Known aliases: ${test.aliases.join(', ')}` : '',
    test.sampleTypes?.length ? `Recorded sample types: ${test.sampleTypes.join(', ')}` : '',
    test.fastingNeeded ? `Recorded fasting requirement: yes${test.fastingHours ? `, ${test.fastingHours} hours` : ''}` : 'Recorded fasting requirement: no',
    test.preparation?.trim() ? `Recorded preparation: ${test.preparation.trim()}` : '',
  ].filter(Boolean).join('\n');

  return `You are preparing patient-facing diagnostic test catalog content for TG Labs in India.\n\n${context}\n\nWrite ONE concise, medically neutral test description in plain English, ideally 55-100 words.\n\nCONTENT RULES:\n- Explain what the laboratory test measures, detects, or evaluates.\n- Explain common clinical reasons a healthcare professional may order it, using language such as “may help” or “may be used”.\n- If the supplied sample/preparation information is relevant, mention it briefly, but do not invent specimen types, fasting hours, methods, reference ranges, turnaround times, prices, symptoms, diagnoses, or preparation instructions.\n- Do not diagnose a patient, claim a result proves a disease, prescribe treatment, or give personalized medical advice.\n- Do not make marketing claims such as “best”, “most accurate”, “guaranteed”, or “100%”.\n- Do not mention a laboratory partner, TG Labs, AI, or the prompt. The description must be reusable across lab partners.\n- If the exact clinical purpose cannot be inferred safely from the test name and supplied metadata, use a conservative description that says the test evaluates the named analyte/marker and that interpretation depends on clinical context.\n- Return plain text only: no heading, bullets, markdown, quotation marks, or disclaimer.`;
}

export function cleanTestDescription(value: string) {
  const cleaned = value
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^\s*["“]|["”]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 40) throw new Error('AI_DESCRIPTION_TOO_SHORT');
  if (cleaned.length > 1200) throw new Error('AI_DESCRIPTION_TOO_LONG');
  return cleaned;
}

function outputText(data: any) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export async function generateTestDescription(test: TestDescriptionInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
  const model = process.env.AI_TEST_DESCRIPTION_MODEL || process.env.AI_REPORT_MODEL || 'gpt-5.6-terra';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 300,
      input: [{ role: 'user', content: [{ type: 'input_text', text: buildTestDescriptionPrompt(test) }] }],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message.slice(0, 180) : 'Unknown OpenAI error';
    throw new Error(`OPENAI_DESCRIPTION_FAILED:${response.status}:${message}`);
  }
  return { description: cleanTestDescription(outputText(data)), model };
}
