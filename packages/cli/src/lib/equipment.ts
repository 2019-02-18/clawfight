import { randomUUID } from 'node:crypto';
import type { Equipment, EquipSlot, EquipRarity, LobsterStats, LobsterSoul, Lobster } from './types.js';
import { EQUIP_RARITY_WEIGHTS, EQUIP_RARITY_LABELS, MAX_INVENTORY } from './types.js';

const SLOT_STATS: Record<EquipSlot, (keyof LobsterStats)[]> = {
  claw: ['attack', 'speed'],
  shell: ['hp', 'defense'],
  charm: ['luck', 'intimidation'],
};

const NAMES: Record<EquipSlot, Record<EquipRarity, string[]>> = {
  claw: {
    common: ['铁钳套', '石刺钳', '磨牙套'],
    rare: ['珊瑚刺钳', '鲨齿套', '锋刃钳'],
    epic: ['深海锯齿', '雷霆之钳', '龙骨钳'],
    legendary: ['毁灭之钳', '海神之握', '混沌裂爪'],
  },
  shell: {
    common: ['石甲壳', '硬皮甲', '泥沙盾'],
    rare: ['珊瑚铠', '海藻织甲', '贝壳盾'],
    epic: ['珍珠龙铠', '深渊壳甲', '冰晶甲'],
    legendary: ['不灭甲壳', '海神之铠', '虹光铠'],
  },
  charm: {
    common: ['小海星', '碎贝壳', '海草结'],
    rare: ['鲨牙链', '珊瑚坠', '潮汐珠'],
    epic: ['深海之眼', '雷暴核', '幻海珠'],
    legendary: ['海神之心', '命运之珠', '混沌之眼'],
  },
};

const RARITY_MUL: Record<EquipRarity, number> = { common: 1, rare: 2, epic: 3, legendary: 5 };
const RARITY_DUR: Record<EquipRarity, number> = { common: 8, rare: 12, epic: 18, legendary: 30 };
const RARITY_POWER: Record<EquipRarity, number> = { common: 1, rare: 1.5, epic: 2, legendary: 3 };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarity(depth: number, soul: LobsterSoul): EquipRarity {
  const w = { ...EQUIP_RARITY_WEIGHTS };
  w.rare += depth * 3;
  w.epic += depth * 1.5;
  w.legendary += depth * 0.5;
  if (soul.talkativeness <= 3) {
    w.rare += 5;
    w.epic += 3;
    w.legendary += 1;
  }
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [r, weight] of Object.entries(w)) {
    roll -= weight;
    if (roll <= 0) return r as EquipRarity;
  }
  return 'common';
}

function rollLevel(depth: number, soul: LobsterSoul): number {
  let lv = Math.floor(depth / 3) + 1;
  if (soul.curiosity >= 7) lv++;
  return Math.min(5, Math.max(1, lv));
}

export function generateEquipment(depth: number, soul: LobsterSoul): Equipment {
  const slot = pick<EquipSlot>(['claw', 'shell', 'charm']);
  const rarity = rollRarity(depth, soul);
  const level = rollLevel(depth, soul);
  const mul = RARITY_MUL[rarity];
  const levelMul = 1 + (level - 1) * 0.3;
  const keys = SLOT_STATS[slot];

  let dur = RARITY_DUR[rarity];
  if (soul.bravery <= 3) dur += 2;

  const bonuses: Partial<Record<keyof LobsterStats, number>> = {};
  for (const k of keys) {
    bonuses[k] = Math.ceil(Math.random() * 2 * mul * levelMul);
  }
  const allStats: (keyof LobsterStats)[] = ['hp', 'attack', 'defense', 'speed', 'intimidation', 'luck'];
  if (Math.random() < 0.2 * mul) {
    const extra = allStats.filter(s => !keys.includes(s));
    if (extra.length) bonuses[pick(extra)] = Math.ceil(Math.random() * mul * levelMul);
  }

  return {
    id: randomUUID().slice(0, 8),
    name: pick(NAMES[slot][rarity]),
    slot, rarity, level, bonuses,
    durability: dur,
    max_durability: dur,
  };
}

export function powerScore(e: Equipment): number {
  const sum = Object.values(e.bonuses).reduce((a, b) => a + (b ?? 0), 0);
  const lv = e.level ?? 1;
  return sum * RARITY_POWER[e.rarity] * lv * (e.durability / e.max_durability);
}

