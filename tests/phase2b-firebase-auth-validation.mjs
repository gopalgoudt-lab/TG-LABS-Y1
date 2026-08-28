import { build } from 'esbuild';
import { chromium } from 'playwright';

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

function extractPublicFirebaseConfig(source) {
  const read = (key) => {
    const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
    return source.match(pattern)?.[1];
  };
  const config = {
    apiKey: read('apiKey'),
    authDomain: read('authDomain'),
    projectId: read('projectId'),
    storageBucket: read('storageBucket'),
    messagingSenderId: read('messagingSenderId'),
    appId: read('appId'),
  };
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error('Unable to discover the Preview public Firebase configuration.');
  }
  return config;
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
const secrets = [phone, code];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${navigationOrigin}/auth`, { waitUntil: 'networkidle' });

  const applicationOrigin = new URL(page.url()).origin;
  if (!APPROVED_ORIGINS.has(applicationOrigin)) {
    throw new Error('Preview navigation left the approved origin.');
  }

  const scriptUrls = await page.locator('script[src]').evaluateAll((elements) =>
    elements.map((element) => element.src).filter(Boolean),
  );
  const sameOriginScripts = scriptUrls.filter((url) => new URL(url).origin === applicationOrigin);
  const sources = await Promise.all(sameOriginScripts.map(async (url) => {
    const response = await context.request.get(url);
    if (!response.ok()) throw new Error('Unable to read a Preview application asset.');
    return response.text();
  }));
  const firebaseConfig = extractPublicFirebaseConfig(sources.join('\n'));

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
    throw new Error('Preview reload left the approved origin.');
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
