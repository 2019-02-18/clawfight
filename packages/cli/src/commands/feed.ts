import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { t } from '../lib/i18n.js';

const FOOD_TYPES: Record<string, { exp: number; labelKey: string; statBias: string }> = {
  protein: { exp: 15, labelKey: 'food_protein', statBias: 'attack' },
  algae: { exp: 10, labelKey: 'food_algae', statBias: 'hp' },
  mineral: { exp: 12, labelKey: 'food_mineral', statBias: 'defense' },
};

export async function feed(foodType?: string): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n' + t('no_lobster'));
    return;
  }

  if (!foodType || !FOOD_TYPES[foodType]) {
    console.log('\n' + t('feed_menu_title'));
    for (const [key, info] of Object.entries(FOOD_TYPES)) {
      console.log(`  ${key.padEnd(10)} — ${t(info.labelKey)} (+${info.exp} EXP, ${info.statBias})`);
    }
    console.log('\n' + t('feed_menu_usage'));
    return;
  }

  const food = FOOD_TYPES[foodType];
  const actual = Math.min(food.exp, lobster.daily_exp_cap - lobster.today_exp);

  if (actual <= 0) {
    console.log('\n' + t('feed_full', { name: lobster.name, cap: lobster.daily_exp_cap }));
    return;
  }

  lobster.exp += actual;
  lobster.today_exp += actual;

  const foodLabel = t(food.labelKey);
  const stats = lobster.stats as Record<string, number>;
  if (food.statBias in stats) {
    const bonus = Math.random() > 0.5 ? 1 : 0;
    console.log('\n' + t('feed_ate', { name: lobster.name, food: foodLabel }));
    if (bonus > 0) {
      stats[food.statBias] += bonus;
      console.log(t('feed_exp_stat', { exp: actual, stat: food.statBias, bonus }));
    } else {
      console.log(t('feed_exp', { exp: actual }));
    }
  }

  await appendLog(`🍽️ ${foodLabel} → EXP+${actual}`);
  await writeLobster(lobster);

  console.log(t('feed_today', { today: lobster.today_exp, cap: lobster.daily_exp_cap }));
}
