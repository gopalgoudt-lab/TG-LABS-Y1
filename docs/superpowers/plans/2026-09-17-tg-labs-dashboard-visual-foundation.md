# TG LABS Dashboard Visual Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing TG LABS dashboard presentation into tested reusable primitives that support the approved Patient, Admin and Technician visual direction without changing business logic, authentication, data or Production configuration.

**Architecture:** Preserve `DashboardChrome` as the authenticated role-aware composition boundary, but extract presentation-only primitives under `components/dashboard/`. Keep data/auth/logout behavior in existing consuming boundaries. Reuse the current CSS approach, introducing shared semantic dashboard classes/tokens rather than a new UI dependency.

**Tech Stack:** Next.js 15.4, React 19.1, TypeScript 5.8, existing CSS, Node test runner with `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-17-tg-labs-dashboard-visual-foundation-design.md`

## Global Constraints

- Do not modify Prisma schema/migrations, Neon data, catalog data, serviceability/pincodes, partner eligibility/activation, payment configuration, Firebase authentication, WhatsApp configuration, environment variables, secrets or Production deployment settings.
- Do not introduce Preview or Production admin-login bypasses.
- Do not ship illustrative mockup metrics as real operational values.
- Keep existing role authorization and logout behavior authoritative.
- No new UI package/dependency.
- Work only on `feature/dashboard-visual-foundation`; keep PR unmerged until exact-head Preview validation and explicit approval.

---

### Task 1: Lock the reusable visual contract with a RED regression test

**Files:**
- Create: `tests/dashboard-visual-foundation.test.ts`
- Read: `components/DashboardChrome.tsx`
- Read: `app/dashboard-shell.css`
- Read: `app/dashboard-insights.css`

**Interfaces:**
- Consumes: current dashboard shell/CSS conventions.
- Produces: regression contract requiring `DashboardShell`, `DashboardPanel`, `DashboardStatCard`, `DashboardStatusBadge`, `DashboardQuickAction`, and `DashboardState` presentation primitives.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');

test('dashboard visual foundation exposes reusable primitives', () => {
  const source = read('components/dashboard/index.ts');
  for (const name of ['DashboardShell','DashboardPanel','DashboardStatCard','DashboardStatusBadge','DashboardQuickAction','DashboardState']) {
    assert.match(source, new RegExp(`export .*${name}`));
  }
});

test('dashboard foundation defines accessible semantic status variants', () => {
  const source = read('components/dashboard/DashboardStatusBadge.tsx');
  for (const status of ['success','warning','danger','info','neutral']) assert.match(source, new RegExp(status));
  assert.match(source, /aria-label/);
});

