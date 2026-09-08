import crypto from 'crypto';

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const IDENTITY_FAILURE_LIMIT = 5;
const IP_FAILURE_LIMIT = 30;
const MAX_BUCKETS = 5000;

type Bucket = {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
  lastSeenAt: number;
};

type RateLimitState = {
  identity: Map<string, Bucket>;
  ip: Map<string, Bucket>;
};

declare global {
  // eslint-disable-next-line no-var
  var __tgTechnicianLoginRateLimit: RateLimitState | undefined;
}

const state: RateLimitState = globalThis.__tgTechnicianLoginRateLimit || {
  identity: new Map<string, Bucket>(),
  ip: new Map<string, Bucket>(),
};
globalThis.__tgTechnicianLoginRateLimit = state;

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function identityKey(identity: string) {
  return hash(identity.trim().toLowerCase().slice(0, 120));
}

function ipKey(ip: string) {
  return hash((ip || 'unknown').trim().slice(0, 120));
}

function cleanup(map: Map<string, Bucket>, now: number) {
  for (const [key, bucket] of map) {
    if (bucket.lockedUntil <= now && now - bucket.lastSeenAt > WINDOW_MS * 2) map.delete(key);
  }
  if (map.size <= MAX_BUCKETS) return;
  const oldest = [...map.entries()].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
  for (let i = 0; i < map.size - MAX_BUCKETS; i += 1) map.delete(oldest[i][0]);
}

function getBucket(map: Map<string, Bucket>, key: string, now: number): Bucket {
  const existing = map.get(key);
  if (!existing || (existing.lockedUntil <= now && now - existing.windowStartedAt >= WINDOW_MS)) {
    const fresh = { failures: 0, windowStartedAt: now, lockedUntil: 0, lastSeenAt: now };
    map.set(key, fresh);
    return fresh;
  }
  existing.lastSeenAt = now;
  return existing;
}

function retryAfterSeconds(bucket: Bucket, now: number) {
  return Math.max(1, Math.ceil((bucket.lockedUntil - now) / 1000));
}

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  return (forwarded || real || 'unknown').slice(0, 120);
}

export function checkTechnicianLoginRateLimit(identity: string, ip: string, now = Date.now()) {
  cleanup(state.identity, now);
  cleanup(state.ip, now);

  const identityBucket = getBucket(state.identity, identityKey(identity), now);
  const ipBucket = getBucket(state.ip, ipKey(ip), now);
  const retryAfter = Math.max(
    identityBucket.lockedUntil > now ? retryAfterSeconds(identityBucket, now) : 0,
    ipBucket.lockedUntil > now ? retryAfterSeconds(ipBucket, now) : 0,
  );

  return { allowed: retryAfter === 0, retryAfterSeconds: retryAfter };
}

function record(map: Map<string, Bucket>, key: string, limit: number, now: number) {
  const bucket = getBucket(map, key, now);
  bucket.failures += 1;
  bucket.lastSeenAt = now;
  if (bucket.failures >= limit) bucket.lockedUntil = Math.max(bucket.lockedUntil, now + LOCK_MS);
  return bucket;
}

export function recordTechnicianLoginFailure(identity: string, ip: string, now = Date.now()) {
  const identityBucket = record(state.identity, identityKey(identity), IDENTITY_FAILURE_LIMIT, now);
  const ipBucket = record(state.ip, ipKey(ip), IP_FAILURE_LIMIT, now);
  const retryAfter = Math.max(
    identityBucket.lockedUntil > now ? retryAfterSeconds(identityBucket, now) : 0,
    ipBucket.lockedUntil > now ? retryAfterSeconds(ipBucket, now) : 0,
  );
  return { locked: retryAfter > 0, retryAfterSeconds: retryAfter };
}

export function resetTechnicianLoginFailures(identity: string) {
  state.identity.delete(identityKey(identity));
}

export function __resetTechnicianLoginRateLimitForTests() {
  state.identity.clear();
  state.ip.clear();
}

export const technicianLoginRateLimitPolicy = {
  windowMs: WINDOW_MS,
  lockMs: LOCK_MS,
  identityFailureLimit: IDENTITY_FAILURE_LIMIT,
  ipFailureLimit: IP_FAILURE_LIMIT,
};
