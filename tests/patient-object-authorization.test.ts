import fs from 'node:fs';
import path from 'node:path';

function source(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

describe('Phase 6A patient object-authorization gate', () => {
  test('report file requires Firebase patient identity and scopes booking by id + authenticated phone', () => {
    const text = source('app/api/patient/reports/[id]/file/route.ts');
    expect(text).toContain('verifyFirebasePatientRequest(request)');
    expect(text).toMatch(/where:\s*\{\s*id,\s*patient:\s*\{\s*phone\s*\}\s*\}/);
    expect(text).toContain("if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 })");
  });

  test('payment receipt requires Firebase patient identity and scopes booking by id + authenticated phone', () => {
    const text = source('app/api/patient/bookings/[id]/receipt/route.ts');
    expect(text).toContain('verifyFirebasePatientRequest(request)');
    expect(text).toMatch(/where:\s*\{\s*id,\s*patient:\s*\{\s*phone:\s*identity\.databasePhone\s*\}\s*\}/);
    expect(text).toContain("if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })");
  });

  test('patient report listing is reached only through the authenticated patient phone relation', () => {
    const text = source('app/api/patient/reports/route.ts');
    expect(text).toContain('verifyFirebasePatientRequest(request)');
    expect(text).toMatch(/prisma\.patient\.findUnique\(\{\s*where:\s*\{\s*phone\s*\}/);
  });

  test('patient booking listing is reached only through the authenticated patient phone relation', () => {
    const text = source('app/api/patient/bookings/route.ts');
    expect(text).toContain('verifyFirebasePatientRequest(request)');
    expect(text).toMatch(/prisma\.patient\.findUnique\(\{\s*where:\s*\{\s*phone\s*\}/);
  });

  test('report PDFs disable shared caching and framing', () => {
    const text = source('app/api/patient/reports/[id]/file/route.ts');
    expect(text).toContain("'Cache-Control': 'private, no-store, max-age=0'");
    expect(text).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(text).toContain("frame-ancestors 'none'");
  });
});
