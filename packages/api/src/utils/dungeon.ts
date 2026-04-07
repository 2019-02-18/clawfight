// ─── Types ───

interface Stats {
  hp: number; attack: number; defense: number;
  speed: number; intimidation: number; luck: number;
}

interface Soul {
  bravery: number; curiosity: number;
  talkativeness: number; temper: number;
}

type RoomType = 'combat' | 'treasure' | 'trap' | 'rest' | 'mystery' | 'boss';
type Risk = 'low' | 'mid' | 'high';

interface DungeonChoice {
  id: 1 | 2;
  key: string;
  stat: keyof Stats;
  risk: Risk;
  soul_hint?: string;
}

interface DungeonRoom {
  index: number;
  type: RoomType;
  theme_key: string;
  choices: [DungeonChoice, DungeonChoice];
  creature_power?: number;
}

interface LootItem {
  name: string;
  slot: 'claw' | 'shell' | 'charm';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  level: number;
  bonuses: Record<string, number>;
  durability: number;
  max_durability: number;
}

interface RoomOutcome {
  success: boolean;
  key: string;
  damage_taken: number;
  hp_healed: number;
  exp_gained: number;
  loot?: LootItem;
  soul_activated?: string;
}

interface DungeonState {
  dungeon_id: string;
  lobster_id: string;
  seed: string;
  theme: string;
  total_rooms: number;
  current_room: number;
  hp: { current: number; max: number };
  stats: Stats;
  soul: Soul;
  depth: number;
  level: number;
  rand_index: number;
  rooms: DungeonRoom[];
  loot_collected: LootItem[];
  exp_collected: number;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  created_at: string;
}

// ─── Seeded RNG (same algorithm as battle.ts) ───

