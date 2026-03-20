import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { t } from '../lib/i18n.js';

export async function wake(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n' + t('no_lobster'));
    return;
  }

  if (lobster.status !== 'hibernating') {
    console.log('\n' + t('wake_not_sleeping', { name: lobster.name }));
    return;
  }

  const sleepStart = lobster.hibernated_at ? new Date(lobster.hibernated_at) : new Date();
  const hoursSlept = Math.max(0, (Date.now() - sleepStart.getTime()) / (1000 * 60 * 60));

  const bonuses: string[] = [];
  const stats = lobster.stats as Record<string, number>;

  if (hoursSlept >= 24) {
    stats.hp += 2;
    stats.defense += 1;
    const expBonus = Math.min(20, lobster.daily_exp_cap - lobster.today_exp);
    if (expBonus > 0) {
      lobster.exp += expBonus;
      lobster.today_exp += expBonus;
      bonuses.push(`EXP +${expBonus}`);
    }
    bonuses.push('HP +2', 'DEF +1');
  } else if (hoursSlept >= 12) {
    stats.hp += 1;
    stats.defense += 1;
    bonuses.push('HP +1', 'DEF +1');
  } else if (hoursSlept >= 4) {
    stats.hp += 1;
    bonuses.push('HP +1');
  }

  lobster.status = 'active';
  delete lobster.hibernated_at;

  await writeLobster(lobster);

  const duration = hoursSlept < 1
    ? t('duration_minutes', { n: Math.round(hoursSlept * 60) })
    : t('duration_hours', { n: Math.round(hoursSlept) });

  const bonusStr = bonuses.length > 0
    ? bonuses.join(', ')
    : t('wake_no_bonus');

  await appendLog(`☀️ ${lobster.name} woke (${duration}) → ${bonusStr}`);

  console.log('\n' + '─'.repeat(40));
  console.log(t('wake_desc', { name: lobster.name }));
  console.log(t('wake_duration', { duration }));
  console.log(t('wake_bonus', { bonus: bonusStr }));
  console.log('─'.repeat(40));
  console.log('\n' + t('wake_ready', { name: lobster.name }));
}
