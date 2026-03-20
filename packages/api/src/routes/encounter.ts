import { jsonResponse, errorResponse, type Env } from '../index.js';
import { isValidUUID } from '../utils/matching.js';
import { calculateBattle, calculateExpGain } from '../utils/battle.js';

export async function handleEncounter(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const lobsterId = url.searchParams.get('lobster_id');

  if (!lobsterId || !isValidUUID(lobsterId)) return errorResponse('Invalid lobster_id');

  const pendingList = await env.BATTLES.list({ prefix: `pending:${lobsterId}:` });
  const results: unknown[] = [];

  for (const key of pendingList.keys) {
    const battleId = await env.BATTLES.get(key.name);
    if (!battleId) continue;

    const battleData = await env.BATTLES.get(`battle:${battleId}`);
    if (!battleData) continue;

    const battle = JSON.parse(battleData);
    if (battle.status === 'completed' && battle.result) {
      const isA = battle.lobster_a === lobsterId;
      const myResult = battle.result.winner === (isA ? 'a' : 'b') ? 'win'
        : battle.result.winner === 'draw' ? 'draw' : 'loss';

      results.push({
        battle_id: battle.battle_id,
        opponent_id: isA ? battle.lobster_b : battle.lobster_a,
        result: myResult,
        exp_gain: calculateExpGain(battle.result.winner_level || 1, battle.result.loser_level || 1, myResult),
        rounds: battle.result.total_rounds,
        rounds_log: battle.result.rounds_log,
        timestamp: battle.completed_at || battle.created_at,
      });

      await env.BATTLES.delete(key.name);
    }
  }

  return jsonResponse({ pending_results: results });
}

export async function handleResult(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const battle_id = body.battle_id as string;
  const lobster_id = body.lobster_id as string;
  const opponent_id = body.opponent_id as string;
  const battle_seed = body.battle_seed as string;
  const stats_snapshot = body.stats_snapshot as Record<string, number> | undefined;
  const opponent_stats = body.opponent_stats as Record<string, number> | undefined;

  if (!battle_id || !isValidUUID(battle_id)) return errorResponse('Invalid battle_id');
  if (!lobster_id || !isValidUUID(lobster_id)) return errorResponse('Invalid lobster_id');

  const battleData = await env.BATTLES.get(`battle:${battle_id}`);
  if (!battleData) return errorResponse('Battle not found', 404);

  const battle = JSON.parse(battleData);
  if (battle.status === 'completed') return errorResponse('Battle already resolved');
  if (battle.battle_seed !== battle_seed) return errorResponse('Battle seed mismatch');
  if (!stats_snapshot || !opponent_stats) return errorResponse('Missing stats for verification');

  const serverResult = calculateBattle(
    stats_snapshot as any,
    opponent_stats as any,
    battle_seed,
  );

  const isA = battle.lobster_a === lobster_id;
  const mappedWinner = serverResult.winner === 'a'
    ? (isA ? lobster_id : opponent_id)
    : serverResult.winner === 'b'
      ? (isA ? opponent_id : lobster_id)
      : 'draw';

  battle.status = 'completed';
  battle.result = {
    winner: serverResult.winner,
    winner_id: mappedWinner,
    loser: serverResult.loser,
    rounds_log: serverResult.rounds_log,
    total_rounds: serverResult.total_rounds,
    winner_level: isA
      ? (serverResult.winner === 'a' ? (stats_snapshot as any).level : (opponent_stats as any).level)
      : (serverResult.winner === 'a' ? (opponent_stats as any).level : (stats_snapshot as any).level),
    loser_level: isA
      ? (serverResult.winner === 'a' ? (opponent_stats as any).level : (stats_snapshot as any).level)
      : (serverResult.winner === 'a' ? (stats_snapshot as any).level : (opponent_stats as any).level),
  };
  battle.completed_at = new Date().toISOString();

  await env.BATTLES.put(`battle:${battle_id}`, JSON.stringify(battle), { expirationTtl: 3600 * 24 });

  if (mappedWinner !== 'draw') {
    await updateLeaderboard(env, mappedWinner, 'win');
    const loserId = mappedWinner === lobster_id ? opponent_id : lobster_id;
    await updateLeaderboard(env, loserId, 'loss');
  }

  const myResult = mappedWinner === lobster_id ? 'win' : mappedWinner === 'draw' ? 'draw' : 'loss';

  return jsonResponse({
    verified: true,
    battle_id,
    result: myResult,
    winner_id: mappedWinner,
    rounds: serverResult.total_rounds,
    rounds_log: serverResult.rounds_log,
    exp_gain: calculateExpGain((stats_snapshot as any).level || 1, (opponent_stats as any).level || 1, myResult),
  });
}

async function updateLeaderboard(env: Env, lobsterId: string, result: string): Promise<void> {
  const key = `lb:${lobsterId}`;
  const existing = await env.LEADERBOARD.get(key);
  const entry = existing ? JSON.parse(existing) : { id: lobsterId, name: 'Unknown', level: 1, wins: 0, losses: 0, color: 'common' };

  if (result === 'win') entry.wins++;
  else if (result === 'loss') entry.losses++;
  entry.updated_at = new Date().toISOString();

  await env.LEADERBOARD.put(key, JSON.stringify(entry));
}
