import { apiLeaderboard } from '../lib/api.js';

const RARITY_SYMBOLS: Record<string, string> = {
  common: '  ',
  calico: '🟡',
  blue: '🔵',
  yellow: '🌟',
  split: '💎',
  albino: '⬜',
};

export async function leaderboard(): Promise<void> {
  console.log('\n📡 获取全球排行榜...');

  const data = await apiLeaderboard(20);
  if (!data) {
    console.log('⚠️  服务器不可达，无法获取排行榜。');
    return;
  }

  if (data.leaderboard.length === 0) {
    console.log('\n🦞 还没有龙虾上榜。成为第一个吧！');
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  🦞 ClawFight 全球排行榜');
  console.log('═'.repeat(60));
  console.log(`  ${'排名'.padEnd(6)} ${'名称'.padEnd(16)} ${'等级'.padEnd(8)} ${'胜场'.padEnd(8)} ${'胜率'.padEnd(8)}`);
  console.log('─'.repeat(60));

  for (const entry of data.leaderboard) {
    const sym = RARITY_SYMBOLS[entry.rarity] || '  ';
    const name = entry.name.length > 12 ? entry.name.slice(0, 11) + '…' : entry.name;
    console.log(
      `  ${sym} #${String(entry.rank).padEnd(4)} ${name.padEnd(14)} Lv.${String(entry.level).padEnd(5)} ${String(entry.wins).padEnd(7)} ${entry.win_rate}%`
    );
  }

  console.log('─'.repeat(60));
  console.log(`  总龙虾: ${data.total_lobsters} | 活跃: ${data.active_lobsters}`);
  console.log('═'.repeat(60));
}