function seededRandom(seed: string, index: number): number {
  const combined = seed + ':' + index;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRng(seed: string, startIndex = 0) {
  let idx = startIndex;
  return {
    next: () => seededRandom(seed, idx++),
    pct: () => seededRandom(seed, idx++) % 100,
    range: (min: number, max: number) => min + (seededRandom(seed, idx++) % (max - min + 1)),
    index: () => idx,
  };
}

// ─── Themes ───

const THEMES = [
  'coral_maze', 'deep_rift', 'thermal_vent', 'ice_cavern',
  'shipwreck', 'abyss_trench', 'tide_pool', 'void_rift',
] as const;

const ENV_THEMES: Record<string, string[]> = {
  coastal: ['coral_maze', 'shipwreck', 'tide_pool'],
  'deep-sea': ['deep_rift', 'abyss_trench'],
  'hot-spring': ['thermal_vent', 'coral_maze'],
  polar: ['ice_cavern', 'deep_rift'],
  space: ['void_rift', 'abyss_trench'],
  freshwater: ['tide_pool', 'coral_maze'],
};

// ─── Room Choice Templates ───

interface ChoiceTemplate {
  key: string;
  stat: keyof Stats;
  risk: Risk;
  soul_key?: keyof Soul;
  soul_threshold?: number;
}

const ROOM_CHOICES: Record<RoomType, [ChoiceTemplate, ChoiceTemplate][]> = {
  combat: [
    [{ key: 'charge_attack', stat: 'attack', risk: 'high', soul_key: 'bravery', soul_threshold: 7 },
     { key: 'defensive_stance', stat: 'defense', risk: 'low' }],
    [{ key: 'rush_strike', stat: 'speed', risk: 'high', soul_key: 'temper', soul_threshold: 7 },
     { key: 'counter_wait', stat: 'intimidation', risk: 'mid' }],
  ],
  treasure: [
    [{ key: 'open_golden_chest', stat: 'luck', risk: 'high', soul_key: 'curiosity', soul_threshold: 7 },
     { key: 'open_stone_chest', stat: 'defense', risk: 'low' }],
    [{ key: 'reach_deep_cache', stat: 'speed', risk: 'mid', soul_key: 'curiosity', soul_threshold: 7 },
     { key: 'take_surface_loot', stat: 'luck', risk: 'low' }],
  ],
  trap: [
    [{ key: 'disarm_mechanism', stat: 'defense', risk: 'mid', soul_key: 'temper', soul_threshold: 7 },
     { key: 'dodge_through', stat: 'speed', risk: 'mid' }],
    [{ key: 'brute_force', stat: 'attack', risk: 'high', soul_key: 'bravery', soul_threshold: 7 },
     { key: 'careful_bypass', stat: 'luck', risk: 'low' }],
  ],
  rest: [
    [{ key: 'deep_rest', stat: 'hp', risk: 'low' },
     { key: 'search_hidden', stat: 'luck', risk: 'mid', soul_key: 'curiosity', soul_threshold: 7 }],
  ],
  mystery: [
    [{ key: 'investigate', stat: 'luck', risk: 'mid', soul_key: 'curiosity', soul_threshold: 5 },
     { key: 'proceed_cautiously', stat: 'defense', risk: 'low' }],
    [{ key: 'touch_artifact', stat: 'intimidation', risk: 'high', soul_key: 'bravery', soul_threshold: 7 },
     { key: 'observe_only', stat: 'speed', risk: 'low' }],
  ],
  boss: [
    [{ key: 'all_out_assault', stat: 'attack', risk: 'high', soul_key: 'bravery', soul_threshold: 7 },
     { key: 'tactical_approach', stat: 'speed', risk: 'mid' }],
  ],
};

// ─── Loot Generation ───

const SLOT_STATS: Record<string, string[]> = {
  claw: ['attack', 'speed'], shell: ['hp', 'defense'], charm: ['luck', 'intimidation'],
};

const EQUIP_NAMES: Record<string, Record<string, string[]>> = {
  claw: {
    common: ['铁钳套', '石刺钳'], rare: ['珊瑚刺钳', '锋刃钳'],
    epic: ['深海锯齿', '雷霆之钳'], legendary: ['毁灭之钳', '海神之握'],
  },
  shell: {
    common: ['石甲壳', '硬皮甲'], rare: ['珊瑚铠', '贝壳盾'],
    epic: ['珍珠龙铠', '冰晶甲'], legendary: ['不灭甲壳', '虹光铠'],
  },
  charm: {
    common: ['小海星', '碎贝壳'], rare: ['鲨牙链', '潮汐珠'],
    epic: ['深海之眼', '幻海珠'], legendary: ['海神之心', '混沌之眼'],
  },
};

const RARITY_MUL: Record<string, number> = { common: 1, rare: 2, epic: 3, legendary: 5 };
const RARITY_DUR: Record<string, number> = { common: 8, rare: 12, epic: 18, legendary: 30 };

function rollLoot(rng: ReturnType<typeof createRng>, depth: number, level: number, rewardTier: number): LootItem {
  const slots = ['claw', 'shell', 'charm'] as const;
  const slot = slots[rng.next() % 3];

  let rarityRoll = rng.pct() - rewardTier * 10 - depth * 2;
  let rarity: string;
  if (rarityRoll < 3) rarity = 'legendary';
  else if (rarityRoll < 15) rarity = 'epic';
  else if (rarityRoll < 40) rarity = 'rare';
  else rarity = 'common';

  const lv = Math.min(5, Math.max(1, Math.floor(depth / 3) + 1));
  const mul = RARITY_MUL[rarity];
  const levelMul = 1 + (lv - 1) * 0.3;
  const keys = SLOT_STATS[slot];
  const bonuses: Record<string, number> = {};
  for (const k of keys) {
    bonuses[k] = Math.max(1, Math.ceil((rng.range(1, 3)) * mul * levelMul));
  }
  if (rng.pct() < 20 * mul) {
    const allStats = ['hp', 'attack', 'defense', 'speed', 'intimidation', 'luck'];
    const extra = allStats.filter(s => !keys.includes(s));
    bonuses[extra[rng.next() % extra.length]] = Math.max(1, Math.ceil(rng.range(1, 2) * mul * levelMul));
  }

  const dur = RARITY_DUR[rarity];
  const names = EQUIP_NAMES[slot][rarity];

  return {
    name: names[rng.next() % names.length],
    slot: slot as any,
    rarity: rarity as any,
    level: lv,
    bonuses,
    durability: dur,
    max_durability: dur,
  };
}

// ─── Dungeon Generation ───

export function generateDungeon(
  lobsterId: string, stats: Stats, soul: Soul,
  depth: number, level: number, environment: string, theme?: string,
): DungeonState {
  const seed = generateSeed();
  const rng = createRng(seed);

  const envThemes = ENV_THEMES[environment] || ENV_THEMES.coastal;
  const dungeonTheme = theme || envThemes[rng.next() % envThemes.length];

  const totalRooms = Math.min(5, 3 + Math.floor(depth / 5));
  const rooms: DungeonRoom[] = [];

  const roomTypeWeights: Record<RoomType, number> = {
    combat: 30, treasure: 25, trap: 20, rest: 10, mystery: 15, boss: 0,
  };

  for (let i = 0; i < totalRooms; i++) {
    const isLast = i === totalRooms - 1;
    let type: RoomType;

    if (isLast && depth >= 3) {
      type = 'boss';
    } else {
      const roll = rng.pct();
      let cumulative = 0;
      type = 'combat';
      for (const [t, w] of Object.entries(roomTypeWeights)) {
        cumulative += w;
        if (roll < cumulative) { type = t as RoomType; break; }
      }
    }

    const templates = ROOM_CHOICES[type];
    const template = templates[rng.next() % templates.length];

    const choices: [DungeonChoice, DungeonChoice] = [
      buildChoice(1, template[0], soul),
      buildChoice(2, template[1], soul),
    ];

    const creaturePower = type === 'combat' || type === 'boss'
      ? Math.floor((level * 3 + depth * 2) * (type === 'boss' ? 1.8 : 1) * (1 + (rng.pct() - 50) / 200))
      : undefined;

    rooms.push({
      index: i,
      type,
      theme_key: `${dungeonTheme}_${type}_${i}`,
      choices,
      creature_power: creaturePower,
    });
  }

  return {
    dungeon_id: crypto.randomUUID(),
    lobster_id: lobsterId,
    seed,
    theme: dungeonTheme,
    total_rooms: totalRooms,
    current_room: 0,
    hp: { current: stats.hp * 2, max: stats.hp * 2 },
    stats,
    soul,
    depth,
    level,
    rand_index: rng.index(),
    rooms,
    loot_collected: [],
    exp_collected: 0,
    status: 'active',
    created_at: new Date().toISOString(),
  };
}

function buildChoice(id: 1 | 2, tpl: ChoiceTemplate, soul: Soul): DungeonChoice {
  const choice: DungeonChoice = { id, key: tpl.key, stat: tpl.stat, risk: tpl.risk };
  if (tpl.soul_key && soul[tpl.soul_key] >= (tpl.soul_threshold || 7)) {
    choice.soul_hint = `${tpl.soul_key}_bonus`;
  }
  return choice;
}

// ─── Outcome Calculation ───

export function resolveChoice(state: DungeonState, choiceId: 1 | 2): RoomOutcome {
  const room = state.rooms[state.current_room];
  const choice = room.choices.find(c => c.id === choiceId)!;
  const rng = createRng(state.seed, state.rand_index);

  const statVal = choice.stat === 'hp' ? state.stats.hp : (state.stats as any)[choice.stat] || 10;
  const riskMul = choice.risk === 'high' ? 2 : choice.risk === 'mid' ? 1.3 : 0.8;

  let soulBonus = 0;
  if (choice.soul_hint) {
    const soulKey = choice.soul_hint.replace('_bonus', '') as keyof Soul;
    soulBonus = state.soul[soulKey] * 2;
  }

  const successThreshold = 35 + statVal * 2.5 + soulBonus;
  const roll = rng.pct();
  const success = roll < successThreshold;

  let damage = 0;
  let heal = 0;
  let exp = 0;
  let loot: LootItem | undefined;
  let outcomeKey: string;
  let soulActivated: string | undefined = choice.soul_hint;

  if (room.type === 'rest' && choice.key === 'deep_rest') {
    heal = Math.floor(state.hp.max * 0.3);
    exp = 5;
    outcomeKey = 'rest_healed';
  } else if (success) {
    outcomeKey = `${choice.key}_success`;
    exp = Math.floor(10 * riskMul);

    if (room.type === 'combat' || room.type === 'boss') {
      damage = Math.max(0, Math.floor((room.creature_power || 10) * 0.3 - state.stats.defense * 0.2));
      exp = Math.floor(15 * riskMul * (room.type === 'boss' ? 2 : 1));
    }

    const lootChance = room.type === 'treasure' ? 80
      : room.type === 'boss' ? 100
      : choice.risk === 'high' ? 50
      : 25;
    if (rng.pct() < lootChance) {
      const rewardTier = room.type === 'boss' ? 3 : choice.risk === 'high' ? 2 : 1;
      loot = rollLoot(rng, state.depth, state.level, rewardTier);
    }
  } else {
    outcomeKey = `${choice.key}_fail`;
    exp = Math.floor(3 * riskMul);

    if (room.type === 'combat' || room.type === 'boss') {
      damage = Math.floor((room.creature_power || 10) * 0.6);
    } else if (room.type === 'trap') {
      damage = rng.range(2, Math.floor(state.hp.max * 0.2));
    } else if (room.type === 'mystery') {
      damage = rng.range(1, Math.floor(state.hp.max * 0.1));
    }
  }

  state.rand_index = rng.index();
  state.hp.current = Math.min(state.hp.max, Math.max(0, state.hp.current - damage + heal));
  state.exp_collected += exp;
  if (loot) state.loot_collected.push(loot);

  state.current_room++;
  if (state.hp.current <= 0) {
    state.status = 'failed';
  } else if (state.current_room >= state.total_rooms) {
    state.status = 'completed';
  }

  return {
    success,
    key: outcomeKey,
    damage_taken: damage,
    hp_healed: heal,
    exp_gained: exp,
    loot,
    soul_activated: soulActivated,
  };
}

// ─── Helpers ───

function generateSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function currentRoomView(state: DungeonState) {
  if (state.status !== 'active') return null;
  const room = state.rooms[state.current_room];
  return {
    index: state.current_room,
    total: state.total_rooms,
    type: room.type,
    theme_key: room.theme_key,
    choices: room.choices,
    hp: state.hp,
  };
}

export type { DungeonState, DungeonChoice, DungeonRoom, RoomOutcome, LootItem, Stats, Soul };
