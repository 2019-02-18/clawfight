import { apiLeaderboard } from '../lib/api.js';
import { t } from '../lib/i18n.js';

const RARITY_SYMBOLS: Record<string, string> = {
  common: '  ',
  calico: '🟡',
  blue: '🔵',
  yellow: '🌟',
  split: '💎',
  albino: '⬜',
};

export async function leaderboard(): Promise<void> {
  console.log('\n' + t('lb_loading'));

  const data = await apiLeaderboard(20);
  if (!data) {
    console.log(t('lb_offline'));
    return;
  }

  if (data.leaderboard.length === 0) {
    console.log('\n' + t('lb_empty'));
    return;
  }

  console.log('\n' + '═'.repeat(70));
  console.log(t('lb_title'));
  console.log('═'.repeat(70));
  console.log(t('lb_header'));
  console.log('─'.repeat(70));

  for (const entry of data.leaderboard) {
    const sym = RARITY_SYMBOLS[entry.rarity] || '  ';
    const name = entry.name.length > 12 ? entry.name.slice(0, 11) + '…' : entry.name;
    const code = entry.id.slice(0, 8);
    console.log(
      `  ${sym} #${String(entry.rank).padEnd(4)} ${name.padEnd(14)} Lv.${String(entry.level).padEnd(5)} ${String(entry.wins).padEnd(7)} ${String(entry.win_rate).padEnd(3)}%    ${code}`
    );
  }

  console.log('─'.repeat(70));
  console.log(t('lb_total', { total: data.total_lobsters, active: data.active_lobsters }));
  console.log(t('lb_hint'));
  console.log('═'.repeat(70));
}
