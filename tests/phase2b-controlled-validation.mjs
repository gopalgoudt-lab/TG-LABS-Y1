import { createHmac, randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const EXPECTED = Object.freeze({
  projectId: 'still-lake-20474769',
  branchId: 'br-morning-frost-axtrdk8d',
  branchName: 'staging',
  database: 'neondb',
  testId: 'stg-test-cbc',
  partnerId: 'partner_tg_labs',
  offerId: 'offer_tg_6ba0a21ff0824fb67f1ff0dbdf946d58',
  price: 300,
  tat: '24 hrs',
});
const APPROVED_ORIGINS = new Set([
  'https://tg-labs-y1-xn0nwmpmq-gopalgoudt-7623s-projects.vercel.app',
  'https://tg-labs-y1-git-feature-phase-2-f71876-gopalgoudt-7623s-projects.vercel.app',
]);
const FORBIDDEN_HOSTS = new Set(['tglabs.in', 'www.tglabs.in', 'tg-labs-y1.vercel.app', 'localhost']);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const secrets = [
  required('PHASE2B_FIREBASE_TEST_PHONE'), required('PHASE2B_FIREBASE_TEST_CODE'),
  required('VERCEL_AUTOMATION_BYPASS_SECRET'), required('PHASE2B_VERCEL_API_TOKEN'),
  required('PHASE2B_NEON_API_KEY'), required('PHASE2B_STAGING_DATABASE_URL'),
  required('PHASE2B_RAZORPAY_TEST_KEY_ID'), required('PHASE2B_RAZORPAY_TEST_KEY_SECRET'),
  required('PHASE2B_RAZORPAY_TEST_WEBHOOK_SECRET'),
];

function redact(value) {
  let safe = String(value ?? 'Unknown failure');
  for (const secret of secrets) safe = safe.split(secret).join('[REDACTED]');
  return safe
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/\+\d{8,15}/g, '[REDACTED_PHONE]')
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approvedOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash &&
      APPROVED_ORIGINS.has(url.origin) && !FORBIDDEN_HOSTS.has(url.hostname);
  } catch { return false; }
}

async function json(response, label) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok()) throw new Error(`${label} failed with HTTP ${response.status()}.`);
  return body;
}

async function fetchJson(url, init, label) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return body;
}

function firebaseConfigFrom(source) {
  const read = (key) => source.match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`))?.[1];
  const config = { apiKey: read('apiKey'), authDomain: read('authDomain'), projectId: read('projectId'), storageBucket: read('storageBucket'), messagingSenderId: read('messagingSenderId'), appId: read('appId') };
  assert(config.apiKey && config.authDomain && config.projectId && config.appId, 'Unable to discover Preview Firebase configuration.');
  return config;
}

async function verifyVercelDeployment(origin) {
  const hostname = new URL(origin).hostname;
  const deployment = await fetchJson(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(hostname)}`,
    { headers: { Authorization: `Bearer ${required('PHASE2B_VERCEL_API_TOKEN')}` } },
    'Vercel deployment metadata lookup',
  );
  const aliases = new Set([deployment.url, ...(deployment.alias ?? [])].filter(Boolean).map((host) => `https://${host}`));
  assert(aliases.has(origin), 'Approved origin is not attached to the resolved deployment.');
  assert(deployment.readyState === 'READY' || deployment.state === 'READY', 'Exact Preview deployment is not READY.');
  assert(deployment.target !== 'production', 'Resolved deployment is Production.');
  assert(deployment.meta?.githubCommitSha === required('PHASE2B_PR_HEAD_SHA'), 'Preview deployment commit does not match the PR head.');
  return deployment.id;
}

