import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { patientPhoneFromFirebase, verifyFirebasePatientRequest } from '@/lib/firebase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

function reportInput(reportData: string, reportName: string) {
  if (reportData.startsWith('data:image/')) {
    return { type: 'input_image', image_url: reportData };
  }

  if (reportData.startsWith('data:')) {
    const comma = reportData.indexOf(',');
    const base64 = comma >= 0 ? reportData.slice(comma + 1) : reportData;
    return { type: 'input_file', filename: reportName || 'diagnostic-report.pdf', file_data: base64 };
  }

  if (/^https:\/\//i.test(reportData)) {
    return { type: 'input_file', filename: reportName || 'diagnostic-report.pdf', file_url: reportData };
  }

  return { type: 'input_file', filename: reportName || 'diagnostic-report.pdf', file_data: reportData };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await verifyFirebasePatientRequest(request);
    const phone = patientPhoneFromFirebase(identity.phone);
    const { id } = await params;

    const booking = await prisma.booking.findFirst({
      where: { id, patient: { phone } },
      select: {
        id: true,
        reportName: true,
        reportData: true,
        reportReadyAt: true,
        workflowStatus: true,
        patient: { select: { age: true, gender: true } },
        items: { select: { test: { select: { name: true } } } },
        packages: { select: { package: { select: { name: true } } } },
      },
    });

    if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    if (!booking.reportData) return NextResponse.json({ error: 'The diagnostic report is not available for AI explanation yet.' }, { status: 409 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI Report is not configured yet.' }, { status: 503 });

    const tests = booking.items.map((x) => x.test.name);
    const packages = booking.packages.map((x) => x.package.name);
    const context = [
      booking.patient.age != null ? `Age: ${booking.patient.age}` : '',
      booking.patient.gender ? `Gender: ${booking.patient.gender}` : '',
      tests.length ? `Tests: ${tests.join(', ')}` : '',
      packages.length ? `Packages: ${packages.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are the TG Labs AI Report Assistant. Explain the attached diagnostic laboratory report to a patient in clear, calm, non-alarmist language.\n\n${context}\n\nIMPORTANT SAFETY RULES:\n- Do not diagnose a disease or claim certainty.\n- Do not prescribe, start, stop, or change medicines or supplements.\n- Do not invent values, reference ranges, symptoms, history, or findings that are not in the report.\n- Clearly distinguish normal, borderline, and out-of-range results using the laboratory ranges printed on the report.\n- Mention that reference ranges vary by lab, age, sex, pregnancy status, medications, and clinical context where relevant.\n- If a result may require urgent medical attention, explain that the patient should contact a qualified clinician promptly; do not create panic.\n- Diet and activity suggestions must be general wellness guidance and must account for uncertainty.\n- If the report does not contain enough information for a recommendation, say so.\n- Never expose or repeat phone numbers, addresses, emails, IDs, payment information, or other identifiers even if visible in the document.\n\nReturn a patient-friendly report with these exact sections:\n1. REPORT OVERVIEW\nA concise summary of what was tested and the main takeaways.\n\n2. KEY RESULTS\nUse a compact markdown table with: Test | Result | Lab Range | Interpretation. Include only values actually visible in the report.\n\n3. WHAT THE RESULTS MAY MEAN\nExplain important abnormal or borderline findings and how the results relate to each other. Avoid diagnosis.\n\n4. DIET SUGGESTION TABLE\nUse a markdown table with: Goal | Foods to Prefer | Foods to Limit | Practical Tip. Tailor only where the report supports it.\n\n5. PHYSICAL ACTIVITY PLAN\nGive safe general activity suggestions using a markdown table with: Activity | Frequency | Duration | Notes. If the report suggests that exercise advice may need clinician review, state that first.\n\n6. WHAT TO DISCUSS WITH YOUR DOCTOR\nList sensible follow-up questions or repeat tests, without ordering or prescribing them.\n\n7. WHEN TO SEEK MEDICAL CARE\nMention only clinically reasonable warning situations related to clearly abnormal findings. If none are evident from the report, say there is no specific urgent warning visible from the report alone.\n\n8. IMPORTANT NOTE\nState clearly that this AI explanation is educational, does not replace a doctor's interpretation, and should be reviewed with a qualified healthcare professional.`;

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra',
        store: false,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            reportInput(booking.reportData, booking.reportName || 'diagnostic-report.pdf'),
          ],
        }],
      }),
    });

    const data = await aiResponse.json();
    if (!aiResponse.ok) {
      console.error('OpenAI AI report failed', aiResponse.status, data?.error?.message || data);
      return NextResponse.json({ error: 'AI Report could not be generated right now. Please try again.' }, { status: 502 });
    }

    const analysis = outputText(data);
    if (!analysis) return NextResponse.json({ error: 'AI Report returned an empty explanation. Please try again.' }, { status: 502 });

    return NextResponse.json({
      analysis,
      generatedAt: new Date().toISOString(),
      model: process.env.AI_REPORT_MODEL || 'gpt-5.6-terra',
      disclaimer: 'AI-generated educational explanation only. It does not replace medical advice, diagnosis, or treatment from a qualified healthcare professional.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHENTICATED';
    if (message.includes('FIREBASE') || message.includes('UNAUTHENTICATED')) {
      return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    }
    console.error('POST /api/patient/reports/[id]/ai failed', error);
    return NextResponse.json({ error: 'Unable to generate AI Report.' }, { status: 500 });
  }
}
