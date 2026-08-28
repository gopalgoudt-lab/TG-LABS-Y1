import { build } from 'esbuild';
import { chromium } from 'playwright';
import { phase2bFirebasePublicConfig } from './phase2b-firebase-public-config.mjs';

const ORIGINAL_APPROVED_ORIGIN = 'https://tg-labs-y1-xn0nwmpmq-gopalgoudt-7623s-projects.vercel.app';
const DEPLOYMENT_REDIRECT_ORIGIN = 'https://tg-labs-y1-git-feature-phase-2-f71876-gopalgoudt-7623s-projects.vercel.app';
const APPROVED_ORIGINS = new Set([ORIGINAL_APPROVED_ORIGIN, DEPLOYMENT_REDIRECT_ORIGIN]);
const FORBIDDEN_HOSTS = new Set(['tglabs.in', 'www.tglabs.in']);

function isApprovedPreviewOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/' && url.search === '' && url.hash === '' && APPROVED_ORIGINS.has(url.origin);
  } catch {
    return false;
  }
}

function rejectedPreviewOrigin(stage, value) {
  let origin = 'unparseable origin';
  try {
    const url = new URL(value);
    origin = `${url.protocol}//${url.host}`;
  } catch {
    // Never include the rejected raw URL in diagnostic output.
  }
  return new Error(`Rejected Preview origin during ${stage}: ${origin}`);
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function redact(message, secrets) {
  let safe = String(message || 'Unknown Firebase authentication failure');
  for (const secret of secrets) {
    if (secret) safe = safe.split(secret).join('[REDACTED]');
  }
  return safe
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/\+\d{8,15}/g, '[REDACTED_PHONE]');
}

const target = new URL(requiredEnvironment('PHASE2B_PREVIEW_ORIGIN'));
if (!isApprovedPreviewOrigin(target.href)) {
  throw new Error('Preview origin does not exactly match the approved Phase 2B deployment.');
}
if (FORBIDDEN_HOSTS.has(target.hostname) || !target.hostname.endsWith('.vercel.app')) {
  throw new Error('Refusing a Production or unexpected hostname.');
}
for (const forbiddenOrigin of [
  'https://tglabs.in',
  'https://www.tglabs.in',
  'https://tg-labs-y1.vercel.app',
  'https://unrelated-preview.vercel.app',
  'http://localhost:3000',
  'https://localhost',
]) {
  if (isApprovedPreviewOrigin(forbiddenOrigin)) throw new Error('Preview origin guard accepted a forbidden hostname.');
}

const navigationOrigin = target.origin;

const phone = requiredEnvironment('PHASE2B_FIREBASE_TEST_PHONE');
const code = requiredEnvironment('PHASE2B_FIREBASE_TEST_CODE');
const vercelBypassSecret = requiredEnvironment('VERCEL_AUTOMATION_BYPASS_SECRET');
const secrets = [phone, code, vercelBypassSecret];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**/*', async (route) => {
    const request = route.request();
    let requestOrigin;
    try {
      requestOrigin = new URL(request.url()).origin;
    } catch {
      await route.continue();
      return;
    }
    if (!APPROVED_ORIGINS.has(requestOrigin)) {
      await route.continue();
      return;
    }
    await route.continue({
      headers: {
        ...request.headers(),
        'x-vercel-protection-bypass': vercelBypassSecret,
        'x-vercel-set-bypass-cookie': 'true',
      },
    });
  });
  await page.goto(`${navigationOrigin}/auth`, { waitUntil: 'networkidle' });

  const applicationOrigin = new URL(page.url()).origin;
  if (!APPROVED_ORIGINS.has(applicationOrigin)) {
    throw rejectedPreviewOrigin('initial navigation', page.url());
  }

  const firebaseConfig = phase2bFirebasePublicConfig();

  const browserBundle = await build({
    stdin: {
      contents: `
        import { initializeApp, deleteApp } from 'firebase/app';
        import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';

        globalThis.__phase2bAuthenticate = async ({ config, phone, code, approvedOrigin }) => {
          if (location.origin !== approvedOrigin) throw new Error('Unexpected browser origin.');
          const container = document.createElement('div');
          container.id = 'phase2b-recaptcha';
          document.body.appendChild(container);
          const app = initializeApp(config, 'phase2b-ephemeral-auth');
          const auth = getAuth(app);
          auth.settings.appVerificationDisabledForTesting = true;
          const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
          try {
            await verifier.render();
            const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
            const credential = await confirmation.confirm(code);
            const token = await credential.user.getIdToken(true);
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            const response = await fetch('/api/patient/bookings', {
              method: 'GET',
              headers: { Authorization: 'Bearer ' + token },
              cache: 'no-store',
            });
            const result = {
              issuer: payload.iss,
              audience: payload.aud,
              expiresAt: payload.exp,
              hasPhoneNumber: typeof payload.phone_number === 'string' && payload.phone_number.length > 0,
              serverStatus: response.status,
            };
            await signOut(auth);
            return result;
          } finally {
            verifier.clear();
            container.remove();
            await deleteApp(app);
          }
        };
      `,
      resolveDir: process.cwd(),
      sourcefile: 'phase2b-ephemeral-auth-browser-entry.js',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  });

  await page.addInitScript({ content: browserBundle.outputFiles[0].text });
  await page.reload({ waitUntil: 'networkidle' });
  if (new URL(page.url()).origin !== applicationOrigin) {
    throw rejectedPreviewOrigin('document reload', page.url());
  }
  const result = await page.evaluate(
    async (input) => globalThis.__phase2bAuthenticate(input),
    { config: firebaseConfig, phone, code, approvedOrigin: applicationOrigin },
  );

  const expectedIssuer = `https://securetoken.google.com/${firebaseConfig.projectId}`;
  if (result.issuer !== expectedIssuer || result.audience !== firebaseConfig.projectId) {
    throw new Error('Firebase token issuer or audience did not match the Preview project.');
  }
  if (!Number.isFinite(result.expiresAt) || result.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error('Firebase token was expired or had an invalid expiration.');
  }
  if (!result.hasPhoneNumber) throw new Error('Firebase token lacks the phone_number claim.');
  if (result.serverStatus !== 200) {
    throw new Error(`Preview server rejected the genuine Firebase token with status ${result.serverStatus}.`);
  }

  console.log('Firebase fictional authentication: PASS');
  console.log('Genuine Firebase token obtained: YES');
  console.log('Preview server accepted token: PASS');
  console.log('Real SMS sent: NO');
  console.log('Records created: NONE');
} catch (error) {
  const codeValue = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Firebase fictional authentication: FAIL (${redact(codeValue, secrets)}: ${redact(message, secrets)})`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
