import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { apiDungeonEnter, apiDungeonAct, apiDungeonState, apiDungeonAbandon } from '../lib/api.js';
import { autoManageLoot, formatEquip } from '../lib/equipment.js';
import { checkAchievements, ACHIEVEMENTS } from '../lib/achievements.js';
import { calcExpToNext } from '../lib/types.js';
import type { DungeonRoomView, DungeonLoot, Equipment, DungeonMap } from '../lib/types.js';
import { t } from '../lib/i18n.js';

const RISK_ICON: Record<string, string> = { low: '🟢', mid: '🟡', high: '🔴' };
const THEME_ICON: Record<string, string> = {
  coral_maze: '🪸', deep_rift: '🌊', thermal_vent: '🌋', ice_cavern: '❄️',
  shipwreck: '🚢', abyss_trench: '🕳️', tide_pool: '🏖️', void_rift: '🌀',
};

function formatRoom(room: DungeonRoomView, theme: string): string {
  const icon = THEME_ICON[theme] || '🏔️';
  const lines: string[] = [];
  lines.push(`${icon} ${t(`dg_theme_${theme}`)} | ${room.index + 1}/${room.total} | HP:${room.hp.current}/${room.hp.max}`);
  const c1 = room.choices[0];
  const c2 = room.choices[1];
  lines.push(`  [1] ${t(`dg_${c1.key}`)} (${c1.stat.toUpperCase()}, ${RISK_ICON[c1.risk]}${t(`dg_risk_${c1.risk}`)})  [2] ${t(`dg_${c2.key}`)} (${c2.stat.toUpperCase()}, ${RISK_ICON[c2.risk]}${t(`dg_risk_${c2.risk}`)})`);
  if (c1.soul_hint) lines.push(`  🦞 ${t(`dg_${c1.soul_hint}`)}`);
  if (c2.soul_hint) lines.push(`  🦞 ${t(`dg_${c2.soul_hint}`)}`);
  return lines.join('\n');
}

function lootToEquipment(l: DungeonLoot): Equipment {
  return { ...l, id: Math.random().toString(36).slice(2, 10) };
}

export async function explore(action?: string): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) { console.log('\n' + t('no_lobster')); return; }

  if (lobster.status === 'molting') { console.log('\n' + t('status_cant_patrol_molt', { name: lobster.name })); return; }
  if (lobster.status === 'hibernating') { console.log('\n' + t('status_cant_patrol_hibernate', { name: lobster.name })); return; }

  if (action === 'abandon') {
    return await abandonDungeon(lobster);
  }

  if (action === '1' || action === '2') {
    return await makeChoice(lobster, parseInt(action) as 1 | 2);
  }

  if (action === 'maps') {
    return showMaps(lobster);
  }

  return await enterOrResume(lobster, action);
}

async function enterOrResume(lobster: import('../lib/types.js').Lobster, mapIndex?: string): Promise<void> {
  console.log('\n' + t('dg_connecting'));
  const stateRes = await apiDungeonState(lobster.id);
  if (!stateRes) { console.log(t('patrol_offline')); return; }

  if (stateRes.active && stateRes.room) {
    console.log(t('dg_resume'));
    console.log(formatRoom(stateRes.room, stateRes.theme!));
    return;
  }

  const maps = lobster.dungeon_maps || [];
  if (maps.length === 0) {
    console.log(t('dg_no_maps'));
    return;
  }

  let idx = 0;
  if (mapIndex && !isNaN(parseInt(mapIndex))) {
    idx = parseInt(mapIndex) - 1;
    if (idx < 0 || idx >= maps.length) {
      console.log(t('dg_bad_map_index', { count: maps.length }));
      return;
    }
  }

  const map = maps[idx];
  console.log(t('dg_entering', { theme: t(`dg_theme_${map.theme}`), rooms: map.rooms, diff: t(`dg_diff_${map.difficulty}`) }));

  const res = await apiDungeonEnter(lobster, map.theme);
  if (!res) { console.log(t('patrol_offline')); return; }
  if ((res as any).error) { console.log(`⚠️  ${(res as any).error}`); return; }

  lobster.active_dungeon = res.dungeon_id;
  maps.splice(idx, 1);
  lobster.dungeon_maps = maps;
  await writeLobster(lobster);

  await appendLog(`🗺️ 进入地下城: ${map.theme} (${map.rooms}房间)`);
  console.log('─'.repeat(40));
  console.log(formatRoom(res.room, res.theme));
}

