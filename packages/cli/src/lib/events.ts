import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lobster, RandomEvent } from './types.js';

interface EventDef {
  id: string;
  category: string;
  probability: number;
  effects: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  prompt_template: string;
}

interface EventsFile {
  events: EventDef[];
  category_probability_ranges: Record<string, { total: number }>;
}

let cachedEvents: EventsFile | null = null;

async function loadEvents(): Promise<EventsFile> {
  if (cachedEvents) return cachedEvents;

  const paths = [
    join(process.cwd(), 'references', 'events.json'),
    join(process.cwd(), 'packages', 'skill', 'references', 'events.json'),
    join(process.cwd(), '..', 'skill', 'references', 'events.json'),
  ];

  for (const p of paths) {
    try {
      const raw = await readFile(p, 'utf-8');
      cachedEvents = JSON.parse(raw);
      return cachedEvents!;
    } catch { /* try next */ }
  }

  return { events: [], category_probability_ranges: {} };
}

export async function rollEvent(lobster: Lobster): Promise<{ event: EventDef; narrative: string } | null> {
  const data = await loadEvents();
  if (data.events.length === 0) return null;

  const roll = Math.random() * 100;
  let category: string;
  if (roll < 60) category = 'daily';
  else if (roll < 80) category = 'growth';
  else if (roll < 95) category = 'crisis';
  else category = 'rare';

  const candidates = data.events.filter(e => {
    if (e.category !== category) return false;
    if (e.conditions?.min_level && lobster.level < (e.conditions.min_level as number)) return false;
    if (e.conditions?.is_molting && lobster.status !== 'molting') return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((s, c) => s + c.probability, 0);
  let pick = Math.random() * totalWeight;
  let chosen: EventDef | null = null;
  for (const c of candidates) {
    pick -= c.probability;
    if (pick <= 0) { chosen = c; break; }
  }
  if (!chosen) chosen = candidates[0];

  const narrative = chosen.prompt_template
    .replace(/\{name\}/g, lobster.name)
    .replace(/\{territory\}/g, lobster.environment)
    .replace(/\{level\}/g, String(lobster.level));

  return { event: chosen, narrative };
}

export function applyEventEffects(lobster: Lobster, effects: Record<string, unknown>): string[] {
  const changes: string[] = [];
  const stats = lobster.stats as Record<string, number>;

  for (const [key, val] of Object.entries(effects)) {
    if (key === 'exp' && typeof val === 'string') {
      const num = parseInt(val, 10);
      const actual = Math.min(num, lobster.daily_exp_cap - lobster.today_exp);
      if (actual > 0) {
        lobster.exp += actual;
        lobster.today_exp += actual;
        changes.push(`经验 +${actual}`);
      }
    } else if (typeof val === 'string' && key in stats) {
      const num = parseInt(val, 10);
      stats[key] += num;
      if (stats[key] < 0) stats[key] = 0;
      changes.push(`${key} ${num >= 0 ? '+' : ''}${num}`);
    }
  }

  return changes;
}
