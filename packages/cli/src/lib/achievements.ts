import type { Lobster } from './types.js';

interface AchievementDef {
  name: string;
  desc: string;
  check: (l: Lobster) => boolean;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_blood:  { name: '初战告捷', desc: '赢得首胜', check: l => l.wins >= 1 },
  veteran:      { name: '沙场老兵', desc: '10胜', check: l => l.wins >= 10 },
  warlord:      { name: '深海战神', desc: '50胜', check: l => l.wins >= 50 },
  explorer:     { name: '海域探索者', desc: '20次巡逻', check: l => l.patrol_count >= 20 },
  deep_diver:   { name: '深潜者', desc: '深度5', check: l => (l.depth ?? 0) >= 5 },
  abyss_walker: { name: '深渊行者', desc: '深度10', check: l => (l.depth ?? 0) >= 10 },
  fully_armed:  { name: '全副武装', desc: '装备满3槽', check: l => {
    if (!l.equipped) return false;
    return !!(l.equipped.claw && l.equipped.shell && l.equipped.charm);
  }},
  survivor:     { name: '百折不挠', desc: '累计10负后仍在战斗', check: l => l.losses >= 10 && l.wins > 0 },
  streak_5:     { name: '势不可挡', desc: '5连胜', check: l => l.streak >= 5 },
  streak_10:    { name: '无人能敌', desc: '10连胜', check: l => l.streak >= 10 },
  high_level:   { name: '王者龙虾', desc: '达到10级', check: l => l.level >= 10 },
  molt_master:  { name: '蜕变大师', desc: '蜕壳3次', check: l => l.molt_count >= 3 },
  first_dungeon: { name: '初探地下城', desc: '完成首个地下城', check: l => (l.dungeons_completed ?? 0) >= 1 },
  dungeon_master: { name: '地下城之王', desc: '完成10个地下城', check: l => (l.dungeons_completed ?? 0) >= 10 },
  boss_slayer: { name: 'Boss猎手', desc: '击败地下城Boss', check: l => (l.boss_kills ?? 0) >= 1 },
  perfect_run: { name: '完美通关', desc: '满HP通关地下城', check: () => false },
  treasure_hunter: { name: '寻宝猎人', desc: '在地下城获得5件史诗+装备', check: l => (l.dungeon_epics_found ?? 0) >= 5 },
};

export function checkAchievements(lobster: Lobster): string[] {
  const unlocked: string[] = [];
  const existing = new Set(lobster.achievements ?? []);

  for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
    if (existing.has(id)) continue;
    if (def.check(lobster)) {
      unlocked.push(id);
      if (!lobster.achievements) lobster.achievements = [];
      lobster.achievements.push(id);
    }
  }
  return unlocked;
}
