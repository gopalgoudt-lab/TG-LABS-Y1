import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientPhoneFromFirebase, verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Language = 'en' | 'te' | 'hi';
const LANGUAGES: Record<Language, { name: string; instruction: string; disclaimer: string }> = {
  en: { name: 'English', instruction: 'Write the complete response in clear patient-friendly English.', disclaimer: 'AI-generated educational explanation only. It does not replace medical advice, diagnosis, or treatment from a qualified healthcare professional.' },
  te: { name: 'Telugu', instruction: 'Write the complete response in natural, easy-to-understand Telugu. Keep laboratory test names, values, units and standard medical abbreviations in their original form where translating them could reduce accuracy. You may put a short English medical term in parentheses after the Telugu explanation when useful.', disclaimer: 'ఇది AI ద్వారా రూపొందించిన విద్యాపరమైన వివరణ మాత్రమే. ఇది అర్హత కలిగిన వైద్య నిపుణుడి సలహా, నిర్ధారణ లేదా చికిత్సకు ప్రత్యామ్నాయం కాదు.' },
  hi: { name: 'Hindi', instruction: 'Write the complete response in natural, easy-to-understand Hindi. Keep laboratory test names, values, units and standard medical abbreviations in their original form where translating them could reduce accuracy. You may put a short English medical term in parentheses after the Hindi explanation when useful.', disclaimer: 'यह AI द्वारा तैयार की गई केवल शैक्षिक व्याख्या है। यह योग्य स्वास्थ्य विशेषज्ञ की चिकित्सकीय सलाह, निदान या उपचार का विकल्प नहीं है।' },
};

function outputText(data: any) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) for (const content of item?.content ?? []) if (content?.type === 'output_text' && typeof content?.text === 'string') parts.push(content.text);
  return parts.join('\n').trim();
}

function reportInput(reportData: string, reportName: string) {
  if (reportData.startsWith('data:image/')) return { type: 'input_image', image_url: reportData };
  if (reportData.startsWith('data:application/pdf;base64,')) {
    return { type: 'input_file', filename: reportName || 'diagnostic-report.pdf', file_data: reportData };
  }
  if (/^https:\/\//i.test(reportData)) return { type: 'input_file', filename: reportName || 'diagnostic-report.pdf', file_url: reportData };
  return { type: 'input_file', filename: reportName || 'diagnostic-report.pdf', file_data: reportData };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = patientPhoneFromFirebase(identity.phone);
    const { id } = await params;
    let requestedLanguage: Language = 'en';
    try {
      const body = await request.json();
      if (body?.language === 'te' || body?.language === 'hi' || body?.language === 'en') requestedLanguage = body.language;
    } catch {}
    const language = LANGUAGES[requestedLanguage];

    const booking = await prisma.booking.findFirst({
      where: { id, patient: { phone } },
      select: { id:true, reportName:true, reportData:true, patient:{select:{age:true,gender:true}}, items:{select:{test:{select:{name:true}}}}, packages:{select:{package:{select:{name:true}}}} },
    });
    if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    if (!booking.reportData) return NextResponse.json({ error: 'The diagnostic report is not available for AI explanation yet.' }, { status: 409 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI Report is not configured yet.' }, { status: 503 });

    const tests = booking.items.map(x=>x.test.name), packages = booking.packages.map(x=>x.package.name);
    const context = [booking.patient.age!=null?`Age: ${booking.patient.age}`:'',booking.patient.gender?`Gender: ${booking.patient.gender}`:'',tests.length?`Tests: ${tests.join(', ')}`:'',packages.length?`Packages: ${packages.join(', ')}`:''].filter(Boolean).join('\n');

    const prompt = `You are the TG Labs AI Report Assistant. Explain the attached diagnostic laboratory report to a patient in clear, calm, non-alarmist language.\n\nOUTPUT LANGUAGE: ${language.name}. ${language.instruction}\n\n${context}\n\nIMPORTANT SAFETY RULES:\n- Do not diagnose a disease or claim certainty.\n- Do not prescribe, start, stop, or change medicines or supplements.\n- Do not invent values, reference ranges, symptoms, history, or findings that are not in the report.\n- Preserve every laboratory number, decimal, unit and reference range exactly as shown; never translate or convert numerical values.\n- Clearly distinguish normal, borderline, and out-of-range results using the laboratory ranges printed on the report.\n- Mention that reference ranges vary by lab, age, sex, pregnancy status, medications, and clinical context where relevant.\n- Diet and activity suggestions must be general wellness guidance and must account for uncertainty.\n- Never expose or repeat phone numbers, addresses, emails, IDs, payment information, or other identifiers even if visible in the document.\n\nReturn these sections in ${language.name}:\n1. REPORT OVERVIEW\n2. KEY RESULTS — markdown table: Test | Result | Lab Range | Interpretation. Include only values actually visible.\n3. WHAT THE RESULTS MAY MEAN\n4. DIET SUGGESTION TABLE — Goal | Foods to Prefer | Foods to Limit | Practical Tip.\n5. PHYSICAL ACTIVITY PLAN — Activity | Frequency | Duration | Notes.\n6. WHAT TO DISCUSS WITH YOUR DOCTOR\n7. WHEN TO SEEK MEDICAL CARE\n8. IMPORTANT NOTE — clearly state that this is educational and should be reviewed with a qualified healthcare professional.`;

    const aiResponse = await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.AI_REPORT_MODEL||'gpt-5.6-terra',store:false,input:[{role:'user',content:[{type:'input_text',text:prompt},reportInput(booking.reportData,booking.reportName||'diagnostic-report.pdf')]}]})});
    const data = await aiResponse.json();
    if (!aiResponse.ok) { console.error('OpenAI AI report failed',aiResponse.status,data?.error?.message||data); return NextResponse.json({error:'AI Report could not be generated right now. Please try again.'},{status:502}); }
    const analysis=outputText(data);
    if(!analysis)return NextResponse.json({error:'AI Report returned an empty explanation. Please try again.'},{status:502});
    return NextResponse.json({analysis,generatedAt:new Date().toISOString(),language:requestedLanguage,languageName:language.name,model:process.env.AI_REPORT_MODEL||'gpt-5.6-terra',disclaimer:language.disclaimer});
  } catch(error) {
    const message=error instanceof Error?error.message:'UNAUTHENTICATED';
    if(message.includes('FIREBASE')||message.includes('UNAUTHENTICATED'))return NextResponse.json({error:'Please sign in again.'},{status:401});
    console.error('POST /api/patient/reports/[id]/ai failed',error); return NextResponse.json({error:'Unable to generate AI Report.'},{status:500});
  }
}