async function verifyNeonTarget(prisma) {
  const branchResponse = await fetchJson(
    `https://console.neon.tech/api/v2/projects/${EXPECTED.projectId}/branches/${EXPECTED.branchId}`,
    { headers: { Authorization: `Bearer ${required('PHASE2B_NEON_API_KEY')}` } },
    'Neon branch metadata lookup',
  );
  const branch = branchResponse.branch;
  assert(branch?.id === EXPECTED.branchId && branch?.project_id === EXPECTED.projectId, 'Neon project or branch mismatch.');
  assert(branch.name === EXPECTED.branchName, 'Neon branch name mismatch.');
  assert(branch.primary === false, 'Neon staging branch is default/primary.');
  const endpointResponse = await fetchJson(
    `https://console.neon.tech/api/v2/projects/${EXPECTED.projectId}/branches/${EXPECTED.branchId}/endpoints`,
    { headers: { Authorization: `Bearer ${required('PHASE2B_NEON_API_KEY')}` } },
    'Neon branch endpoint metadata lookup',
  );
  const databaseHost = new URL(required('PHASE2B_STAGING_DATABASE_URL')).hostname;
  const endpoints = endpointResponse.endpoints ?? [];
  assert(endpoints.some((endpoint) => databaseHost === endpoint.host || databaseHost.startsWith(`${endpoint.id}-`) || databaseHost.startsWith(`${endpoint.id}.`)), 'Staging database URL does not resolve to the approved Neon branch endpoint.');
  const database = await prisma.$queryRawUnsafe('SELECT current_database() AS name');
  assert(database[0]?.name === EXPECTED.database, 'Connected database is not neondb.');
  const offer = await prisma.testPartnerOffer.findUnique({ where: { id: EXPECTED.offerId }, include: { partner: true } });
  assert(offer && offer.testId === EXPECTED.testId && offer.partnerId === EXPECTED.partnerId && offer.price === EXPECTED.price && offer.availability === 'AVAILABLE' && offer.tat === EXPECTED.tat && offer.active === true, 'TG Labs CBC offer preflight failed.');
  assert(offer.partner.slug === 'tg-labs-partner' && offer.partner.name === 'TG Labs partner' && offer.partner.active, 'TG Labs partner preflight failed.');
}

async function verifyRazorpayTestCredentials(origin, request) {
  const keyId = required('PHASE2B_RAZORPAY_TEST_KEY_ID');
  assert(keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_'), 'Razorpay key is not TEST mode.');
  const credentialCheck = await fetch('https://api.razorpay.com/v1/orders?count=1', {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${required('PHASE2B_RAZORPAY_TEST_KEY_SECRET')}`).toString('base64')}` },
  });
  assert(credentialCheck.ok, 'Razorpay TEST credentials failed read-only validation.');
  const raw = '{';
  const signature = createHmac('sha256', required('PHASE2B_RAZORPAY_TEST_WEBHOOK_SECRET')).update(raw).digest('hex');
  const response = await request.post(`${origin}/api/webhooks/razorpay`, {
    data: raw,
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': signature, 'x-razorpay-event-id': `phase2b-preflight-${randomUUID()}` },
  });
  assert(response.status() === 400, 'Preview TEST webhook secret/configuration preflight failed.');
}

function nextIndiaDate() {
  const india = new Date(Date.now() + 330 * 60 * 1000);
  india.setUTCDate(india.getUTCDate() + 1);
  return india.toISOString().slice(0, 10);
}

