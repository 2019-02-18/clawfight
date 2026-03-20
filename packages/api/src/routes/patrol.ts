import { jsonResponse, errorResponse, type Env } from '../index.js';
import { isValidUUID, isValidHash, generateBattleSeed, matchLobster, estimatePoolSize, type LobsterEntry } from '../utils/matching.js';

export async function handlePatrol(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const lobster_id = body.lobster_id as string;
  const level = body.level as number;
  const stats_hash = body.stats_hash as string;
  const environment = body.environment as string;

  if (!lobster_id || !isValidUUID(lobster_id)) return errorResponse('Invalid lobster_id');
  if (typeof level !== 'number' || level < 1) return errorResponse('Invalid level');
  if (!stats_hash || !isValidHash(stats_hash)) return errorResponse('Invalid stats_hash');
  if (!environment || typeof environment !== 'string') return errorResponse('Invalid environment');

  const name = typeof body.name === 'string' && (body.name as string).length <= 30 ? body.name as string : 'Unknown';

  const lobsterEntry: LobsterEntry = {
    id: lobster_id,
    name,
    level,
    stats_hash,
    environment,
    color: (body.color as string) || 'common',
    rarity: (body.rarity as string) || 'common',
    wins: (body.wins as number) || 0,
    losses: (body.losses as number) || 0,
    streak: (body.streak as number) || 0,
    reputation: (body.reputation as number) || 0,
    is_molting: !!(body.is_molting),
    timestamp: (body.timestamp as string) || new Date().toISOString(),
    patrol_time: Date.now(),
  };

  await env.LOBBY.put(`lobby:${lobster_id}`, JSON.stringify(lobsterEntry), { expirationTtl: 3600 * 8 });
  await syncLeaderboard(env, lobsterEntry);

  const opponent = await matchLobster(lobsterEntry, env);

  if (!opponent) {
    const poolSize = await estimatePoolSize(environment, env);
    return jsonResponse({ encounter: false, pool_size: poolSize, message: 'patrol_ok' });
  }

  const battleSeed = generateBattleSeed();
  const battleId = crypto.randomUUID();

  await env.BATTLES.put(`battle:${battleId}`, JSON.stringify({
    battle_id: battleId,
    lobster_a: lobster_id,
    lobster_b: opponent.id,
    battle_seed: battleSeed,
    status: 'pending',
    created_at: new Date().toISOString(),
  }), { expirationTtl: 3600 * 24 });

  await env.BATTLES.put(`pending:${lobster_id}:${battleId}`, battleId, { expirationTtl: 3600 * 24 });
  await env.BATTLES.put(`pending:${opponent.id}:${battleId}`, battleId, { expirationTtl: 3600 * 24 });

  return jsonResponse({
    encounter: true,
    battle_id: battleId,
    opponent: {
      id: opponent.id,
      name: opponent.name || 'Unknown',
      level: opponent.level,
      stats_hash: opponent.stats_hash,
      color: opponent.color || 'common',
      environment: opponent.environment,
    },
    battle_seed: battleSeed,
    encounter_type: 'battle',
  });
}

async function syncLeaderboard(env: Env, lobster: LobsterEntry): Promise<void> {
  const key = `lb:${lobster.id}`;
  const existing = await env.LEADERBOARD.get(key);
  const entry = existing ? JSON.parse(existing) : { id: lobster.id, wins: 0, losses: 0 };

  entry.name = lobster.name;
  entry.level = lobster.level;
  entry.color = lobster.color;
  entry.rarity = lobster.rarity;
  entry.environment = lobster.environment;
  entry.streak = lobster.streak;
  entry.reputation = lobster.reputation;
  entry.last_patrol = new Date().toISOString();

  await env.LEADERBOARD.put(key, JSON.stringify(entry));
}
