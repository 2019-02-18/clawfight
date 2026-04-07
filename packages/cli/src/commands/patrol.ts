import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { apiPatrol } from '../lib/api.js';
import { rollEvent, applyEventEffects } from '../lib/events.js';
import { calcExpToNext, MAX_INVENTORY } from '../lib/types.js';
import type { DungeonMap } from '../lib/types.js';
import {
  generateEquipment, shouldDrop, degradeEquipment, formatEquip,
  autoManageLoot, depthPenalty, winExpMultiplier,
} from '../lib/equipment.js';
import { checkAchievements, ACHIEVEMENTS } from '../lib/achievements.js';
import { t } from '../lib/i18n.js';

const PATROL_EXP = 15;

export async function patrol(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) { console.log('\n' + t('no_lobster')); return; }

  if (lobster.status === 'molting') { console.log('\n' + t('status_cant_patrol_molt', { name: lobster.name })); return; }
  if (lobster.status === 'hibernating') { console.log('\n' + t('status_cant_patrol_hibernate', { name: lobster.name })); return; }

  const today = new Date().toISOString().split('T')[0];
  const lastDay = lobster.last_patrol ? lobster.last_patrol.split('T')[0] : '';
  if (today !== lastDay) lobster.today_exp = 0;

  const depth = lobster.depth ?? 0;
  const soul = lobster.soul;
  const trait = soulTag(soul);

  console.log('\n' + t('patrol_start', { name: lobster.name }) + ` [${t('depth_display', { depth })}]`);
  if (trait) console.log(t('soul_trait', { trait }));
  console.log('─'.repeat(40));

  const expGain = Math.min(PATROL_EXP, lobster.daily_exp_cap - lobster.today_exp);
  if (expGain > 0) {
    lobster.exp += expGain;
    lobster.today_exp += expGain;
    console.log(t('patrol_checkin', { exp: expGain }));
  }

  const eventResult = await rollEvent(lobster);
  if (eventResult) {
    console.log();
    console.log(t('event_prefix', { category: eventResult.event.category, id: eventResult.event.id }));
    console.log(`   ${eventResult.narrative}`);
    const changes = applyEventEffects(lobster, eventResult.event.effects as Record<string, unknown>);
    if (changes.length > 0) console.log(t('event_effects', { changes: changes.join(', ') }));
    await appendLog(`🎲 ${eventResult.event.id}: ${eventResult.narrative.slice(0, 60)}...`);
  }

  checkLevelUp(lobster);
  lobster.patrol_count++;
  lobster.last_patrol = new Date().toISOString();

  console.log('\n' + t('patrol_connecting'));
  const serverResponse = await apiPatrol(lobster);

  if (serverResponse) {
    if (serverResponse.message === 'patrol_cooldown') {
      console.log(t('patrol_cooldown'));
    } else if (serverResponse.encounter && serverResponse.opponent && serverResponse.battle_result) {
      const br = serverResponse.battle_result;
      const opp = serverResponse.opponent;
      console.log('\n' + t('patrol_encounter', { name: opp.name, level: opp.level }));
      console.log(t(`patrol_result_${br.result}`, { rounds: br.rounds }));

      if (br.result === 'win') {
        lobster.wins++;
        lobster.streak = Math.max(0, lobster.streak) + 1;
        lobster.reputation++;
      } else if (br.result === 'loss') {
        lobster.losses++;
        lobster.streak = Math.min(0, lobster.streak) - 1;
        lobster.reputation = Math.max(0, lobster.reputation - 1);
        const penalty = depthPenalty(soul);
        lobster.depth = Math.max(0, (lobster.depth ?? 0) - penalty);
      }

      let battleExp = br.exp_gain;
      if (br.result === 'win') battleExp = Math.floor(battleExp * winExpMultiplier(soul));
      battleExp = Math.min(battleExp, lobster.daily_exp_cap - lobster.today_exp);
      if (battleExp > 0) {
        lobster.exp += battleExp;
        lobster.today_exp += battleExp;
      }
      lobster.last_battle = new Date().toISOString();
      console.log(t('patrol_exp_stats', { exp: battleExp, wins: lobster.wins, losses: lobster.losses, streak: lobster.streak }));
      await appendLog(`⚔️ VS ${opp.name}(Lv.${opp.level}) → ${br.result} (${br.rounds}R)`);

      const broken = degradeEquipment(lobster);
      if (broken.length) console.log(t('equip_broken', { items: broken.join(', ') }));

      checkLevelUp(lobster);
    } else if (serverResponse.encounter && serverResponse.opponent) {
      console.log(t('patrol_no_battle', { name: serverResponse.opponent.name, level: serverResponse.opponent.level }));
    } else {
      console.log(t('patrol_done', { pool: serverResponse.pool_size || 0 }));
    }
  } else {
    console.log(t('patrol_offline'));
  }

  lobster.depth = (lobster.depth ?? 0) + 1;

  if (shouldDrop(depth, soul)) {
    const loot = generateEquipment(depth, soul);
    console.log(t('equip_drop', { item: formatEquip(loot) }));
    await appendLog(`🎁 ${loot.rarity}+${loot.level} ${loot.name}`);

    const actions = autoManageLoot(lobster, loot);
    for (const a of actions) {
      switch (a.type) {
        case 'auto_equip':
          console.log(t('auto_equip', { name: lobster.name, item: formatEquip(a.item), reason: a.reason }));
          break;
        case 'auto_swap':
          console.log(t('auto_swap', { name: lobster.name, item: formatEquip(a.item), old: a.old!.name, reason: a.reason }));
          break;
        case 'auto_discard':
          console.log(t('auto_discard', { name: lobster.name, item: a.item.name, reason: a.reason }));
          break;
      }
    }
  }

  if (shouldDropMap(lobster.depth ?? 0, lobster.soul)) {
    const map = generateMap(lobster.depth ?? 0, lobster.environment);
    if (!lobster.dungeon_maps) lobster.dungeon_maps = [];
    if (lobster.dungeon_maps.length < 5) {
      lobster.dungeon_maps.push(map);
      console.log(t('dg_map_found', { theme: t(`dg_theme_${map.theme}`), rooms: map.rooms, diff: t(`dg_diff_${map.difficulty}`) }));
      await appendLog(`🗺️ 发现地图: ${map.theme} (${map.rooms}房间, ${map.difficulty})`);
    }
  }

  const newAchievements = checkAchievements(lobster);
  for (const id of newAchievements) {
    const def = ACHIEVEMENTS[id];
    console.log(t('achieve_unlock', { name: def.name, desc: def.desc }));
  }

  await writeLobster(lobster);

  console.log('─'.repeat(40));
  const inv = lobster.inventory?.length ?? 0;
  console.log(t('patrol_depth', {
    level: lobster.level, exp: lobster.exp, next: lobster.exp_to_next,
    today: lobster.today_exp, cap: lobster.daily_exp_cap,
    depth: lobster.depth ?? 0, inv, inv_max: MAX_INVENTORY,
  }));
}

