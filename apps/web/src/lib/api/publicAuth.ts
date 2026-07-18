import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiError, isUuid } from './core';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

const RATE_LIMIT = 150;
const RATE_WINDOW_MS = 60_000;
const LOCAL_DEVELOPMENT_KEY = 'ps_live_local_development_key';
const LOCAL_DEVELOPMENT_COMPANY_ID = '00000000-0000-4000-8000-000000000001';

interface RateWindow {
  count: number;
  resetAt: number;
}

export interface PublicApiAuth {
  companyId: string;
  rateLimit: { limit: number; remaining: number; reset: number };
}

interface ConfiguredKey {
  companyId: string;
  key: string;
}

const rateWindows = new Map<string, RateWindow>();

function configuredKeys(): ConfiguredKey[] {
  const entries = process.env.PROGRAMA_SASS_API_KEYS
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries?.length) {
    return entries.flatMap((entry) => {
      const separator = entry.indexOf(':');
      if (separator < 0) return [];
      const companyId = entry.slice(0, separator);
      const key = entry.slice(separator + 1);
      return isUuid(companyId) && key.startsWith('ps_live_') ? [{ companyId, key }] : [];
    });
  }
  return process.env.NODE_ENV === 'production'
    ? []
    : [{ companyId: LOCAL_DEVELOPMENT_COMPANY_ID, key: LOCAL_DEVELOPMENT_KEY }];
}

function tokenMatches(token: string, expected: string): boolean {
  const tokenHash = createHash('sha256').update(token).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(tokenHash, expectedHash);
}

async function resolveCompanyId(token: string, keyHash: string): Promise<string> {
  const configuredKey = configuredKeys().find((entry) => tokenMatches(token, entry.key));
  if (configuredKey) return configuredKey.companyId;

  if (isServerSupabaseAdminConfigured) {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase
      .from('company_api_keys')
      .select('company_id, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new ApiError(503, 'No se pudo validar la clave de integracion.', 'API_AUTH_UNAVAILABLE');
    }
    if (data?.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      throw new ApiError(401, 'La clave de integracion expiro.', 'UNAUTHORIZED');
    }
    if (data?.company_id && isUuid(data.company_id)) return data.company_id;
  }

  if (process.env.NODE_ENV === 'production' && !isServerSupabaseAdminConfigured && !configuredKeys().length) {
    throw new ApiError(503, 'La autenticacion de la API publica no esta configurada.', 'API_AUTH_NOT_CONFIGURED');
  }
  throw new ApiError(401, 'Token invalido.', 'UNAUTHORIZED');
}

function consumeLocalRateLimit(keyId: string, now: number): PublicApiAuth['rateLimit'] {
  const previous = rateWindows.get(keyId);
  const window = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + RATE_WINDOW_MS }
    : previous;

  if (window.count >= RATE_LIMIT) {
    throw new ApiError(429, 'Se alcanzo el limite de solicitudes. Intente nuevamente en un minuto.', 'RATE_LIMITED');
  }

  window.count += 1;
  rateWindows.set(keyId, window);
  return {
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - window.count,
    reset: Math.ceil(window.resetAt / 1000),
  };
}

export async function consumePublicRateLimit(keyHash: string): Promise<PublicApiAuth['rateLimit']> {
  if (isServerSupabaseAdminConfigured) {
    const supabase = createAdminServerClient();
    const { data, error } = await supabase.rpc('consume_public_api_rate_limit', {
      p_key_hash: keyHash,
      p_limit: RATE_LIMIT,
      p_window_seconds: Math.ceil(RATE_WINDOW_MS / 1000),
    });

    if (!error && Array.isArray(data) && data[0]) {
      const result = data[0] as { allowed: boolean; remaining: number; reset_at: string };
      if (!result.allowed) {
        throw new ApiError(429, 'Se alcanzo el limite de solicitudes. Intente nuevamente mas tarde.', 'RATE_LIMITED');
      }
      return {
        limit: RATE_LIMIT,
        remaining: Number(result.remaining),
        reset: Math.ceil(new Date(result.reset_at).getTime() / 1000),
      };
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(503, 'El control de trafico no esta disponible.', 'RATE_LIMIT_UNAVAILABLE');
    }
  }

  return consumeLocalRateLimit(keyHash, Date.now());
}

export async function validatePublicApiRequest(request: Request): Promise<PublicApiAuth> {
  const match = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i);
  if (!match) throw new ApiError(401, 'Acceso no autorizado. Token inexistente.', 'UNAUTHORIZED');

  const token = match[1];
  if (!token.startsWith('ps_live_')) throw new ApiError(401, 'Token invalido.', 'UNAUTHORIZED');

  const keyHash = createHash('sha256').update(token).digest('hex');
  const companyId = await resolveCompanyId(token, keyHash);
  const rateLimit = await consumePublicRateLimit(keyHash);
  return { companyId, rateLimit };
}

export function publicApiHeaders(auth: PublicApiAuth): Headers {
  return new Headers({
    'X-RateLimit-Limit': String(auth.rateLimit.limit),
    'X-RateLimit-Remaining': String(auth.rateLimit.remaining),
    'X-RateLimit-Reset': String(auth.rateLimit.reset),
  });
}

export function publicRateLimitHeaders(rateLimit: PublicApiAuth['rateLimit']): Headers {
  return new Headers({
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.reset),
  });
}

export const DEVELOPMENT_API_KEY = LOCAL_DEVELOPMENT_KEY;
