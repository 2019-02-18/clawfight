import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { apiPatrol } from '../lib/api.js';
import { rollEvent, applyEventEffects } from '../lib/events.js';
import { calcExpToNext } from '../lib/types.js';

const PATROL_EXP = 15;

export async function patrol(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n🥚 还没有龙虾。运行 npx clawfight hatch 来孵化一只！');
    return;
  }

  if (lobster.status === 'molting') {
    console.log(`\n🟡 ${lobster.name} 正在蜕壳中，无法巡逻。`);
    return;
  }
  if (lobster.status === 'hibernating') {
    console.log(`\n💤 ${lobster.name} 正在冬眠中，无法巡逻。`);
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const lastDay = lobster.last_patrol ? lobster.last_patrol.split('T')[0] : '';
  if (today !== lastDay) {
    lobster.today_exp = 0;
  }

  console.log(`\n🦞 ${lobster.name} 开始巡逻...`);
  console.log('─'.repeat(40));

  const expGain = Math.min(PATROL_EXP, lobster.daily_exp_cap - lobster.today_exp);
  if (expGain > 0) {
    lobster.exp += expGain;
    lobster.today_exp += expGain;
    console.log(`📍 巡逻签到 → 经验 +${expGain}`);
  }

  const eventResult = await rollEvent(lobster);
  if (eventResult) {
    console.log();
    console.log(`🎲 [${eventResult.event.category}] ${eventResult.event.id}`);
    console.log(`   ${eventResult.narrative}`);
    const changes = applyEventEffects(lobster, eventResult.event.effects as Record<string, unknown>);
    if (changes.length > 0) {
      console.log(`   效果: ${changes.join(', ')}`);
    }
    await appendLog(`🎲 事件「${eventResult.event.id}」: ${eventResult.narrative.slice(0, 60)}...`);
  }

  checkLevelUp(lobster);

  lobster.patrol_count++;
  lobster.last_patrol = new Date().toISOString();

  console.log('\n📡 连接服务器...');
  const serverResponse = await apiPatrol(lobster);

  if (serverResponse) {
    if (serverResponse.encounter && serverResponse.opponent) {
      console.log(`⚔️  遭遇！对手: ${serverResponse.opponent.name} (Lv.${serverResponse.opponent.level})`);
      console.log(`   战斗种子: ${serverResponse.battle_seed}`);
      console.log(`   使用 npx clawfight battle 来处理这场战斗！`);
      await appendLog(`⚔️ 遭遇 ${serverResponse.opponent.name} (Lv.${serverResponse.opponent.level})`);
    } else {
      console.log(`✅ 巡逻完成，匹配池: ${serverResponse.pool_size} 只龙虾`);
    }
  } else {
    console.log('⚠️  服务器不可达，跳过在线签到');
  }

  await writeLobster(lobster);

  console.log('─'.repeat(40));
  console.log(`📊 当前: Lv.${lobster.level} | EXP: ${lobster.exp}/${lobster.exp_to_next} | 今日EXP: ${lobster.today_exp}/${lobster.daily_exp_cap}`);
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

    console.log(`\n🎉 升级！Lv.${l.level}! [${gains.join(', ')}]`);

    if (l.level % 5 === 0) {
      console.log('🐚 触发蜕壳事件！龙虾进入蜕壳状态...');
      l.status = 'molting' as const;
      l.molt_count++;
    }
  }
}
