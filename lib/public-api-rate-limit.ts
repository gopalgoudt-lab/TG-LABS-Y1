import crypto from 'crypto';

type Rule = { limit: number; windowSeconds: number };
type LimitResult = { allowed: boolean; retryAfterSeconds: number; backendUnavailable?: boolean };

const PREFIX = 'tg:public-api:v2';
const memory = new Map<string, { count: number; resetAt: number }>();

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function requestIp(request: Request) {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelForwarded) return vercelForwarded;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

async function redisLimit(key: string, rule: Rule, config: { url: string; token: string }): Promise<LimitResult> {
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, rule.windowSeconds, 'NX'], ['TTL', key]]),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('RATE_LIMIT_BACKEND');
  const data = await response.json() as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(data) || data.some((entry) => entry.error)) throw new Error('RATE_LIMIT_BACKEND');
  return {
    allowed: Number(data[0]?.result || 0) <= rule.limit,
    retryAfterSeconds: Math.max(1, Number(data[2]?.result || rule.windowSeconds)),
  };
}

function localLimit(key: string, rule: Rule): LimitResult {
  const now = Date.now();
  const previous = memory.get(key);
  const bucket = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + rule.windowSeconds * 1000 }
    : previous;
  bucket.count += 1;
  memory.set(key, bucket);
  if (memory.size > 5000) {
    for (const [candidate, value] of memory) if (value.resetAt <= now) memory.delete(candidate);
  }
  return {
    allowed: bucket.count <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export async function enforceApiRateLimit(request: Request, scope: string, identity: string, rule: Rule): Promise<LimitResult> {
  const key = `${PREFIX}:${scope}:${hash(identity)}`;
  const config = redisConfig();
  if (!config) return localLimit(key, rule);
  try {
    return await redisLimit(key, rule, config);
  } catch {
    return { allowed: false, retryAfterSeconds: 5, backendUnavailable: true };
  }
}

export function rateLimitResponse(result: LimitResult) {
  const unavailable = result.backendUnavailable === true;
  return new Response(JSON.stringify({
    error: unavailable
      ? 'Request protection is temporarily unavailable. Please try again shortly.'
      : 'Too many requests. Please try again shortly.',
  }), {
    status: unavailable ? 503 : 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
      'Cache-Control': 'no-store',
    },
  });
}
