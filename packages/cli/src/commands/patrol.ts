import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { apiPatrol } from '../lib/api.js';
import { rollEvent, applyEventEffects } from '../lib/events.js';
import { calcExpToNext } from '../lib/types.js';
import { t } from '../lib/i18n.js';

const PATROL_EXP = 15;

export async function patrol(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n' + t('no_lobster'));
    return;
  }

  if (lobster.status === 'molting') {
    console.log('\n' + t('status_cant_patrol_molt', { name: lobster.name }));
    return;
  }
  if (lobster.status === 'hibernating') {
    console.log('\n' + t('status_cant_patrol_hibernate', { name: lobster.name }));
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const lastDay = lobster.last_patrol ? lobster.last_patrol.split('T')[0] : '';
  if (today !== lastDay) {
    lobster.today_exp = 0;
  }

  console.log('\n' + t('patrol_start', { name: lobster.name }));
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
    if (changes.length > 0) {
      console.log(t('event_effects', { changes: changes.join(', ') }));
    }
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
      }

      const battleExp = Math.min(br.exp_gain, lobster.daily_exp_cap - lobster.today_exp);
      if (battleExp > 0) {
        lobster.exp += battleExp;
        lobster.today_exp += battleExp;
      }
      lobster.last_battle = new Date().toISOString();
      console.log(t('patrol_exp_stats', { exp: battleExp, wins: lobster.wins, losses: lobster.losses, streak: lobster.streak }));
      await appendLog(`⚔️ VS ${opp.name}(Lv.${opp.level}) → ${br.result} (${br.rounds}R)`);
      checkLevelUp(lobster);
    } else if (serverResponse.encounter && serverResponse.opponent) {
      console.log(t('patrol_no_battle', { name: serverResponse.opponent.name, level: serverResponse.opponent.level }));
    } else {
      console.log(t('patrol_done', { pool: serverResponse.pool_size || 0 }));
    }
  } else {
    console.log(t('patrol_offline'));
  }

  await writeLobster(lobster);

  console.log('─'.repeat(40));
  console.log(t('patrol_summary', { level: lobster.level, exp: lobster.exp, next: lobster.exp_to_next, today: lobster.today_exp, cap: lobster.daily_exp_cap }));
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
