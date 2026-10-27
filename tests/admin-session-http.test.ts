import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

type MockState = {
  counts: number[];
  dbDown?: boolean;
  auditDown?: boolean;
  authError?: string;
  tokenError?: string;
  audits: unknown[];
};
const state: MockState = { counts: [0, 0], audits: [] };
(globalThis as typeof globalThis & { __adminRouteMock: MockState }).__adminRouteMock = state;

const mockPlugin = {
  name: 'admin-route-isolated-mocks',
  setup(pluginBuild: any) {
    pluginBuild.onResolve({ filter: new RegExp('^@/lib/(admin-auth|prisma)$') }, (args: { path: string }) => ({ path: args.path, namespace: 'admin-mock' }));
    pluginBuild.onLoad({ filter: /.*/, namespace: 'admin-mock' }, (args: { path: string }) => ({
      contents: args.path.endsWith('prisma') ? `
        const s = globalThis.__adminRouteMock;
        export const prisma = { adminAuditLog: {
          count: async () => { if(s.dbDown) throw Error('PRIVATE_DB_CONNECTION_STRING'); return s.counts.shift() ?? 0 },
          create: async (args) => { if(s.auditDown) throw Error('PRIVATE_DB_CONNECTION_STRING'); s.audits.push(args); }
        }};
      ` : `
        const s = globalThis.__adminRouteMock;
        export const ADMIN_SESSION_COOKIE = 'tg_admin_session';
        export const verifyAdminRequest = async () => { if(s.authError) throw Error(s.authError); return {uid:'test-user',phone:'9876543210',role:'ADMIN'} };
        export const issueAdminSession = async () => 'fictional-session-token';
        export const verifyAdminSessionToken = async () => { if(s.tokenError) throw Error(s.tokenError); return {uid:'test-user',phone:'9876543210',role:'ADMIN'} };
        export const adminAuthError = (e) => e.message === 'ADMIN_FORBIDDEN' ? {status:403,error:'Forbidden'} : e.message === 'ADMIN_NOT_CONFIGURED' ? {status:503,error:'Unavailable'} : {status:401,error:'Authentication required'};
      `,
      loader: 'js' as const,
    }));
  },
};
let POST: (request: Request) => Promise<Response>;
let GET: (request: Request) => Promise<Response>;
let logout: (request: Request) => Promise<Response>;
test.before(async () => {
  const bundled = await build({
    entryPoints: ['app/api/admin/session/route.ts'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    packages: 'external', plugins: [mockPlugin],
  });
  const mod: { exports: any } = { exports: {} };
  const require = createRequire(process.cwd() + '/package.json');
  new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(require, mod, mod.exports);
  ({ POST, GET, DELETE: logout } = mod.exports);
});
const url = 'https://preview.example.invalid/api/admin/session';
const request = (method: string, headers: Record<string,string> = {}) => new Request(url, { method, headers });
function reset() {
  state.counts = [0,0]; state.dbDown = false; state.auditDown = false;
  state.authError = undefined; state.tokenError = undefined; state.audits = [];
}
test('POST issues an HttpOnly SameSite session for an allowed identity', async () => {
  reset();
  const response = await POST(request('POST'));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /tg_admin_session=fictional-session-token/);
  assert.match(cookie, /httponly/i);
  assert.match(cookie, /samesite=lax/i);
  assert.match(cookie, /max-age=28800/i);
  assert.equal(state.audits.length, 1);
});
test('POST denies invalid identity with 401 and disallowed identity with 403', async () => {
  reset(); state.authError = 'UNAUTHENTICATED';
  assert.equal((await POST(request('POST'))).status, 401);
  reset(); state.authError = 'ADMIN_FORBIDDEN';
  assert.equal((await POST(request('POST'))).status, 403);
});
test('POST returns 503 for unavailable auth configuration', async () => {
  reset(); state.authError = 'ADMIN_NOT_CONFIGURED';
  assert.equal((await POST(request('POST'))).status, 503);
});
test('POST returns 429 and Retry-After for total or failed attempt limits', async () => {
  for(const counts of [[20,0],[0,8]]) {
    reset(); state.counts = counts;
    const response = await POST(request('POST'));
    assert.equal(response.status,429);
    assert.equal(response.headers.get('retry-after'),'900');
    assert.equal(response.headers.get('set-cookie'),null);
  }
});
test('POST fails closed with safe 503 when rate-limit database is down', async () => {
  reset(); state.dbDown = true;
  const response = await POST(request('POST'));
  assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(), /PRIVATE_DB_CONNECTION_STRING/);
  assert.equal(response.headers.get('set-cookie'),null);
});
test('GET rejects absent or invalid session and accepts valid session', async () => {
  reset();
  assert.equal((await GET(request('GET'))).status,401);
  state.tokenError='ADMIN_SESSION_INVALID';
  assert.equal((await GET(request('GET',{cookie:'tg_admin_session=invalid'}))).status,401);
  reset();
  assert.equal((await GET(request('GET',{cookie:'tg_admin_session=fictional-session-token'}))).status,200);
});
test('DELETE clears cookie even when audit logging fails', async () => {
  reset(); state.auditDown=true;
  const response = await logout(request('DELETE',{cookie:'tg_admin_session=fictional-session-token'}));
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie') ?? '';
  assert.match(cookie,/max-age=0/i);
  assert.match(cookie,/httponly/i);
  assert.match(cookie,/samesite=lax/i);
});
