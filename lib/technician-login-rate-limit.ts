import crypto from 'crypto';

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_SECONDS = Math.ceil(WINDOW_MS / 1000);
const IDENTITY_FAILURE_LIMIT = 5;
const IP_FAILURE_LIMIT = 30;
const MAX_BUCKETS = 5000;
const KEY_PREFIX = 'tg:technician-login:v1';

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

type LimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  backend: 'distributed' | 'memory';
};

type FailureResult = {
  locked: boolean;
  retryAfterSeconds: number;
  backend: 'distributed' | 'memory';
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

function distributedConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

function distributedKey(kind: 'identity' | 'ip', hashValue: string) {
  return `${KEY_PREFIX}:${kind}:${hashValue}`;
}

async function redisPipeline(commands: Array<Array<string | number>>) {
  const config = distributedConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Distributed rate-limit backend returned ${response.status}.`);
  const payload = await response.json() as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(payload) || payload.some((item) => item?.error)) {
    throw new Error('Distributed rate-limit backend returned an invalid response.');
  }
  return payload.map((item) => item.result);
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

function memoryCheck(identity: string, ip: string, now: number): LimitResult {
  cleanup(state.identity, now);
  cleanup(state.ip, now);

  const identityBucket = getBucket(state.identity, identityKey(identity), now);
  const ipBucket = getBucket(state.ip, ipKey(ip), now);
  const retryAfter = Math.max(
    identityBucket.lockedUntil > now ? retryAfterSeconds(identityBucket, now) : 0,
    ipBucket.lockedUntil > now ? retryAfterSeconds(ipBucket, now) : 0,
  );

  return { allowed: retryAfter === 0, retryAfterSeconds: retryAfter, backend: 'memory' };
}

function memoryRecord(map: Map<string, Bucket>, key: string, limit: number, now: number) {
  const bucket = getBucket(map, key, now);
  bucket.failures += 1;
  bucket.lastSeenAt = now;
  if (bucket.failures >= limit) bucket.lockedUntil = Math.max(bucket.lockedUntil, now + LOCK_MS);
  return bucket;
}

function memoryFailure(identity: string, ip: string, now: number): FailureResult {
  const identityBucket = memoryRecord(state.identity, identityKey(identity), IDENTITY_FAILURE_LIMIT, now);
  const ipBucket = memoryRecord(state.ip, ipKey(ip), IP_FAILURE_LIMIT, now);
  const retryAfter = Math.max(
    identityBucket.lockedUntil > now ? retryAfterSeconds(identityBucket, now) : 0,
    ipBucket.lockedUntil > now ? retryAfterSeconds(ipBucket, now) : 0,
  );
  return { locked: retryAfter > 0, retryAfterSeconds: retryAfter, backend: 'memory' };
}

function numberResult(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function distributedCheck(identity: string, ip: string): Promise<LimitResult | null> {
  if (!distributedConfig()) return null;
  const idKey = distributedKey('identity', identityKey(identity));
  const clientKey = distributedKey('ip', ipKey(ip));
  const results = await redisPipeline([
    ['GET', idKey], ['TTL', idKey], ['GET', clientKey], ['TTL', clientKey],
  ]);
  if (!results) return null;

  const identityFailures = numberResult(results[0]);
  const identityTtl = Math.max(0, numberResult(results[1]));
  const ipFailures = numberResult(results[2]);
  const ipTtl = Math.max(0, numberResult(results[3]));
  const identityLocked = identityFailures >= IDENTITY_FAILURE_LIMIT;
  const ipLocked = ipFailures >= IP_FAILURE_LIMIT;
  const retryAfter = Math.max(identityLocked ? identityTtl : 0, ipLocked ? ipTtl : 0);
  return { allowed: !identityLocked && !ipLocked, retryAfterSeconds: retryAfter, backend: 'distributed' };
}

async function distributedFailure(identity: string, ip: string): Promise<FailureResult | null> {
  if (!distributedConfig()) return null;
  const idKey = distributedKey('identity', identityKey(identity));
  const clientKey = distributedKey('ip', ipKey(ip));
  const results = await redisPipeline([
    ['INCR', idKey], ['EXPIRE', idKey, WINDOW_SECONDS, 'NX'], ['TTL', idKey],
    ['INCR', clientKey], ['EXPIRE', clientKey, WINDOW_SECONDS, 'NX'], ['TTL', clientKey],
  ]);
  if (!results) return null;

  const identityFailures = numberResult(results[0]);
  const identityTtl = Math.max(1, numberResult(results[2]));
  const ipFailures = numberResult(results[3]);
  const ipTtl = Math.max(1, numberResult(results[5]));
  const identityLocked = identityFailures >= IDENTITY_FAILURE_LIMIT;
  const ipLocked = ipFailures >= IP_FAILURE_LIMIT;
  const retryAfter = Math.max(identityLocked ? identityTtl : 0, ipLocked ? ipTtl : 0);
  return { locked: identityLocked || ipLocked, retryAfterSeconds: retryAfter, backend: 'distributed' };
}

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  return (forwarded || real || 'unknown').slice(0, 120);
}

export async function checkTechnicianLoginRateLimit(identity: string, ip: string, now = Date.now()): Promise<LimitResult> {
  try {
    const distributed = await distributedCheck(identity, ip);
    if (distributed) return distributed;
  } catch (error) {
    console.error('Distributed technician login rate-limit check failed; using memory fallback.', error);
  }
  return memoryCheck(identity, ip, now);
}

export async function recordTechnicianLoginFailure(identity: string, ip: string, now = Date.now()): Promise<FailureResult> {
  try {
    const distributed = await distributedFailure(identity, ip);
    if (distributed) return distributed;
  } catch (error) {
    console.error('Distributed technician login rate-limit update failed; using memory fallback.', error);
  }
  return memoryFailure(identity, ip, now);
}

export async function resetTechnicianLoginFailures(identity: string) {
  const config = distributedConfig();
  if (config) {
    try {
      await redisPipeline([['DEL', distributedKey('identity', identityKey(identity))]]);
    } catch (error) {
      console.error('Distributed technician login rate-limit reset failed.', error);
    }
  }
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
  distributedEnv: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const,
};