export function shouldDrop(depth: number, soul: LobsterSoul): boolean {
  let chance = Math.min(0.8, 0.25 + depth * 0.05);
  if (soul.bravery >= 7) chance += 0.1;
  if (soul.bravery <= 3) chance -= 0.1;
  return Math.random() < Math.max(0.05, chance);
}

export function depthPenalty(soul: LobsterSoul): number {
  if (soul.temper >= 7) return 3;
  if (soul.bravery >= 7) return 1;
  return 2;
}

export function winExpMultiplier(soul: LobsterSoul): number {
  if (soul.temper >= 7) return 1.2;
  return 1;
}

export interface AutoAction {
  type: 'auto_equip' | 'auto_discard' | 'auto_swap';
  item: Equipment;
  old?: Equipment;
  reason: string;
}

export function autoManageLoot(lobster: Lobster, loot: Equipment): AutoAction[] {
  const actions: AutoAction[] = [];
  if (!lobster.equipped) lobster.equipped = {};
  if (!lobster.inventory) lobster.inventory = [];

  const current = lobster.equipped[loot.slot];
  const lootPower = powerScore(loot);

  if (!current) {
    lobster.equipped[loot.slot] = loot;
    actions.push({ type: 'auto_equip', item: loot, reason: slotReason(lobster.soul, loot.slot) });
    return actions;
  }

  const currentPower = powerScore(current);
  if (lootPower > currentPower) {
    lobster.equipped[loot.slot] = loot;
    if (lobster.inventory.length < MAX_INVENTORY) {
      lobster.inventory.push(current);
    }
    actions.push({ type: 'auto_swap', item: loot, old: current, reason: slotReason(lobster.soul, loot.slot) });
    return actions;
  }

  if (lobster.inventory.length < MAX_INVENTORY) {
    lobster.inventory.push(loot);
    return actions;
  }

  let worstIdx = -1;
  let worstScore = Infinity;
  for (let i = 0; i < lobster.inventory.length; i++) {
    const s = powerScore(lobster.inventory[i]);
    if (s < worstScore) { worstScore = s; worstIdx = i; }
  }

  if (worstIdx >= 0 && lootPower > worstScore) {
    const discarded = lobster.inventory[worstIdx];
    lobster.inventory[worstIdx] = loot;
    actions.push({ type: 'auto_discard', item: discarded, reason: '品质不足' });
  } else {
    actions.push({ type: 'auto_discard', item: loot, reason: '品质不足' });
  }
  return actions;
}

function slotReason(soul: LobsterSoul, slot: EquipSlot): string {
  if (slot === 'claw' && soul.bravery >= 7) return '勇猛本能';
  if (slot === 'claw' && soul.temper >= 7) return '暴躁天性';
  if (slot === 'shell' && soul.bravery <= 3) return '谨慎直觉';
  if (slot === 'charm' && soul.curiosity >= 7) return '好奇心驱使';
  return '自行判断';
}

export function getEffectiveStats(lobster: Lobster): LobsterStats {
  const s = { ...lobster.stats };
  if (!lobster.equipped) return s;
  for (const eq of Object.values(lobster.equipped)) {
    if (!eq || eq.durability <= 0) continue;
    for (const [k, v] of Object.entries(eq.bonuses)) {
      (s as Record<string, number>)[k] += v as number;
    }
  }
  return s;
}

export function degradeEquipment(lobster: Lobster): string[] {
  const broken: string[] = [];
  if (!lobster.equipped) return broken;
  for (const [slot, eq] of Object.entries(lobster.equipped)) {
    if (!eq) continue;
    eq.durability--;
    if (eq.durability <= 0) {
      broken.push(eq.name);
      delete (lobster.equipped as Record<string, unknown>)[slot];
    }
  }
  return broken;
}

export function formatEquip(e: Equipment): string {
  const lv = (e.level ?? 1) > 1 ? `+${e.level}` : '';
  const label = EQUIP_RARITY_LABELS[e.rarity] || e.rarity;
  const b = Object.entries(e.bonuses).map(([k, v]) => `${k}+${v}`).join(' ');
  return `[${label}${lv}] ${e.name} ${b} (${e.durability}/${e.max_durability})`;
}
