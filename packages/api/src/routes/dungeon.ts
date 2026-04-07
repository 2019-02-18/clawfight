import { jsonResponse, errorResponse, type Env } from '../index.js';
import { isValidUUID } from '../utils/matching.js';
import {
  generateDungeon, resolveChoice, currentRoomView,
  type DungeonState, type Stats, type Soul,
} from '../utils/dungeon.js';

const DUNGEON_TTL = 86400; // 24h

export async function handleDungeonEnter(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const lobsterId = body.lobster_id as string;
  if (!lobsterId || !isValidUUID(lobsterId)) return errorResponse('Invalid lobster_id');

  const stats = body.stats as Stats;
  const soul = body.soul as Soul;
  const depth = (body.depth as number) || 0;
  const level = (body.level as number) || 1;
  const environment = (body.environment as string) || 'coastal';
  const theme = body.theme as string | undefined;

  if (!stats || !soul) return errorResponse('Missing stats or soul');

  const activeKey = `active:${lobsterId}`;
  const existing = await env.DUNGEONS.get(activeKey);
  if (existing) {
    return errorResponse('Active dungeon exists. Complete or abandon it first.');
  }

  const state = generateDungeon(lobsterId, stats, soul, depth, level, environment, theme);

  await env.DUNGEONS.put(`dungeon:${state.dungeon_id}`, JSON.stringify(state), { expirationTtl: DUNGEON_TTL });
  await env.DUNGEONS.put(activeKey, state.dungeon_id, { expirationTtl: DUNGEON_TTL });

  const room = currentRoomView(state);

  return jsonResponse({
    dungeon_id: state.dungeon_id,
    theme: state.theme,
    total_rooms: state.total_rooms,
    hp: state.hp,
    room,
  });
}

export async function handleDungeonAct(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const dungeonId = body.dungeon_id as string;
  const lobsterId = body.lobster_id as string;
  const choice = body.choice as number;

  if (!dungeonId || !lobsterId) return errorResponse('Missing dungeon_id or lobster_id');
  if (choice !== 1 && choice !== 2) return errorResponse('Choice must be 1 or 2');

  const data = await env.DUNGEONS.get(`dungeon:${dungeonId}`);
  if (!data) return errorResponse('Dungeon not found or expired');

  const state: DungeonState = JSON.parse(data);
  if (state.lobster_id !== lobsterId) return errorResponse('Lobster mismatch');
  if (state.status !== 'active') return errorResponse(`Dungeon already ${state.status}`);

  const outcome = resolveChoice(state, choice as 1 | 2);

  await env.DUNGEONS.put(`dungeon:${dungeonId}`, JSON.stringify(state), { expirationTtl: DUNGEON_TTL });

  if (state.status !== 'active') {
    await env.DUNGEONS.delete(`active:${lobsterId}`);
  }

  const nextRoom = state.status === 'active' ? currentRoomView(state) : null;

  return jsonResponse({
    outcome: {
      success: outcome.success,
      key: outcome.key,
      damage_taken: outcome.damage_taken,
      hp_healed: outcome.hp_healed,
      exp_gained: outcome.exp_gained,
      loot: outcome.loot,
      soul_activated: outcome.soul_activated,
    },
    hp: state.hp,
    status: state.status,
    next_room: nextRoom,
    rewards: state.status !== 'active' ? {
      total_exp: state.exp_collected,
      loot: state.loot_collected,
      completed: state.status === 'completed',
    } : undefined,
  });
}

export async function handleDungeonState(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const lobsterId = url.searchParams.get('lobster_id');
  if (!lobsterId || !isValidUUID(lobsterId)) return errorResponse('Invalid lobster_id');

  const activeId = await env.DUNGEONS.get(`active:${lobsterId}`);
  if (!activeId) {
    return jsonResponse({ active: false });
  }

  const data = await env.DUNGEONS.get(`dungeon:${activeId}`);
  if (!data) {
    await env.DUNGEONS.delete(`active:${lobsterId}`);
    return jsonResponse({ active: false });
  }

  const state: DungeonState = JSON.parse(data);
  const room = currentRoomView(state);

  return jsonResponse({
    active: true,
    dungeon_id: state.dungeon_id,
    theme: state.theme,
    total_rooms: state.total_rooms,
    current_room: state.current_room,
    hp: state.hp,
    status: state.status,
    room,
    loot_so_far: state.loot_collected.length,
    exp_so_far: state.exp_collected,
  });
}

export async function handleDungeonAbandon(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const lobsterId = body.lobster_id as string;
  if (!lobsterId || !isValidUUID(lobsterId)) return errorResponse('Invalid lobster_id');

  const activeId = await env.DUNGEONS.get(`active:${lobsterId}`);
  if (!activeId) return errorResponse('No active dungeon');

  const data = await env.DUNGEONS.get(`dungeon:${activeId}`);
  if (!data) {
    await env.DUNGEONS.delete(`active:${lobsterId}`);
    return errorResponse('Dungeon data expired');
  }

  const state: DungeonState = JSON.parse(data);
  state.status = 'abandoned';
  await env.DUNGEONS.put(`dungeon:${activeId}`, JSON.stringify(state), { expirationTtl: DUNGEON_TTL });
  await env.DUNGEONS.delete(`active:${lobsterId}`);

  const partialLoot = state.loot_collected;
  const partialExp = Math.floor(state.exp_collected * 0.5);

  return jsonResponse({
    status: 'abandoned',
    partial_exp: partialExp,
    partial_loot: partialLoot,
  });
}
