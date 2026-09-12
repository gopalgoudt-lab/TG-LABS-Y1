import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type Language = 'en' | 'te' | 'hi';
const LANGUAGES: Record<Language, { name: string; instruction: string; disclaimer: string }> = {
  en: { name: 'English', instruction: 'Write the complete response in clear patient-friendly English.', disclaimer: 'AI-generated educational explanation only. It does not replace medical advice, diagnosis, or treatment from a qualified healthcare professional.' },
  te: { name: 'Telugu', instruction: 'Write the full explanation in natural, easy-to-understand Telugu. Keep laboratory test names, values, units, ranges and standard medical abbreviations in English exactly where needed for accuracy. Use short Telugu sentences and avoid unnecessary repetition.', disclaimer: 'ఇది AI ద్వారా రూపొందించిన విద్యాపరమైన వివరణ మాత్రమే. ఇది అర్హత కలిగిన వైద్య నిపుణుడి సలహా, నిర్ధారణ లేదా చికిత్సకు ప్రత్యామ్నాయం కాదు.' },
  hi: { name: 'Hindi', instruction: 'Write the full explanation in natural, easy-to-understand Hindi. Keep laboratory test names, values, units, ranges and standard medical abbreviations in English exactly where needed for accuracy. Use short Hindi sentences and avoid unnecessary repetition.', disclaimer: 'यह AI द्वारा तैयार की गई केवल शैक्षिक व्याख्या है। यह योग्य स्वास्थ्य विशेषज्ञ की चिकित्सकीय सलाह, निदान या उपचार का विकल्प नहीं है।' },
};

