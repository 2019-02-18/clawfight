import { jsonResponse, errorResponse, type Env } from '../index.js';
import { isValidUUID, generateBattleSeed, type LobsterEntry } from '../utils/matching.js';
import { calculateBattle, calculateExpGain } from '../utils/battle.js';

const BATTLE_COOLDOWN_SEC = 10 * 60;

export async function handleBattle(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const challenger_id = body.challenger_id as string;
  const opponent_code = body.opponent_code as string;

  if (!challenger_id || !isValidUUID(challenger_id)) return errorResponse('Invalid challenger_id');
  if (!opponent_code || typeof opponent_code !== 'string' || opponent_code.length < 6) return errorResponse('Invalid opponent_code');

  const battleCdKey = `bcd:${challenger_id}`;
  const lastBattle = await env.LOBBY.get(battleCdKey);
  if (lastBattle) {
    return errorResponse('Battle cooldown active, wait 10 minutes between battles');
  }

  const challengerData = await env.LOBBY.get(`lobby:${challenger_id}`);
  if (!challengerData) return errorResponse('Challenger not found in lobby. Patrol first.');

  const opponent_full_id = await env.LOBBY.get(`code:${opponent_code}`);
  if (!opponent_full_id) return errorResponse('Opponent not found. They need to have patrolled recently.');
  if (opponent_full_id === challenger_id) return errorResponse('Cannot battle yourself');

  const opponentData = await env.LOBBY.get(`lobby:${opponent_full_id}`);
  if (!opponentData) return errorResponse('Opponent lobby data expired');

  const challenger: LobsterEntry = JSON.parse(challengerData);
  const opponent: LobsterEntry = JSON.parse(opponentData);

  if (!challenger.stats || !opponent.stats) {
    return errorResponse('Stats not available for battle calculation');
  }

  const battleSeed = generateBattleSeed();
  const serverResult = calculateBattle(challenger.stats as any, opponent.stats as any, battleSeed);

  const winnerId = serverResult.winner === 'a' ? challenger_id
    : serverResult.winner === 'b' ? opponent_full_id
    : 'draw';

  if (winnerId !== 'draw') {
    const loserId = winnerId === challenger_id ? opponent_full_id : challenger_id;
    await updateLeaderboard(env, winnerId, 'win');
    await updateLeaderboard(env, loserId, 'loss');
  }

  await env.LOBBY.put(battleCdKey, '1', { expirationTtl: BATTLE_COOLDOWN_SEC });

  const myResult = winnerId === challenger_id ? 'win' : winnerId === 'draw' ? 'draw' : 'loss';
  const expGain = calculateExpGain(
    myResult === 'win' ? challenger.level : opponent.level,
    myResult === 'win' ? opponent.level : challenger.level,
    myResult,
  );

  return jsonResponse({
    battle_id: crypto.randomUUID(),
    result: myResult,
    winner_id: winnerId,
    opponent: {
      id: opponent_full_id,
      name: opponent.name,
      level: opponent.level,
      code: opponent_full_id.slice(0, 8),
    },
    rounds: serverResult.total_rounds,
    rounds_log: serverResult.rounds_log,
    exp_gain: expGain,
    battle_seed: battleSeed,
  });
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
