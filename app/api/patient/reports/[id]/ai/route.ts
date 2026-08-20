import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientPhoneFromFirebase, verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
async function aiGenerationLimited(phone:string){
 const since=new Date(Date.now()-60*60*1000);
 const recent=await prisma.booking.findMany({where:{patient:{phone},OR:[{aiReportEnAt:{gte:since}},{aiReportTeAt:{gte:since}},{aiReportHiAt:{gte:since}}]},select:{aiReportEnAt:true,aiReportTeAt:true,aiReportHiAt:true},take:20});
 let count=0;for(const b of recent){if(b.aiReportEnAt&&b.aiReportEnAt>=since)count++;if(b.aiReportTeAt&&b.aiReportTeAt>=since)count++;if(b.aiReportHiAt&&b.aiReportHiAt>=since)count++;}return count>=10;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let openAIFileId = '';
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = patientPhoneFromFirebase(identity.phone);
    const { id } = await params;
    let requestedLanguage: Language = 'en';
    try { const body = await request.json(); if (body?.language === 'te' || body?.language === 'hi' || body?.language === 'en') requestedLanguage = body.language; } catch {}
    const language = LANGUAGES[requestedLanguage];
    const booking = await prisma.booking.findFirst({ where: { id, patient: { phone } }, select: { id: true, reportName: true, reportData: true, aiReportEn: true, aiReportTe: true, aiReportHi: true, aiReportEnAt: true, aiReportTeAt: true, aiReportHiAt: true, patient: { select: { age: true, gender: true } }, items: { select: { test: { select: { name: true } } } }, packages: { select: { package: { select: { name: true } } } } } });
    if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    if (!booking.reportData) return NextResponse.json({ error: 'The diagnostic report is not available for AI explanation yet.' }, { status: 409 });
    const cached = cachedFor(booking, requestedLanguage);
    if (cached.analysis) return NextResponse.json({ analysis: cached.analysis, generatedAt: (cached.at ?? new Date()).toISOString(), language: requestedLanguage, languageName: language.name, model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra', disclaimer: language.disclaimer, cached: true });
    if(await aiGenerationLimited(phone)) return NextResponse.json({error:'AI Report generation limit reached for this account. Saved reports remain available; please try generating a new language later.'},{status:429,headers:{'Retry-After':'3600'}});
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI Report is not configured yet.' }, { status: 503 });
    const tests = booking.items.map((x) => x.test.name), packages = booking.packages.map((x) => x.package.name);
    const context = [booking.patient.age != null ? `Age: ${booking.patient.age}` : '', booking.patient.gender ? `Gender: ${booking.patient.gender}` : '', tests.length ? `Tests: ${tests.join(', ')}` : '', packages.length ? `Packages: ${packages.join(', ')}` : ''].filter(Boolean).join('\n');
    const compactLanguageNote = requestedLanguage === 'en' ? '' : '\nKeep the answer concise enough to finish quickly. For KEY RESULTS include clinically important and out-of-range values first. Diet and exercise tables should contain 4–6 practical rows each.';
    const prompt = `You are the TG Labs AI Report Assistant. Explain the attached diagnostic laboratory report to a patient in clear, calm, non-alarmist language.\n\nOUTPUT LANGUAGE: ${language.name}. ${language.instruction}${compactLanguageNote}\n\n${context}\n\nIMPORTANT SAFETY RULES:\n- Do not diagnose a disease or claim certainty.\n- Do not prescribe, start, stop, or change medicines or supplements.\n- Do not invent values, reference ranges, symptoms, history, or findings that are not in the report.\n- Preserve every laboratory number, decimal, unit and reference range exactly as shown; never translate or convert numerical values.\n- Clearly distinguish normal, borderline, and out-of-range results using the laboratory ranges printed on the report.\n- Mention that reference ranges vary by lab, age, sex, pregnancy status, medications, and clinical context where relevant.\n- Diet and activity suggestions must be general wellness guidance and must account for uncertainty.\n- Never expose or repeat phone numbers, addresses, emails, IDs, payment information, or other identifiers even if visible in the document.\n\nReturn these sections in ${language.name}:\n1. REPORT OVERVIEW\n2. KEY RESULTS — markdown table: Test | Result | Lab Range | Interpretation.\n3. WHAT THE RESULTS MAY MEAN\n4. DIET SUGGESTION TABLE — Goal | Foods to Prefer | Foods to Limit | Practical Tip.\n5. PHYSICAL ACTIVITY PLAN — Activity | Frequency | Duration | Notes.\n6. WHAT TO DISCUSS WITH YOUR DOCTOR\n7. WHEN TO SEEK MEDICAL CARE\n8. IMPORTANT NOTE.`;
    openAIFileId = await uploadPdfToOpenAI(apiKey, booking.reportData, booking.reportName || 'diagnostic-report.pdf');
    const aiResponse = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra', store: false, max_output_tokens: requestedLanguage === 'en' ? 4000 : 2200, input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_file', file_id: openAIFileId }] }] }) });
    const data = await aiResponse.json();
    if (!aiResponse.ok) { const apiMessage = data?.error?.message || ''; console.error('OpenAI AI report failed', aiResponse.status, apiMessage || data); if (aiResponse.status === 429) return NextResponse.json({ error: 'AI usage limit reached. Please try again shortly.' }, { status: 429 }); return NextResponse.json({ error: `AI Report could not be generated right now.${apiMessage ? ' ' + apiMessage.slice(0, 180) : ''}` }, { status: 502 }); }
    const analysis = outputText(data); if (!analysis) return NextResponse.json({ error: 'AI Report returned an empty explanation. Please try again.' }, { status: 502 });
    const now = new Date(); await prisma.booking.update({ where: { id: booking.id }, data: cacheData(requestedLanguage, analysis, now) });
    return NextResponse.json({ analysis, generatedAt: now.toISOString(), language: requestedLanguage, languageName: language.name, model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra', disclaimer: language.disclaimer, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    if (message.includes('FIREBASE') || message.includes('UNAUTHENTICATED')) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    if (message === 'INVALID_PDF_DATA' || message === 'EMPTY_PDF') return NextResponse.json({ error: 'The uploaded report PDF is invalid. Please ask TG Labs to re-upload the report.' }, { status: 422 });
    console.error('POST /api/patient/reports/[id]/ai failed', error); return NextResponse.json({ error: 'Unable to generate AI Report.' }, { status: 500 });
  } finally { const apiKey = process.env.OPENAI_API_KEY; if (apiKey && openAIFileId) await deleteOpenAIFile(apiKey, openAIFileId); }
}
