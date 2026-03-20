import type { PatrolResponse, LeaderboardResponse, Lobster } from './types.js';
import { createHash } from 'node:crypto';

const API_BASE = 'https://api.clawfight.online';

function statsHash(lobster: Lobster): string {
  const raw = JSON.stringify(lobster.stats);
  return createHash('sha256').update(raw).digest('hex');
}

export async function apiPatrol(lobster: Lobster): Promise<PatrolResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/patrol`, {
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
    const res = await fetch(`${API_BASE}/api/result`, {
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
    const res = await fetch(`${API_BASE}/api/leaderboard?limit=${limit}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}
