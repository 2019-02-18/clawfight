import { jsonResponse, errorResponse, type Env } from '../index.js';
import { isValidUUID } from '../utils/matching.js';

export async function handleLeaderboard(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const sortBy = url.searchParams.get('sort') || 'wins';
  const lobsterId = url.searchParams.get('lobster_id');

  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  if (lobsterId) {
    if (!isValidUUID(lobsterId)) return errorResponse('Invalid lobster_id');
    const data = await env.LEADERBOARD.get(`lb:${lobsterId}`);
    if (!data) return errorResponse('Lobster not found', 404);
    return jsonResponse({ lobster: JSON.parse(data) });
  }

  const listResult = await env.LEADERBOARD.list({ prefix: 'lb:' });
  const entries: Record<string, unknown>[] = [];

  for (const key of listResult.keys) {
    const data = await env.LEADERBOARD.get(key.name);
    if (!data) continue;
    entries.push(JSON.parse(data));
  }

  const sortFns: Record<string, (a: any, b: any) => number> = {
    wins: (a, b) => (b.wins || 0) !== (a.wins || 0) ? (b.wins || 0) - (a.wins || 0) : (a.losses || 0) - (b.losses || 0),
    level: (a, b) => (b.level || 1) - (a.level || 1),
    winrate: (a, b) => {
      const tA = (a.wins || 0) + (a.losses || 0), tB = (b.wins || 0) + (b.losses || 0);
      return (tB > 0 ? b.wins / tB : 0) - (tA > 0 ? a.wins / tA : 0);
    },
  };
  entries.sort(sortFns[sortBy] || sortFns.wins);

  const activeCount = entries.filter((e: any) => {
    if (!e.last_patrol) return false;
    return (Date.now() - new Date(e.last_patrol as string).getTime()) / 3600000 < 48;
  }).length;

  const rarityDistribution: Record<string, number> = {};
  for (const e of entries) {
    const r = (e as any).rarity || 'common';
    rarityDistribution[r] = (rarityDistribution[r] || 0) + 1;
  }

  const leaderboard = entries.slice(0, limit).map((e: any, idx) => ({
    rank: idx + 1,
    id: e.id,
    name: e.name || 'Unknown',
    level: e.level || 1,
    wins: e.wins || 0,
    losses: e.losses || 0,
    win_rate: ((e.wins || 0) + (e.losses || 0)) > 0
      ? Math.round(((e.wins || 0) / ((e.wins || 0) + (e.losses || 0))) * 100) : 0,
    streak: e.streak || 0,
    color: e.color || 'common',
    rarity: e.rarity || 'common',
    environment: e.environment || 'coastal',
  }));

  return jsonResponse({
    leaderboard,
    total_lobsters: entries.length,
    active_lobsters: activeCount,
    rarity_distribution: rarityDistribution,
    updated_at: new Date().toISOString(),
  });
}