async function makeChoice(lobster: import('../lib/types.js').Lobster, choice: 1 | 2): Promise<void> {
  if (!lobster.active_dungeon) {
    console.log('\n' + t('dg_no_active'));
    return;
  }

  console.log('');
  const res = await apiDungeonAct(lobster.active_dungeon, lobster.id, choice);
  if (!res) { console.log(t('patrol_offline')); return; }

  const o = res.outcome;
  const icon = o.success ? '✅' : '❌';
  console.log(`${icon} ${t(`dg_${o.key}`, { damage: o.damage_taken, heal: o.hp_healed })} | EXP+${o.exp_gained}`);

  if (o.damage_taken > 0) console.log(`  💔 HP -${o.damage_taken} → ${res.hp.current}/${res.hp.max}`);
  if (o.hp_healed > 0) console.log(`  💚 HP +${o.hp_healed} → ${res.hp.current}/${res.hp.max}`);
  if (o.soul_activated) console.log(`  🦞 ${t(`dg_${o.soul_activated}`)}`);

  if (o.loot) {
    const equip = lootToEquipment(o.loot);
    console.log(`  ${t('equip_drop', { item: formatEquip(equip) })}`);
  }

  if (res.status === 'completed' || res.status === 'failed') {
    console.log('─'.repeat(40));
    if (res.status === 'completed') {
      console.log(t('dg_complete'));
      lobster.dungeons_completed = (lobster.dungeons_completed ?? 0) + 1;
    } else {
      console.log(t('dg_failed'));
    }

    if (res.rewards) {
      const today = new Date().toISOString().split('T')[0];
      const lastDay = lobster.last_patrol ? lobster.last_patrol.split('T')[0] : '';
      if (today !== lastDay) lobster.today_exp = 0;

      const expGain = Math.min(res.rewards.total_exp, lobster.daily_exp_cap - lobster.today_exp);
      if (expGain > 0) {
        lobster.exp += expGain;
        lobster.today_exp += expGain;
      }
      console.log(t('dg_rewards_exp', { exp: expGain }));

      for (const loot of res.rewards.loot) {
        const equip = lootToEquipment(loot);
        console.log(`  ${t('equip_drop', { item: formatEquip(equip) })}`);

        if (loot.rarity === 'epic' || loot.rarity === 'legendary') {
          lobster.dungeon_epics_found = (lobster.dungeon_epics_found ?? 0) + 1;
        }

        const actions = autoManageLoot(lobster, equip);
        for (const a of actions) {
          if (a.type === 'auto_equip') console.log(`  ${t('auto_equip', { name: lobster.name, item: formatEquip(a.item), reason: a.reason })}`);
          else if (a.type === 'auto_swap') console.log(`  ${t('auto_swap', { name: lobster.name, item: formatEquip(a.item), old: a.old!.name, reason: a.reason })}`);
          else if (a.type === 'auto_discard') console.log(`  ${t('auto_discard', { name: lobster.name, item: a.item.name, reason: a.reason })}`);
        }
      }

      checkLevelUp(lobster);

      for (const loot of res.rewards.loot) {
        if (loot.rarity === 'epic' || loot.rarity === 'legendary') {
          const room = res.rewards.loot.indexOf(loot);
          if (room === res.rewards.loot.length - 1) {
            lobster.boss_kills = (lobster.boss_kills ?? 0) + 1;
          }
        }
      }

      await appendLog(`🏰 地下城${res.status === 'completed' ? '通关' : '失败'}: EXP+${expGain}, 战利品×${res.rewards.loot.length}`);
    }

    lobster.active_dungeon = undefined;

    const newAch = checkAchievements(lobster);
    for (const id of newAch) {
      const def = ACHIEVEMENTS[id];
      console.log(t('achieve_unlock', { name: def.name, desc: def.desc }));
    }

    await writeLobster(lobster);
    console.log(t('dg_summary', {
      level: lobster.level, exp: lobster.exp, next: lobster.exp_to_next,
      today: lobster.today_exp, cap: lobster.daily_exp_cap,
    }));
    return;
  }

  if (res.next_room) {
    console.log('─'.repeat(40));
    const stateRes = await apiDungeonState(lobster.id);
    const theme = stateRes?.theme || '';
    console.log(formatRoom(res.next_room, theme));
  }
}

async function abandonDungeon(lobster: import('../lib/types.js').Lobster): Promise<void> {
  if (!lobster.active_dungeon) {
    console.log('\n' + t('dg_no_active'));
    return;
  }

  console.log('\n' + t('dg_abandoning'));
  const res = await apiDungeonAbandon(lobster.id);
  if (!res) { console.log(t('patrol_offline')); return; }

  const expGain = Math.min(res.partial_exp, lobster.daily_exp_cap - lobster.today_exp);
  if (expGain > 0) {
    lobster.exp += expGain;
    lobster.today_exp += expGain;
  }

  for (const loot of res.partial_loot) {
    const equip = lootToEquipment(loot);
    autoManageLoot(lobster, equip);
  }

  lobster.active_dungeon = undefined;
  const penalty = Math.max(0, (lobster.depth ?? 0) - 2);
  lobster.depth = penalty;

  await writeLobster(lobster);
  await appendLog(`🏰 放弃地下城: EXP+${expGain}, 深度→${lobster.depth}`);
  console.log(t('dg_abandoned', { exp: expGain, loot: res.partial_loot.length, depth: lobster.depth }));
}

function showMaps(lobster: import('../lib/types.js').Lobster): void {
  const maps = lobster.dungeon_maps || [];
  if (maps.length === 0) {
    console.log('\n' + t('dg_no_maps'));
    return;
  }
  console.log('\n' + t('dg_maps_title', { count: maps.length }));
  for (let i = 0; i < maps.length; i++) {
    const m = maps[i];
    const icon = THEME_ICON[m.theme] || '🏔️';
    console.log(`  [${i + 1}] ${icon} ${t(`dg_theme_${m.theme}`)} | ${m.rooms}${t('dg_rooms')} | ${t(`dg_diff_${m.difficulty}`)}`);
  }
  console.log(t('dg_maps_hint'));
}

function checkLevelUp(lobster: import('../lib/types.js').Lobster): void {
  while (lobster.exp >= lobster.exp_to_next) {
    lobster.exp -= lobster.exp_to_next;
    lobster.level++;
    lobster.exp_to_next = calcExpToNext(lobster.level);
    const statKeys = ['hp', 'attack', 'defense', 'speed', 'intimidation', 'luck'] as const;
    const gains: string[] = [];
    for (const key of statKeys) {
      const gain = 1 + Math.floor(Math.random() * 3);
      (lobster.stats as unknown as Record<string, number>)[key] += gain;
      gains.push(`${key}+${gain}`);
    }
    console.log('\n' + t('level_up', { level: lobster.level, gains: gains.join(', ') }));
    if (lobster.level % 5 === 0) {
      console.log(t('molt_trigger'));
      lobster.status = 'molting' as const;
      lobster.molt_count++;
    }
  }
}