function outputText(data: any) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) for (const content of item?.content ?? []) if (content?.type === 'output_text' && typeof content?.text === 'string') parts.push(content.text);
  return parts.join('\n').trim();
}
function pdfBytes(reportData: string) { const match = reportData.match(/^data:application\/pdf;base64,(.+)$/s); if (!match) throw new Error('INVALID_PDF_DATA'); return Buffer.from(match[1], 'base64'); }
async function uploadPdfToOpenAI(apiKey: string, reportData: string, reportName: string) { const bytes = pdfBytes(reportData); if (!bytes.length) throw new Error('EMPTY_PDF'); const form = new FormData(); form.append('purpose', 'user_data'); form.append('file', new Blob([bytes], { type: 'application/pdf' }), reportName || 'diagnostic-report.pdf'); form.append('expires_after[anchor]', 'created_at'); form.append('expires_after[seconds]', '3600'); const response = await fetch('https://api.openai.com/v1/files', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form }); const data = await response.json(); if (!response.ok || !data?.id) { console.error('OpenAI file upload failed', response.status, data?.error?.message || data); throw new Error('OPENAI_FILE_UPLOAD_FAILED'); } return String(data.id); }
async function deleteOpenAIFile(apiKey: string, fileId: string) { try { await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiKey}` } }); } catch (error) { console.error('OpenAI temporary file cleanup failed', error); } }
function cachedFor(booking: any, language: Language) { if (language === 'te') return { analysis: booking.aiReportTe, at: booking.aiReportTeAt }; if (language === 'hi') return { analysis: booking.aiReportHi, at: booking.aiReportHiAt }; return { analysis: booking.aiReportEn, at: booking.aiReportEnAt }; }
function cacheData(language: Language, analysis: string, now: Date) { if (language === 'te') return { aiReportTe: analysis, aiReportTeAt: now }; if (language === 'hi') return { aiReportHi: analysis, aiReportHiAt: now }; return { aiReportEn: analysis, aiReportEnAt: now }; }
function hasRequiredNextTestsSection(analysis: string, language: Language) {
  if (language === 'te') return /(?:తదుపరి|అదనపు)[^\n]{0,80}పరీక్ష/u.test(analysis) || /SUGGESTED NEXT TESTS/i.test(analysis);
  if (language === 'hi') return /(?:अगले|अतिरिक्त|सुझाए गए)[^\n]{0,80}(?:टेस्ट|परीक्षण)/u.test(analysis) || /SUGGESTED NEXT TESTS/i.test(analysis);
  return /SUGGESTED NEXT TESTS/i.test(analysis);
}
function suggestedTestNames(analysis: string | null | undefined, language: Language) {
  if (!analysis) return [] as string[];
  const lines = analysis.replace(/\r/g, '').split('\n');
  const headingIndex = lines.findIndex((raw) => {
    const line = raw.replace(/^#{1,6}\s*/, '').replace(/^\d+\.\s*/, '').trim();
    if (language === 'te') return /(?:తదుపరి|అదనపు)[^\n]{0,80}పరీక్ష/u.test(line) || /SUGGESTED NEXT TESTS/i.test(line);
    if (language === 'hi') return /(?:अगले|अतिरिक्त|सुझाए गए)[^\n]{0,80}(?:टेस्ट|परीक्षण)/u.test(line) || /SUGGESTED NEXT TESTS/i.test(line);
    return /SUGGESTED NEXT TESTS/i.test(line);
  });
  if (headingIndex < 0) return [] as string[];
  const tableLines: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (/^#{1,6}\s+/.test(raw) || /^\d+\.\s+/.test(raw)) break;
    if (raw.startsWith('|') && raw.endsWith('|')) tableLines.push(raw);
  }
  const rows = tableLines.filter((line) => !line.split('|').slice(1, -1).every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell)));
  if (rows.length <= 1) return [] as string[];
  return rows.slice(1).map((line) => line.slice(1, -1).split('|')[0].replace(/\*\*/g, '').trim()).filter(Boolean);
}
function normalizeTestName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function includesCanonicalSuggestedTests(analysis: string, canonicalNames: string[]) {
  if (!canonicalNames.length) return true;
  const generated = suggestedTestNames(analysis, 'te').map(normalizeTestName);
  return canonicalNames.every((name) => generated.includes(normalizeTestName(name)));
}
async function aiGenerationLimited(phone:string){
 const since=new Date(Date.now()-60*60*1000);
 const recent=await prisma.booking.findMany({where:{patient:{phone},OR:[{aiReportEnAt:{gte:since}},{aiReportTeAt:{gte:since}},{aiReportHiAt:{gte:since}}]},select:{aiReportEnAt:true,aiReportTeAt:true,aiReportHiAt:true},take:20});
 let count=0;for(const b of recent){if(b.aiReportEnAt&&b.aiReportEnAt>=since)count++;if(b.aiReportTeAt&&b.aiReportTeAt>=since)count++;if(b.aiReportHiAt&&b.aiReportHiAt>=since)count++;}return count>=10;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let openAIFileId = '';
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = identity.databasePhone;
    const { id } = await params;
    let requestedLanguage: Language = 'en';
    try { const body = await request.json(); if (body?.language === 'te' || body?.language === 'hi' || body?.language === 'en') requestedLanguage = body.language; } catch {}
    const language = LANGUAGES[requestedLanguage];
    const booking = await prisma.booking.findFirst({ where: { id, patient: { phone } }, select: { id: true, reportName: true, reportData: true, aiReportEn: true, aiReportTe: true, aiReportHi: true, aiReportEnAt: true, aiReportTeAt: true, aiReportHiAt: true, patient: { select: { age: true, gender: true } }, items: { select: { test: { select: { name: true } } } }, packages: { select: { package: { select: { name: true } } } } } });
    if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    if (!booking.reportData) return NextResponse.json({ error: 'The diagnostic report is not available for AI explanation yet.' }, { status: 409 });
    const canonicalNextTests = requestedLanguage === 'en' ? [] : suggestedTestNames(booking.aiReportEn, 'en');
    const cached = cachedFor(booking, requestedLanguage);
    const cachedHasParity = requestedLanguage === 'te' ? includesCanonicalSuggestedTests(cached.analysis || '', canonicalNextTests) : true;
    if (cached.analysis && hasRequiredNextTestsSection(cached.analysis, requestedLanguage) && cachedHasParity) return NextResponse.json({ analysis: cached.analysis, generatedAt: (cached.at ?? new Date()).toISOString(), language: requestedLanguage, languageName: language.name, model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra', disclaimer: language.disclaimer, cached: true });
    if(await aiGenerationLimited(phone)) return NextResponse.json({error:'AI Report generation limit reached for this account. Saved reports remain available; please try generating a new language later.'},{status:429,headers:{'Retry-After':'3600'}});
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI Report is not configured yet.' }, { status: 503 });
    const tests = booking.items.map((x) => x.test.name), packages = booking.packages.map((x) => x.package.name);
    const context = [booking.patient.age != null ? `Age: ${booking.patient.age}` : '', booking.patient.gender ? `Gender: ${booking.patient.gender}` : '', tests.length ? `Tests: ${tests.join(', ')}` : '', packages.length ? `Packages: ${packages.join(', ')}` : ''].filter(Boolean).join('\n');
    const compactLanguageNote = requestedLanguage === 'en' ? '' : '\nKeep the answer concise enough to finish completely. For KEY RESULTS include clinically important and out-of-range values first. Diet and exercise tables should contain 4–6 practical rows each. Do not omit any numbered section, especially section 6.';
    const section6Title = requestedLanguage === 'te' ? 'మీ వైద్యుడితో చర్చించదగిన తదుపరి పరీక్షలు' : requestedLanguage === 'hi' ? 'अपने डॉक्टर से चर्चा करने के लिए सुझाए गए अगले टेस्ट' : 'SUGGESTED NEXT TESTS TO DISCUSS WITH YOUR DOCTOR';
    const parityNote = requestedLanguage !== 'en' && canonicalNextTests.length ? `\nLANGUAGE PARITY REQUIREMENT:\nThe saved English AI report already contains these suggested next tests: ${canonicalNextTests.map((name, index) => `${index + 1}. ${name}`).join('; ')}. Section 6 in ${language.name} MUST contain exactly these same suggested test names, in the same order and with the same number of rows. Keep the test names themselves in English for accuracy. Translate only the explanation/reason/timing text. Do not add, remove, merge, replace, or shorten any of these suggested tests.` : '';
    const prompt = `You are the TG Labs AI Report Assistant. Explain the attached diagnostic laboratory report to a patient in clear, calm, non-alarmist language.

OUTPUT LANGUAGE: ${language.name}. ${language.instruction}${compactLanguageNote}${parityNote}

${context}

IMPORTANT SAFETY RULES:
- Do not diagnose a disease or claim certainty.
- Do not prescribe, start, stop, or change medicines or supplements.
- Do not invent values, reference ranges, symptoms, history, or findings that are not in the report.
- Preserve every laboratory number, decimal, unit and reference range exactly as shown; never translate or convert numerical values.
- Clearly distinguish normal, borderline, and out-of-range results using the laboratory ranges printed on the report.
- Mention that reference ranges vary by lab, age, sex, pregnancy status, medications, and clinical context where relevant.
- Diet and activity suggestions must be general wellness guidance and must account for uncertainty.
- Never expose or repeat phone numbers, addresses, emails, IDs, payment information, or other identifiers even if visible in the document.
- Suggested next tests must be limited to tests that have a clear clinical connection to a specific abnormal, borderline, or otherwise clinically relevant finding in this report.
- Do not suggest broad screening panels, unrelated tests, or tests merely because they are common.
- Do not say the patient "needs", "must get", or "should definitely get" a suggested test. Use cautious wording such as "may be useful to discuss with your doctor".
- Do not present a suggested test as proof of a diagnosis or as a substitute for clinical evaluation.
- Do not repeat a test already present in this report unless the reason is follow-up monitoring or confirmation; if repeated, clearly label it as a repeat/recheck.
- Suggest no more than 5 next tests. If no additional test is clearly supported by the report, state that no specific additional test is clearly suggested from the report alone.
- Urgent symptoms or emergency concerns belong only in WHEN TO SEEK MEDICAL CARE, not in the suggested-tests section.
- You MUST return all nine numbered sections. Section 6 is mandatory in every language and must never be omitted, even when there are no additional tests to suggest.

Return these sections in ${language.name}:
1. REPORT OVERVIEW
2. KEY RESULTS — markdown table: Test | Result | Lab Range | Interpretation.
3. WHAT THE RESULTS MAY MEAN
4. DIET SUGGESTION TABLE — Goal | Foods to Prefer | Foods to Limit | Practical Tip.
5. PHYSICAL ACTIVITY PLAN — Activity | Frequency | Duration | Notes.
6. ${section6Title} — markdown table: Suggested test | Finding that prompted it | Why it may be useful | Suggested discussion/timing. Every row must explain the direct connection to the current report and use non-directive language. If no additional test is supported, still render this section and state that no specific additional test is clearly suggested from the report alone.
7. WHAT TO DISCUSS WITH YOUR DOCTOR
8. WHEN TO SEEK MEDICAL CARE
9. IMPORTANT NOTE.`;
    openAIFileId = await uploadPdfToOpenAI(apiKey, booking.reportData, booking.reportName || 'diagnostic-report.pdf');
    const aiResponse = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra', store: false, max_output_tokens: 4000, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_file', file_id: openAIFileId }] }] }) });
    const data = await aiResponse.json();
    if (!aiResponse.ok) { const apiMessage = data?.error?.message || ''; console.error('OpenAI AI report failed', aiResponse.status, apiMessage || data); if (aiResponse.status === 429) return NextResponse.json({ error: 'AI usage limit reached. Please try again shortly.' }, { status: 429 }); return NextResponse.json({ error: `AI Report could not be generated right now.${apiMessage ? ' ' + apiMessage.slice(0, 180) : ''}` }, { status: 502 }); }
    const analysis = outputText(data); if (!analysis) return NextResponse.json({ error: 'AI Report returned an empty explanation. Please try again.' }, { status: 502 });
    if (!hasRequiredNextTestsSection(analysis, requestedLanguage)) return NextResponse.json({ error: 'AI Report returned an incomplete explanation. Please try again.' }, { status: 502 });
    if (requestedLanguage === 'te' && canonicalNextTests.length && !includesCanonicalSuggestedTests(analysis, canonicalNextTests)) return NextResponse.json({ error: 'Telugu AI Report did not preserve all suggested tests from the English report. Please try again.' }, { status: 502 });
    const now = new Date(); await prisma.booking.update({ where: { id: booking.id }, data: cacheData(requestedLanguage, analysis, now) });
    return NextResponse.json({ analysis, generatedAt: now.toISOString(), language: requestedLanguage, languageName: language.name, model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra', disclaimer: language.disclaimer, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    if (message.includes('FIREBASE') || message.includes('UNAUTHENTICATED')) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (message === 'INVALID_PDF_DATA' || message === 'EMPTY_PDF') return NextResponse.json({ error: 'The uploaded report PDF is invalid. Please ask TG Labs to re-upload the report.' }, { status: 422 });
    console.error('POST /api/patient/reports/[id]/ai failed', error); return NextResponse.json({ error: 'Unable to generate AI Report.' }, { status: 500 });
  } finally { const apiKey = process.env.OPENAI_API_KEY; if (apiKey && openAIFileId) await deleteOpenAIFile(apiKey, openAIFileId); }
}
