import { handlePatrol } from './routes/patrol.js';
import { handleEncounter, handleResult } from './routes/encounter.js';
import { handleLeaderboard } from './routes/leaderboard.js';
import { handleBattle } from './routes/battle.js';
import { handleAdmin } from './routes/admin.js';

interface Env {
  LOBBY: KVNamespace;
  BATTLES: KVNamespace;
  LEADERBOARD: KVNamespace;
  ENVIRONMENT: string;
  MAX_DAILY_EXP: string;
  MATCH_LEVEL_RANGE: string;
  MAX_BATTLE_ROUNDS: string;
  LEADERBOARD_MAX_LIMIT: string;
  ADMIN_KEY: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (pathname === '/api/patrol' && request.method === 'POST') {
        return await handlePatrol(request, env);
      }
      if (pathname === '/api/encounter' && request.method === 'GET') {
        return await handleEncounter(request, env);
      }
      if (pathname === '/api/result' && request.method === 'POST') {
        return await handleResult(request, env);
      }
      if (pathname === '/api/battle' && request.method === 'POST') {
        return await handleBattle(request, env);
      }
      if (pathname === '/api/leaderboard' && request.method === 'GET') {
        return await handleLeaderboard(request, env);
      }
      if (pathname.startsWith('/api/admin')) {
        return await handleAdmin(request, env);
      }
      return errorResponse('Not Found', 404);
    } catch (err) {
      console.error('Unhandled error:', err);
      return errorResponse('Internal Server Error', 500);
    }
  },
};

export { jsonResponse, errorResponse, corsHeaders };
export type { Env };
