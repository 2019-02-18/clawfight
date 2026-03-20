import { readLobster, readSoul } from '../lib/memory.js';
import { RARITY_LABELS } from '../lib/types.js';

function bar(current: number, max: number, width = 20): string {
  const filled = Math.round((current / Math.max(max, 1)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export async function status(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n🥚 还没有龙虾。运行 npx clawfight hatch 来孵化一只！');
    return;
  }

  const totalBattles = lobster.wins + lobster.losses;
  const winRate = totalBattles > 0 ? Math.round((lobster.wins / totalBattles) * 100) : 0;
  const expPct = lobster.exp_to_next > 0 ? Math.round((lobster.exp / lobster.exp_to_next) * 100) : 0;

  const statusEmoji: Record<string, string> = {
    active: '🟢 活跃',
    molting: '🟡 蜕壳中',
    hibernating: '💤 冬眠中',
  };

  console.log('\n' + '┌' + '─'.repeat(44) + '┐');
  console.log(`│  🦞 ${lobster.name.padEnd(38)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  等级: Lv.${String(lobster.level).padEnd(5)} 稀有度: ${(RARITY_LABELS[lobster.rarity] || lobster.rarity).padEnd(15)}│`);
  console.log(`│  状态: ${(statusEmoji[lobster.status] || lobster.status).padEnd(36)}│`);
  console.log(`│  环境: ${lobster.environment.padEnd(36)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  EXP: ${bar(lobster.exp, lobster.exp_to_next)} ${String(expPct).padStart(3)}%  │`);
  console.log(`│       ${String(lobster.exp).padStart(5)} / ${String(lobster.exp_to_next).padEnd(28)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  ❤️  HP:  ${String(lobster.stats.hp).padEnd(6)} ⚔️  ATK: ${String(lobster.stats.attack).padEnd(15)}│`);
  console.log(`│  🛡️  DEF: ${String(lobster.stats.defense).padEnd(6)} 💨 SPD: ${String(lobster.stats.speed).padEnd(15)}│`);
  console.log(`│  👁️  INT: ${String(lobster.stats.intimidation).padEnd(6)} 🍀 LCK: ${String(lobster.stats.luck).padEnd(15)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  战绩: ${lobster.wins}胜 ${lobster.losses}负 (胜率${winRate}%)${' '.repeat(Math.max(0, 20 - String(lobster.wins).length - String(lobster.losses).length - String(winRate).length))}│`);
  console.log(`│  连胜: ${lobster.streak}  声望: ${lobster.reputation}  巡逻: ${lobster.patrol_count}${' '.repeat(Math.max(0, 15 - String(lobster.streak).length - String(lobster.reputation).length - String(lobster.patrol_count).length))}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  性格:                                     │`);
  console.log(`│    勇气 ${lobster.soul.bravery}/10 | 好奇 ${lobster.soul.curiosity}/10 | 话量 ${lobster.soul.talkativeness}/10 | 脾气 ${lobster.soul.temper}/10  │`);
  console.log('└' + '─'.repeat(44) + '┘');

  const soulText = await readSoul();
  if (soulText) {
    const firstLine = soulText.split('\n').find(l => l.trim() && !l.startsWith('#'));
    if (firstLine) {
      console.log(`\n📜 灵魂: ${firstLine.trim().slice(0, 60)}`);
    }
  }
}
