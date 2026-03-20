import { readLobster, writeLobster, appendLog } from '../lib/memory.js';

export async function rest(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n🥚 还没有龙虾。运行 npx clawfight hatch 来孵化一只！');
    return;
  }

  if (lobster.status === 'hibernating') {
    console.log(`\n💤 ${lobster.name} 已经在休眠中了。运行 npx clawfight wake 来唤醒它。`);
    return;
  }

  if (lobster.status === 'molting') {
    console.log(`\n🟡 ${lobster.name} 正在蜕壳，不能休眠。等蜕壳结束再来。`);
    return;
  }

  lobster.status = 'hibernating';
  lobster.hibernated_at = new Date().toISOString();

  await writeLobster(lobster);
  await appendLog(`💤 ${lobster.name} 进入休眠`);

  console.log('\n' + '─'.repeat(40));
  console.log(`💤 ${lobster.name} 缓缓沉入海底沙地...`);
  console.log('   龙虾蜷缩起触须，安静地休息。');
  console.log('   休眠期间不会参与巡逻和战斗。');
  console.log('   醒来后会获得恢复加成！');
  console.log('─'.repeat(40));
  console.log('\n运行 npx clawfight wake 来唤醒它。');
}
