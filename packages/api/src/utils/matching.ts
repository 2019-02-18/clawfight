interface LobsterStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  intimidation: number;
  luck: number;
  crusher_claw?: number;
  pincer_claw?: number;
}

interface LobsterEntry {
  id: string;
  name: string;
  level: number;
  stats_hash: string;
  stats?: LobsterStats;
  environment: string;
  color: string;
  rarity: string;
  is_molting: boolean;
  timestamp: string;
  patrol_time: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_REGEX = /^[0-9a-f]{64}$/;

export function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export function isValidHash(str: string): boolean {
  return HASH_REGEX.test(str);
}

export function generateBattleSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function matchLobster(
  lobster: LobsterEntry,
  env: { LOBBY: KVNamespace },
  levelRange = 5,
): Promise<LobsterEntry | null> {
  const listResult = await env.LOBBY.list({ prefix: 'lobby:' });
  const candidates: LobsterEntry[] = [];

  for (const key of listResult.keys) {
    if (key.name === `lobby:${lobster.id}`) continue;
    const data = await env.LOBBY.get(key.name);
    if (!data) continue;
    const entry = JSON.parse(data) as LobsterEntry;
    if (entry.environment !== lobster.environment) continue;
    if (Math.abs(entry.level - lobster.level) > levelRange) continue;
    if (entry.is_molting) continue;
    candidates.push(entry);
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function estimatePoolSize(
  environment: string,
  env: { LOBBY: KVNamespace },
): Promise<number> {
  const listResult = await env.LOBBY.list({ prefix: 'lobby:' });
  let count = 0;
  for (const key of listResult.keys) {
    const data = await env.LOBBY.get(key.name);
    if (!data) continue;
    const entry = JSON.parse(data);
    if (entry.environment === environment) count++;
  }
  return count;
}

export type { LobsterEntry, LobsterStats };