test('dashboard states never fabricate operational values', () => {
  const source = read('components/dashboard/DashboardState.tsx');
  assert.match(source, /loading/);
  assert.match(source, /empty/);
  assert.match(source, /error/);
});
```

- [ ] **Step 2: Run RED verification**

Run: `node --import tsx --test tests/dashboard-visual-foundation.test.ts`

Expected: FAIL because `components/dashboard/index.ts` and the new primitive files do not yet exist.

- [ ] **Step 3: Commit RED evidence only**

```bash
git add tests/dashboard-visual-foundation.test.ts
git commit -m "test: define dashboard visual foundation contract"
```

### Task 2: Add shared panel, stat, status, action and state primitives

**Files:**
- Create: `components/dashboard/DashboardPanel.tsx`
- Create: `components/dashboard/DashboardStatCard.tsx`
- Create: `components/dashboard/DashboardStatusBadge.tsx`
- Create: `components/dashboard/DashboardQuickAction.tsx`
- Create: `components/dashboard/DashboardState.tsx`
- Create: `components/dashboard/index.ts`
- Create: `app/dashboard-foundation.css`
- Modify: `tests/dashboard-visual-foundation.test.ts`

**Interfaces:**
- `DashboardPanel({title, subtitle?, action?, children, className?})`
- `DashboardStatCard({label, value, note?, icon?, trend?})`
- `DashboardStatusBadge({status, label})`, status union `success | warning | danger | info | neutral`.
- `DashboardQuickAction({href, label, note, icon})`.
- `DashboardState({state, title, message})`, state union `loading | empty | error`.

- [ ] **Step 1: Extend the test to assert CSS accessibility/responsiveness contracts**

```ts
test('dashboard foundation includes focus and responsive contracts', () => {
  const css = read('app/dashboard-foundation.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media/);
  assert.match(css, /overflow-x:\s*auto/);
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node --import tsx --test tests/dashboard-visual-foundation.test.ts`

Expected: FAIL because primitive implementation/CSS is absent.

- [ ] **Step 3: Implement minimal typed presentation primitives**

Use semantic `section`, `article`, `a`, and status elements; accept `ReactNode` where icon/action/children content is needed. `DashboardState` renders only the supplied title/message and a state label; it must not create counts, prices or other operational values. Export all six primitives from `components/dashboard/index.ts`.

- [ ] **Step 4: Implement shared CSS**

Define `.tgDashPanel`, `.tgDashStat`, `.tgDashStatus`, `.tgDashAction`, `.tgDashState`, `.tgDashTableScroll`, visible `:focus-visible` outlines, rounded surfaces, readable typography and a mobile breakpoint. `.tgDashTableScroll` uses `overflow-x: auto` so dense tables scroll inside their panel rather than causing page overflow.

- [ ] **Step 5: Run GREEN verification and typecheck**

Run:
```bash
node --import tsx --test tests/dashboard-visual-foundation.test.ts
npm run typecheck
```
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard app/dashboard-foundation.css tests/dashboard-visual-foundation.test.ts
git commit -m "feat: add reusable dashboard presentation primitives"
```

### Task 3: Extract the dashboard shell without changing auth behavior

**Files:**
- Create: `components/dashboard/DashboardShell.tsx`
- Modify: `components/DashboardChrome.tsx`
- Modify: `components/dashboard/index.ts`
- Modify: `tests/dashboard-visual-foundation.test.ts`

**Interfaces:**
- `DashboardShell({header, sidebar, children, footer})` is presentation-only.
- `DashboardChrome` continues owning `usePathname`, `useRouter`, Firebase sign-out, `/api/admin/session` deletion, role navigation data and login-route bypass behavior.

- [ ] **Step 1: Add regression assertions protecting auth ownership**

```ts
test('presentation shell contains no authentication or production data access', () => {
  const shell = read('components/dashboard/DashboardShell.tsx');
  for (const forbidden of ['firebase/auth','getFirebaseAuth','/api/admin/session','prisma','DATABASE_URL']) {
    assert.doesNotMatch(shell, new RegExp(forbidden.replace('/', '\\/')));
  }
  const chrome = read('components/DashboardChrome.tsx');
  assert.match(chrome, /signOut/);
  assert.match(chrome, /\/api\/admin\/session/);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --import tsx --test tests/dashboard-visual-foundation.test.ts`
Expected: FAIL until `DashboardShell.tsx` exists.

- [ ] **Step 3: Implement `DashboardShell` and compose it from `DashboardChrome`**

Move only the structural wrapper (`dashShell`, `dashTop`, `dashFrame`, `dashSide`, `dashContent`, footer slots) into the new component. Do not move `logout()`, router calls, role navigation definitions or login-route checks.

- [ ] **Step 4: Run focused test and typecheck**

```bash
node --import tsx --test tests/dashboard-visual-foundation.test.ts
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/DashboardChrome.tsx components/dashboard/DashboardShell.tsx components/dashboard/index.ts tests/dashboard-visual-foundation.test.ts
git commit -m "refactor: extract presentation-only dashboard shell"
```

### Task 4: Adopt primitives in existing role overview without changing data

**Files:**
- Modify: `components/DashboardChrome.tsx`
- Modify: `components/RoleDashboardInsights.tsx`
- Modify: `app/dashboard-insights.css`
- Modify: `tests/dashboard-visual-foundation.test.ts`

**Interfaces:**
- Consumes the Task 2 primitives.
- Existing role insight data and links remain unchanged; only presentation composition changes.

- [ ] **Step 1: Add regression test for role coverage**

```ts
test('existing role dashboards remain represented', () => {
  const chrome = read('components/DashboardChrome.tsx');
  for (const role of ['patient','technician','admin']) assert.match(chrome, new RegExp(role));
  const insights = read('components/RoleDashboardInsights.tsx');
  assert.match(insights, /patient/);
  assert.match(insights, /technician/);
  assert.match(insights, /admin/);
});
```

- [ ] **Step 2: Run focused test before refactor**

Run: `node --import tsx --test tests/dashboard-visual-foundation.test.ts`
Expected: PASS, establishing the preservation baseline.

- [ ] **Step 3: Replace duplicated presentation wrappers with shared primitives**

Use `DashboardQuickAction` for current quick links and `DashboardPanel`/`DashboardStatCard` where existing insight structures map cleanly. Preserve every current href, label, role condition and operational value source. Do not add mockup numbers.

- [ ] **Step 4: Run focused test and typecheck**

```bash
node --import tsx --test tests/dashboard-visual-foundation.test.ts
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/DashboardChrome.tsx components/RoleDashboardInsights.tsx app/dashboard-insights.css tests/dashboard-visual-foundation.test.ts
git commit -m "refactor: apply shared dashboard visual primitives"
```

### Task 5: Full safe verification and unmerged Preview handoff

**Files:**
- Verify only; no Production files/data/config changes.

**Interfaces:**
- Produces exact feature-head SHA suitable for PR and Vercel Preview validation.

- [ ] **Step 1: Run focused regression**

```bash
node --import tsx --test tests/dashboard-visual-foundation.test.ts
```
Expected: exit 0.

- [ ] **Step 2: Run TypeScript validation**

```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 3: Run Vercel-safe application build**

```bash
npm run vercel-build
```
Expected: exit 0. Use `vercel-build`, not `build`, because repository `build` runs `prisma migrate deploy` and this phase must not apply database migrations.

- [ ] **Step 4: Inspect branch diff against baseline**

Run:
```bash
git diff --stat ef38cfc22378364651a2bc2fb762aee3ed35c165...HEAD
git diff --name-only ef38cfc22378364651a2bc2fb762aee3ed35c165...HEAD
```
Expected: only the design/plan docs, dashboard presentation components/CSS and focused regression test are changed.

- [ ] **Step 5: Push exact head and open an unmerged PR**

Record `git rev-parse HEAD`, push `feature/dashboard-visual-foundation`, and open a PR to `main`. Do not merge.

- [ ] **Step 6: Validate exact-head Vercel Preview**

Confirm the Preview corresponds to the recorded head SHA. Verify Patient/Admin/Technician dashboard presentation at desktop and mobile widths, existing login boundaries, no page-level horizontal overflow, visible focus states, and no fabricated operational values. Do not request Admin credentials; validate protected Admin behavior without bypassing authentication.

- [ ] **Step 7: Stop for explicit merge approval**

Report test/build results, exact head SHA, PR, Preview status and any visual issues. Production remains untouched until explicit approval.
