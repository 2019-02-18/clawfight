export interface LobsterStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  intimidation: number;
  luck: number;
}

export interface LobsterSoul {
  bravery: number;
  curiosity: number;
  talkativeness: number;
  temper: number;
}

export type Rarity = 'common' | 'blue' | 'calico' | 'yellow' | 'split' | 'albino';
export type Environment = 'coastal' | 'deep-sea' | 'hot-spring' | 'polar' | 'space' | 'freshwater';
export type LobsterStatus = 'active' | 'molting' | 'hibernating';

export interface Lobster {
  id: string;
  name: string;
  level: number;
  exp: number;
  exp_to_next: number;
  rarity: Rarity;
  stats: LobsterStats;
  soul: LobsterSoul;
  environment: Environment;
  status: LobsterStatus;
  wins: number;
  losses: number;
  streak: number;
  reputation: number;
  patrol_count: number;
  molt_count: number;
  created_at: string;
  last_patrol: string;
  last_battle: string;
  today_exp: number;
  daily_exp_cap: number;
  hibernated_at?: string;
}

export interface RandomEvent {
  id: string;
  category: 'daily' | 'growth' | 'crisis' | 'rare';
  name: string;
  description: string;
  probability: number;
  effects: {
    stat?: keyof LobsterStats;
    value?: number;
    exp?: number;
    item?: string;
  };
  conditions?: {
    min_level?: number;
    is_molting?: boolean;
  };
  prompt_template: string;
}

export interface BattleResult {
  battle_id: string;
  attacker_id: string;
  defender_id: string;
  winner_id: string;
  rounds: number;
  exp_gained: number;
  timestamp: string;
  rounds_log: BattleRound[];
}

export interface BattleRound {
  round: number;
  attacker: string;
  type: 'crusher' | 'pincer';
  damage: number;
  defender_hp: number;
}

export interface PatrolResponse {
  encounter: boolean;
  pool_size?: number;
  message?: string;
  battle_id?: string;
  opponent?: {
    id: string;
    name: string;
    level: number;
    stats_hash: string;
    color: string;
    environment: string;
  };
  battle_seed?: string;
  encounter_type?: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  level: number;
  wins: number;
  losses: number;
  win_rate: number;
  streak: number;
  color: string;
  rarity: string;
  environment: string;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total_lobsters: number;
  active_lobsters: number;
  rarity_distribution: Record<string, number>;
  updated_at: string;
}

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 70,
  calico: 20,
  blue: 7,
  yellow: 2,
  split: 0.8,
  albino: 0.2,
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: '普通',
  calico: '花斑',
  blue: '蓝色',
  yellow: '黄金',
  split: '双色',
  albino: '白化',
};

export function calcExpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}
