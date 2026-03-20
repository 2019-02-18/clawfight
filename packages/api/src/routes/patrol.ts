import { jsonResponse, errorResponse, type Env } from '../index.js';
import { isValidUUID, isValidHash, generateBattleSeed, matchLobster, estimatePoolSize, type LobsterEntry } from '../utils/matching.js';
import { calculateBattle, calculateExpGain } from '../utils/battle.js';

const PATROL_COOLDOWN_SEC = 30 * 60;

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
  const stats = body.stats as Record<string, number> | undefined;

  if (!lobster_id || !isValidUUID(lobster_id)) return errorResponse('Invalid lobster_id');
  if (typeof level !== 'number' || level < 1) return errorResponse('Invalid level');
  if (!stats_hash || !isValidHash(stats_hash)) return errorResponse('Invalid stats_hash');
  if (!environment || typeof environment !== 'string') return errorResponse('Invalid environment');

  const cooldownKey = `cd:${lobster_id}`;
  const lastCd = await env.LOBBY.get(cooldownKey);
  if (lastCd) {
    return jsonResponse({ encounter: false, pool_size: 0, message: 'patrol_cooldown', cooldown_remaining: PATROL_COOLDOWN_SEC });
  }

  const name = typeof body.name === 'string' && (body.name as string).length <= 30 ? body.name as string : 'Unknown';

  const lobsterEntry: LobsterEntry = {
    id: lobster_id,
    name,
    level,
    stats_hash,
    stats: stats as any,
    environment,
    color: (body.color as string) || 'common',
    rarity: (body.rarity as string) || 'common',
    is_molting: !!(body.is_molting),
    timestamp: (body.timestamp as string) || new Date().toISOString(),
    patrol_time: Date.now(),
  };

  await env.LOBBY.put(`lobby:${lobster_id}`, JSON.stringify(lobsterEntry), { expirationTtl: 3600 * 8 });
  await env.LOBBY.put(`code:${lobster_id.slice(0, 8)}`, lobster_id, { expirationTtl: 3600 * 8 });
  await env.LOBBY.put(cooldownKey, '1', { expirationTtl: PATROL_COOLDOWN_SEC });
  await syncLeaderboard(env, lobsterEntry);

  const opponent = await matchLobster(lobsterEntry, env);

  if (!opponent) {
    const poolSize = await estimatePoolSize(environment, env);
    return jsonResponse({ encounter: false, pool_size: poolSize, message: 'patrol_ok' });
  }

  if (!lobsterEntry.stats || !opponent.stats) {
    return jsonResponse({ encounter: false, pool_size: 1, message: 'patrol_ok_no_stats' });
  }

  const battleSeed = generateBattleSeed();
  const serverResult = calculateBattle(lobsterEntry.stats as any, opponent.stats as any, battleSeed);

  const winnerId = serverResult.winner === 'a' ? lobster_id
    : serverResult.winner === 'b' ? opponent.id
    : 'draw';

  if (winnerId !== 'draw') {
    const loserId = winnerId === lobster_id ? opponent.id : lobster_id;
    await updateLeaderboard(env, winnerId, 'win');
    await updateLeaderboard(env, loserId, 'loss');
  }

  const myResult = winnerId === lobster_id ? 'win' : winnerId === 'draw' ? 'draw' : 'loss';
  const expGain = calculateExpGain(
    myResult === 'win' ? level : opponent.level,
    myResult === 'win' ? opponent.level : level,
    myResult,
  );

  return jsonResponse({
    encounter: true,
    battle_id: crypto.randomUUID(),
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
    battle_result: {
      result: myResult,
      winner_id: winnerId,
      rounds: serverResult.total_rounds,
      rounds_log: serverResult.rounds_log,
      exp_gain: expGain,
    },
  });
}

async function syncLeaderboard(env: Env, lobster: LobsterEntry): Promise<void> {
  const key = `lb:${lobster.id}`;
  const existing = await env.LEADERBOARD.get(key);
  const entry = existing ? JSON.parse(existing) : { id: lobster.id, wins: 0, losses: 0, streak: 0 };

  entry.name = lobster.name;
  entry.level = lobster.level;
  entry.color = lobster.color;
  entry.rarity = lobster.rarity;
  entry.environment = lobster.environment;
  entry.last_patrol = new Date().toISOString();

  await env.LEADERBOARD.put(key, JSON.stringify(entry));
}

async function updateLeaderboard(env: Env, lobsterId: string, result: string): Promise<void> {
  const key = `lb:${lobsterId}`;
  const existing = await env.LEADERBOARD.get(key);
  const entry = existing ? JSON.parse(existing) : { id: lobsterId, name: 'Unknown', level: 1, wins: 0, losses: 0, streak: 0 };

  if (result === 'win') {
    entry.wins = (entry.wins || 0) + 1;
    entry.streak = Math.max(0, entry.streak || 0) + 1;
  } else if (result === 'loss') {
    entry.losses = (entry.losses || 0) + 1;
    entry.streak = Math.min(0, entry.streak || 0) - 1;
  }
  entry.updated_at = new Date().toISOString();

  await env.LEADERBOARD.put(key, JSON.stringify(entry));
}
