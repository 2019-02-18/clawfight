import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { apiBattle } from '../lib/api.js';
import { t } from '../lib/i18n.js';

export async function battle(opponentCode?: string): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n' + t('no_lobster'));
    return;
  }

  if (lobster.status !== 'active') {
    console.log('\n' + t('status_cant_fight', { name: lobster.name, status: lobster.status }));
    return;
  }

  if (!opponentCode) {
    console.log('\n' + t('battle_no_code'));
    console.log(t('battle_usage'));
    console.log(t('battle_hint'));
    return;
  }

  console.log('\n' + t('battle_connecting', { code: opponentCode }));

  const result = await apiBattle(lobster.id, opponentCode);

  if (!result) {
    console.log(t('battle_server_down'));
    return;
  }

  if (result.error) {
    console.log(`⚠️  ${result.error}`);
    return;
  }

  const opp = result.opponent as { name: string; level: number; code: string };
  const myResult = result.result as string;
  const rounds = result.rounds as number;
  const expGain = result.exp_gain as number;

  console.log('\n' + '⚔️'.repeat(20));
  console.log(`  ${lobster.name} (Lv.${lobster.level}) VS ${opp.name} (Lv.${opp.level})`);
  console.log('⚔️'.repeat(20));

  if (myResult === 'win') {
    lobster.wins++;
    lobster.streak = Math.max(0, lobster.streak) + 1;
    lobster.reputation++;
    console.log('\n' + t('battle_win', { name: lobster.name, opponent: opp.name, rounds }));
  } else if (myResult === 'loss') {
    lobster.losses++;
    lobster.streak = Math.min(0, lobster.streak) - 1;
    lobster.reputation = Math.max(0, lobster.reputation - 1);
    console.log('\n' + t('battle_loss', { name: lobster.name, opponent: opp.name, rounds }));
  } else {
    console.log('\n' + t('battle_draw', { rounds }));
  }

  const actual = Math.min(expGain, lobster.daily_exp_cap - lobster.today_exp);
  if (actual > 0) {
    lobster.exp += actual;
    lobster.today_exp += actual;
  }
  lobster.last_battle = new Date().toISOString();

  console.log(t('battle_exp', { exp: actual, wins: lobster.wins, losses: lobster.losses, streak: lobster.streak }));

  await appendLog(`⚔️ VS ${opp.name}(Lv.${opp.level}) → ${myResult} (${rounds}R)`);
  await writeLobster(lobster);
}
