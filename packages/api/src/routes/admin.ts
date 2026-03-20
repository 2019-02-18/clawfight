import { jsonResponse, errorResponse, type Env } from '../index.js';

function checkAuth(request: Request, env: Env): boolean {
  const key = request.headers.get('X-Admin-Key');
  return !!key && key === (env as any).ADMIN_KEY;
}

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  if (!checkAuth(request, env)) {
    return errorResponse('Unauthorized', 401);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/admin', '');

  if (path === '/leaderboard' && request.method === 'GET') {
    return await getFullLeaderboard(env);
  }
  if (path === '/lobby' && request.method === 'GET') {
    return await getLobby(env);
  }
  if (path === '/stats' && request.method === 'GET') {
    return await getStats(env);
  }
  if (path.startsWith('/lobster/') && request.method === 'DELETE') {
    const lobsterId = path.replace('/lobster/', '');
    return await deleteLobster(env, lobsterId);
  }
  if (path.startsWith('/lobster/') && request.method === 'PATCH') {
    const lobsterId = path.replace('/lobster/', '');
    return await updateLobster(request, env, lobsterId);
  }
  if (path === '/cooldown' && request.method === 'DELETE') {
    const lobsterId = url.searchParams.get('lobster_id');
    if (!lobsterId) return errorResponse('lobster_id required');
    return await clearCooldown(env, lobsterId);
  }

  return errorResponse('Admin endpoint not found', 404);
}

async function getFullLeaderboard(env: Env): Promise<Response> {
  const listResult = await env.LEADERBOARD.list({ prefix: 'lb:' });
  const entries: Record<string, unknown>[] = [];

  for (const key of listResult.keys) {
    const data = await env.LEADERBOARD.get(key.name);
    if (!data) continue;
    entries.push(JSON.parse(data));
  }

  entries.sort((a: any, b: any) => (b.wins || 0) - (a.wins || 0));

  return jsonResponse({ entries, total: entries.length });
}

async function getLobby(env: Env): Promise<Response> {
  const listResult = await env.LOBBY.list({ prefix: 'lobby:' });
  const entries: Record<string, unknown>[] = [];

  for (const key of listResult.keys) {
    const data = await env.LOBBY.get(key.name);
    if (!data) continue;
    const entry = JSON.parse(data);
    if (entry.stats) delete entry.stats;
    entries.push(entry);
  }

  return jsonResponse({ entries, total: entries.length });
}

async function getStats(env: Env): Promise<Response> {
  const lbList = await env.LEADERBOARD.list({ prefix: 'lb:' });
  const lobbyList = await env.LOBBY.list({ prefix: 'lobby:' });
  const battleList = await env.BATTLES.list({ prefix: 'battle:' });

  let totalWins = 0, totalLosses = 0;
  const rarities: Record<string, number> = {};

  for (const key of lbList.keys) {
    const data = await env.LEADERBOARD.get(key.name);
    if (!data) continue;
    const entry = JSON.parse(data);
    totalWins += entry.wins || 0;
    totalLosses += entry.losses || 0;
    const r = entry.rarity || 'common';
    rarities[r] = (rarities[r] || 0) + 1;
  }

  return jsonResponse({
    leaderboard_count: lbList.keys.length,
    lobby_count: lobbyList.keys.length,
    pending_battles: battleList.keys.length,
    total_wins: totalWins,
    total_losses: totalLosses,
    rarity_distribution: rarities,
  });
}

async function deleteLobster(env: Env, lobsterId: string): Promise<Response> {
  const lbKey = `lb:${lobsterId}`;
  const lobbyKey = `lobby:${lobsterId}`;
  const codeKey = `code:${lobsterId.slice(0, 8)}`;

  const existing = await env.LEADERBOARD.get(lbKey);

  await env.LEADERBOARD.delete(lbKey);
  await env.LOBBY.delete(lobbyKey);
  await env.LOBBY.delete(codeKey);
  await env.LOBBY.delete(`cd:${lobsterId}`);
  await env.LOBBY.delete(`bcd:${lobsterId}`);

  return jsonResponse({
    deleted: true,
    lobster_id: lobsterId,
    had_leaderboard_entry: !!existing,
  });
}

async function updateLobster(request: Request, env: Env, lobsterId: string): Promise<Response> {
  const lbKey = `lb:${lobsterId}`;
  const existing = await env.LEADERBOARD.get(lbKey);
  if (!existing) return errorResponse('Lobster not found in leaderboard', 404);

  const entry = JSON.parse(existing);
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const allowed = ['name', 'level', 'wins', 'losses', 'streak', 'color', 'rarity'];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      entry[key] = body[key];
    }
  }
  entry.updated_at = new Date().toISOString();

  await env.LEADERBOARD.put(lbKey, JSON.stringify(entry));
  return jsonResponse({ updated: true, entry });
}

async function clearCooldown(env: Env, lobsterId: string): Promise<Response> {
  await env.LOBBY.delete(`cd:${lobsterId}`);
  await env.LOBBY.delete(`bcd:${lobsterId}`);
  return jsonResponse({ cleared: true, lobster_id: lobsterId });
}
