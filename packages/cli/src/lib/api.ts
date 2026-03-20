import type { PatrolResponse, LeaderboardResponse, Lobster } from './types.js';
import { createHash } from 'node:crypto';

const API_BASE = 'https://api.clawfight.online';

function statsHash(lobster: Lobster): string {
  const raw = JSON.stringify(lobster.stats);
  return createHash('sha256').update(raw).digest('hex');
}

function getProxyUrl(): string | null {
  return process.env.https_proxy
    || process.env.HTTPS_PROXY
    || process.env.http_proxy
    || process.env.HTTP_PROXY
    || null;
}

type SimpleFetch = (url: string, init?: RequestInit) => Promise<Response>;

let _cachedFetch: SimpleFetch | null = null;

async function getProxiedFetch(): Promise<SimpleFetch> {
  if (_cachedFetch) return _cachedFetch;

  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    _cachedFetch = globalThis.fetch;
    return _cachedFetch;
  }

  try {
    const undici = await import('undici');
    const agent = new undici.ProxyAgent(proxyUrl);
    const undiciFetch = undici.fetch;
    _cachedFetch = ((url: string, init?: any) =>
      undiciFetch(url, { ...init, dispatcher: agent })) as unknown as SimpleFetch;
    return _cachedFetch;
  } catch {
    _cachedFetch = globalThis.fetch;
    return _cachedFetch;
  }
}

export async function apiPatrol(lobster: Lobster): Promise<PatrolResponse | null> {
  try {
    const pfetch = await getProxiedFetch();
    const res = await pfetch(`${API_BASE}/api/patrol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        lobster_id: lobster.id,
        level: lobster.level,
        stats_hash: statsHash(lobster),
        environment: lobster.environment,
        name: lobster.name,
        color: lobster.rarity,
        rarity: lobster.rarity,
        wins: lobster.wins,
        losses: lobster.losses,
        streak: lobster.streak,
        reputation: lobster.reputation,
        is_molting: lobster.status === 'molting',
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as PatrolResponse;
  } catch {
    return null;
  }
}

export async function apiReportResult(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const pfetch = await getProxiedFetch();
    const res = await pfetch(`${API_BASE}/api/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function apiLeaderboard(limit = 20): Promise<LeaderboardResponse | null> {
  try {
    const pfetch = await getProxiedFetch();
    const res = await pfetch(`${API_BASE}/api/leaderboard?limit=${limit}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}
