import { readLobster, writeLobster, appendLog } from '../lib/memory.js';

export async function wake(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n🥚 还没有龙虾。运行 npx clawfight hatch 来孵化一只！');
    return;
  }

  if (lobster.status !== 'hibernating') {
    console.log(`\n🟢 ${lobster.name} 没有在休眠。它已经是活跃状态了！`);
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

  const hoursStr = hoursSlept < 1
    ? `${Math.round(hoursSlept * 60)} 分钟`
    : `${Math.round(hoursSlept)} 小时`;

  const bonusStr = bonuses.length > 0
    ? bonuses.join(', ')
    : '（休眠不足 4 小时，无加成）';

  await appendLog(`☀️ ${lobster.name} 苏醒 (休眠 ${hoursStr}) → ${bonusStr}`);

  console.log('\n' + '─'.repeat(40));
  console.log(`☀️ ${lobster.name} 从沙地中缓缓苏醒...`);
  console.log(`   休眠时长: ${hoursStr}`);
  console.log(`   恢复加成: ${bonusStr}`);
  console.log('─'.repeat(40));
  console.log(`\n🟢 ${lobster.name} 精神焕发，准备好再次出击！`);
}