async function main() {
  const origin = required('PHASE2B_PREVIEW_ORIGIN');
  assert(approvedOrigin(origin), 'Preview origin is outside the exact fail-closed allowlist.');
  for (const forbidden of ['https://tglabs.in', 'https://www.tglabs.in', 'https://tg-labs-y1.vercel.app', 'https://unrelated.vercel.app', 'http://localhost:3000']) assert(!approvedOrigin(forbidden), 'Forbidden origin was accepted.');

  const prisma = new PrismaClient({ datasources: { db: { url: required('PHASE2B_STAGING_DATABASE_URL') } } });
  let browser;
  try {
    await verifyVercelDeployment(origin);
    await verifyNeonTarget(prisma);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.route('**/*', async (route) => {
      const requestOrigin = (() => { try { return new URL(route.request().url()).origin; } catch { return ''; } })();
      if (APPROVED_ORIGINS.has(requestOrigin)) {
        await route.continue({ headers: { ...route.request().headers(), 'x-vercel-protection-bypass': required('VERCEL_AUTOMATION_BYPASS_SECRET'), 'x-vercel-set-bypass-cookie': 'true' } });
      } else await route.continue();
    });
    const page = await context.newPage();
    await page.goto(`${origin}/auth`, { waitUntil: 'networkidle' });
    assert(APPROVED_ORIGINS.has(new URL(page.url()).origin), 'Preview navigation left the exact origin allowlist.');
    const applicationOrigin = new URL(page.url()).origin;
    const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src).filter(Boolean));
    const sources = await Promise.all(scripts.filter((url) => new URL(url).origin === applicationOrigin).map(async (url) => {
      const response = await context.request.get(url, { headers: { 'x-vercel-protection-bypass': required('VERCEL_AUTOMATION_BYPASS_SECRET') } });
      assert(response.ok(), 'Unable to read a Preview application asset.');
      return response.text();
    }));
    const config = firebaseConfigFrom(sources.join('\n'));
    const bundle = await build({ stdin: { contents: `import { initializeApp, deleteApp } from 'firebase/app'; import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'; globalThis.__controlledAuth = async (config, phone, code) => { const node=document.createElement('div'); node.id='phase2b-recaptcha'; document.body.appendChild(node); const app=initializeApp(config,'phase2b-controlled'); const auth=getAuth(app); auth.settings.appVerificationDisabledForTesting=true; const verifier=new RecaptchaVerifier(auth,node,{size:'invisible'}); try { await verifier.render(); const confirmation=await signInWithPhoneNumber(auth,phone,verifier); const credential=await confirmation.confirm(code); return credential.user.getIdToken(true); } finally { verifier.clear(); node.remove(); await deleteApp(app); } };`, resolveDir: process.cwd() }, bundle: true, format: 'iife', platform: 'browser', write: false, logLevel: 'silent' });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const token = await page.evaluate(async ({ config, phone, code }) => globalThis.__controlledAuth(config, phone, code), { config, phone: required('PHASE2B_FIREBASE_TEST_PHONE'), code: required('PHASE2B_FIREBASE_TEST_CODE') });
    secrets.push(token);
    const authHeaders = { Authorization: `Bearer ${token}`, 'x-vercel-protection-bypass': required('VERCEL_AUTOMATION_BYPASS_SECRET'), 'content-type': 'application/json' };
    const api = (path, options = {}) => context.request.fetch(`${applicationOrigin}${path}`, { ...options, headers: { ...authHeaders, ...(options.headers ?? {}) } });

    const authCheck = await api('/api/patient/bookings');
    assert(authCheck.status() === 200, 'Fictional Firebase authentication preflight failed.');
    const noToken = await context.request.post(`${applicationOrigin}/api/bookings`, { data: {}, headers: { 'x-vercel-protection-bypass': required('VERCEL_AUTOMATION_BYPASS_SECRET') } });
    assert(noToken.status() === 401, 'No-token booking request was not denied.');
    const invalidToken = await context.request.post(`${applicationOrigin}/api/bookings`, { data: {}, headers: { Authorization: 'Bearer invalid-phase2b-token', 'x-vercel-protection-bypass': required('VERCEL_AUTOMATION_BYPASS_SECRET') } });
    assert(invalidToken.status() === 401, 'Invalid-token booking request was not denied.');
    const catalog = await json(await api('/api/catalog'), 'Catalog preflight');
    const cbc = catalog.tests?.find((test) => test.id === EXPECTED.testId);
    const offer = cbc?.offers?.find((item) => item.id === EXPECTED.offerId);
    assert(cbc && offer && offer.price === 300 && offer.availability === 'AVAILABLE' && offer.tat === '24 hrs' && offer.partner?.id === EXPECTED.partnerId, 'Preview catalog CBC offer mismatch.');
    await verifyRazorpayTestCredentials(applicationOrigin, context.request);

    const before = await prisma.$transaction([
      prisma.booking.count(), prisma.bookingItem.count(), prisma.paymentTransaction.count(), prisma.razorpayWebhookEvent.count(),
    ]);
    console.log('All pre-write safety checks: PASS');

    const idempotencyKey = randomUUID();
    const databasePhone = required('PHASE2B_FIREBASE_TEST_PHONE').replace(/^\+91/, '');
    const existingPatient = await prisma.patient.findUnique({ where: { phone: databasePhone } });
    const patientFixture = {
      name: existingPatient?.name ?? 'Phase 2B Fictional Patient',
      email: existingPatient?.email ?? `phase2b-${idempotencyKey}@example.invalid`,
      age: existingPatient?.age ?? 30,
      gender: ['MALE', 'FEMALE', 'OTHERS'].includes(existingPatient?.gender ?? '') ? existingPatient.gender : 'OTHERS',
    };
    const bookingRequest = {
      idempotencyKey, ...patientFixture, phone: databasePhone,
      paymentOption: 'ONLINE', mode: 'home', address: 'Phase 2B synthetic staging address', pincode: '500001',
      date: nextIndiaDate(), slot: '6:00 AM - 6:30 AM', testSelections: [{ testId: EXPECTED.testId, offerId: EXPECTED.offerId }],
    };
    const createdResponse = await api('/api/bookings', { method: 'POST', data: bookingRequest });
    assert(createdResponse.status() === 201, `Online booking creation returned HTTP ${createdResponse.status()}.`);
    const created = await createdResponse.json();
    const bookingId = created.booking?.id;
    assert(bookingId && created.booking.totalAmount === 300 && created.booking.paymentStatus === 'PENDING' && created.booking.status === 'PENDING', 'Online booking response failed integrity checks.');
    const stored = await prisma.booking.findUnique({ where: { id: bookingId }, include: { patient: true, items: true, payments: true } });
    assert(stored && stored.patient.phone === databasePhone && stored.idempotencyKey === idempotencyKey && stored.totalAmount === 300 && stored.paymentStatus === 'PENDING' && stored.status === 'PENDING' && stored.workflowStatus === 'BOOKING_CREATED', 'Stored online booking failed integrity checks.');
    assert(stored.items.length === 1 && stored.items[0].testId === EXPECTED.testId && stored.items[0].offerId === EXPECTED.offerId && stored.items[0].partnerId === EXPECTED.partnerId && stored.items[0].partnerName === 'TG Labs partner' && stored.items[0].partnerTat === '24 hrs' && stored.items[0].partnerAvailability === 'AVAILABLE' && stored.items[0].price === 300, 'Stored booking item snapshot failed integrity checks.');

    const duplicateResponse = await api('/api/bookings', { method: 'POST', data: bookingRequest });
    const duplicate = await json(duplicateResponse, 'Idempotency replay');
    assert(duplicateResponse.status() === 200 && duplicate.duplicate === true && duplicate.booking?.id === bookingId, 'Idempotency replay did not return the original booking.');
    assert(await prisma.booking.count({ where: { idempotencyKey } }) === 1, 'Idempotency replay created a second booking.');

    const orderResponse = await api('/api/payments/razorpay/order', { method: 'POST', data: { bookingId } });
    const orderData = await json(orderResponse, 'Razorpay TEST order creation');
    assert(orderData.keyId === required('PHASE2B_RAZORPAY_TEST_KEY_ID') && orderData.keyId.startsWith('rzp_test_'), 'Preview used an unexpected or live Razorpay key.');
    assert(orderData.order?.amount === 30000 && orderData.order?.currency === 'INR' && orderData.bookingId === bookingId, 'Razorpay TEST order response mismatch.');
    const orderId = orderData.order.id;
    const pending = await prisma.paymentTransaction.findMany({ where: { bookingId, orderId } });
    assert(pending.length === 1 && pending[0].amount === 30000 && pending[0].currency === 'INR' && pending[0].status === 'PENDING', 'Pending payment transaction mismatch.');

    const invalidSignature = await api('/api/payments/razorpay/verify', { method: 'POST', data: { bookingId, razorpay_payment_id: `pay_phase2b_${randomUUID()}`, razorpay_order_id: orderId, razorpay_signature: 'invalid-signature' } });
    assert(invalidSignature.status() === 400, 'Invalid payment signature was not rejected.');
    const mismatched = await api('/api/payments/razorpay/verify', { method: 'POST', data: { bookingId, razorpay_payment_id: `pay_phase2b_${randomUUID()}`, razorpay_order_id: `order_mismatch_${randomUUID()}`, razorpay_signature: 'invalid-signature' } });
    assert(mismatched.status() === 400, 'Mismatched booking/order/payment association was not rejected.');
    assert((await prisma.booking.findUnique({ where: { id: bookingId } }))?.paymentStatus !== 'PAID', 'Negative tests improperly set the booking PAID.');

    const signWebhook = (raw) => createHmac('sha256', required('PHASE2B_RAZORPAY_TEST_WEBHOOK_SECRET')).update(raw).digest('hex');
    const sendWebhook = (eventId, payload) => { const raw = JSON.stringify(payload); return context.request.post(`${applicationOrigin}/api/webhooks/razorpay`, { data: raw, headers: { 'content-type': 'application/json', 'x-razorpay-signature': signWebhook(raw), 'x-razorpay-event-id': eventId, 'x-vercel-protection-bypass': required('VERCEL_AUTOMATION_BYPASS_SECRET') } }); };
    const failedPaymentId = `pay_phase2b_failed_${randomUUID()}`;
    const failedEventId = `evt_phase2b_failed_${randomUUID()}`;
    const failedPayload = { event: 'payment.failed', payload: { payment: { entity: { id: failedPaymentId, order_id: orderId, amount: 30000, currency: 'INR', status: 'failed', error_code: 'PHASE2B_SYNTHETIC_FAILURE', error_description: 'Synthetic staging validation failure' } } } };
    assert((await sendWebhook(failedEventId, failedPayload)).status() === 200, 'Valid TEST payment.failed webhook failed.');
    const replay = await sendWebhook(failedEventId, failedPayload);
    assert(replay.status() === 200 && (await replay.json()).duplicate === true, 'Webhook replay was not idempotent.');

    const retryEventId = `evt_phase2b_retry_${randomUUID()}`;
    const retryPaymentId = `pay_phase2b_retry_${randomUUID()}`;
    const badPayload = { event: 'payment.failed', payload: { payment: { entity: { id: retryPaymentId, order_id: `order_missing_${randomUUID()}`, amount: 30000, currency: 'INR', status: 'failed' } } } };
    assert((await sendWebhook(retryEventId, badPayload)).status() === 500, 'Failed reconciliation setup did not fail closed.');
    const correctedPayload = { event: 'payment.failed', payload: { payment: { entity: { ...badPayload.payload.payment.entity, order_id: orderId } } } };
    assert((await sendWebhook(retryEventId, correctedPayload)).status() === 200, 'Failed webhook reconciliation did not retry successfully.');

    const foreignPayment = await prisma.paymentTransaction.findFirst({ where: { bookingId: { not: bookingId }, paymentId: { not: null } }, select: { paymentId: true } });
    let webhookAssociation = 'NOT EXECUTED (no pre-existing foreign synthetic payment ID)';
    if (foreignPayment?.paymentId) {
      const associationEventId = `evt_phase2b_assoc_${randomUUID()}`;
      const associationPayload = { event: 'payment.failed', payload: { payment: { entity: { id: foreignPayment.paymentId, order_id: orderId, amount: 30000, currency: 'INR', status: 'failed' } } } };
      assert((await sendWebhook(associationEventId, associationPayload)).status() === 500, 'Webhook mismatched association was not rejected.');
      webhookAssociation = 'PASS';
    }

    let collectionBookingId = null;
    const collectionKey = randomUUID();
    const collectionResponse = await api('/api/bookings', { method: 'POST', data: { ...bookingRequest, idempotencyKey: collectionKey, paymentOption: 'COLLECTION', collectionPaymentMethod: 'CASH' } });
    assert(collectionResponse.status() === 201, 'Pay-at-collection booking creation failed.');
    collectionBookingId = (await collectionResponse.json()).booking?.id;
    const collectionOrder = await api('/api/payments/razorpay/order', { method: 'POST', data: { bookingId: collectionBookingId } });
    assert(collectionOrder.status() === 409, 'Pay-at-collection booking improperly created an online order.');
    const collectionStored = await prisma.booking.findUnique({ where: { id: collectionBookingId } });
    assert(collectionStored?.paymentStatus === 'PENDING' && collectionStored.paymentMode === 'CASH' && !collectionStored.razorpayOrderId, 'Pay-at-collection state mismatch.');

    const after = await prisma.$transaction([prisma.booking.count(), prisma.bookingItem.count(), prisma.paymentTransaction.count(), prisma.razorpayWebhookEvent.count()]);
    assert(after[0] - before[0] === 2 && after[1] - before[1] === 2, 'Booking write limit was exceeded.');
    assert(after[2] - before[2] === 2, 'Payment transaction write scope was not the expected minimum.');
    assert(after[3] - before[3] >= 2 && after[3] - before[3] <= 3, 'Webhook event write limit was exceeded.');
    assert((await prisma.booking.findUnique({ where: { id: bookingId } }))?.paymentStatus !== 'PAID', 'Online booking improperly transitioned to PAID.');

    console.log(`Synthetic online booking ID: ${bookingId}`);
    console.log(`Razorpay TEST order ID: ${orderId}`);
    console.log(`Synthetic pay-at-collection booking ID: ${collectionBookingId}`);
    console.log('Maximum bookings created: 2 of 2');
    console.log('Razorpay TEST orders created: 1 of 1');
    console.log(`Webhook mismatched association: ${webhookAssociation}`);
    console.log('Cross-user ownership runtime test: NOT EXECUTED (second fictional identity not configured)');
    console.log('Captured-payment transition: NOT EXECUTED (no legitimate TEST captured payment)');
    console.log('Controlled Phase 2B validation: PASS');
  } finally {
    await browser?.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Controlled Phase 2B validation: FAIL (${redact(error instanceof Error ? error.message : error)})`);
  process.exitCode = 1;
});