function soulTag(soul: import('../lib/types.js').LobsterSoul): string {
  const tags: string[] = [];
  if (soul.bravery >= 7) tags.push('勇猛');
  if (soul.bravery <= 3) tags.push('谨慎');
  if (soul.curiosity >= 7) tags.push('博学');
  if (soul.curiosity <= 3) tags.push('专注');
  if (soul.talkativeness <= 3) tags.push('隐匿');
  if (soul.temper >= 7) tags.push('暴烈');
  if (soul.temper <= 3) tags.push('沉稳');
  return tags.join('·');
}

const ENV_THEMES: Record<string, string[]> = {
  coastal: ['coral_maze', 'shipwreck', 'tide_pool'],
  'deep-sea': ['deep_rift', 'abyss_trench'],
  'hot-spring': ['thermal_vent', 'coral_maze'],
  polar: ['ice_cavern', 'deep_rift'],
  space: ['void_rift', 'abyss_trench'],
  freshwater: ['tide_pool', 'coral_maze'],
};

function shouldDropMap(depth: number, soul: import('../lib/types.js').LobsterSoul): boolean {
  let chance = Math.min(0.5, 0.1 + depth * 0.03);
  if (soul.curiosity >= 7) chance += 0.1;
  return Math.random() < chance;
}

function generateMap(depth: number, environment: string): DungeonMap {
  const themes = ENV_THEMES[environment] || ENV_THEMES.coastal;
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const rooms = Math.min(5, 3 + Math.floor(depth / 5));
  const difficulties: Array<DungeonMap['difficulty']> = ['easy', 'normal', 'hard', 'nightmare'];
  const di = Math.min(3, Math.floor(depth / 3));
  const difficulty = difficulties[di];
  return { theme, rooms, difficulty };
}

function checkLevelUp(lobster: ReturnType<typeof Object>): void {
  const l = lobster as import('../lib/types.js').Lobster;
  while (l.exp >= l.exp_to_next) {
    l.exp -= l.exp_to_next;
    l.level++;
    l.exp_to_next = calcExpToNext(l.level);

    const statKeys = ['hp', 'attack', 'defense', 'speed', 'intimidation', 'luck'] as const;
    const gains: string[] = [];
    for (const key of statKeys) {
      const gain = 1 + Math.floor(Math.random() * 3);
      (l.stats as Record<string, number>)[key] += gain;
      gains.push(`${key}+${gain}`);
    }
    console.log('\n' + t('level_up', { level: l.level, gains: gains.join(', ') }));

    if (l.level % 5 === 0) {
      console.log(t('molt_trigger'));
      l.status = 'molting' as const;
      l.molt_count++;
    }
  }
}
