import { readLobster, writeLobster, appendLog } from '../lib/memory.js';

const FOOD_TYPES: Record<string, { exp: number; label: string; statBias: string }> = {
  protein: { exp: 15, label: '高蛋白食物', statBias: 'attack' },
  algae: { exp: 10, label: '藻类食物', statBias: 'hp' },
  mineral: { exp: 12, label: '矿物质', statBias: 'defense' },
};

export async function feed(foodType?: string): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n🥚 还没有龙虾。运行 npx clawfight hatch 来孵化一只！');
    return;
  }

  if (!foodType || !FOOD_TYPES[foodType]) {
    console.log('\n🍽️  可用食物类型:');
    for (const [key, info] of Object.entries(FOOD_TYPES)) {
      console.log(`  ${key.padEnd(10)} — ${info.label} (+${info.exp} EXP, ${info.statBias} 偏向)`);
    }
    console.log('\n用法: npx clawfight feed <food_type>');
    return;
  }

  const food = FOOD_TYPES[foodType];
  const actual = Math.min(food.exp, lobster.daily_exp_cap - lobster.today_exp);

  if (actual <= 0) {
    console.log(`\n⚠️  ${lobster.name} 今天已经吃饱了（每日经验上限 ${lobster.daily_exp_cap}）`);
    return;
  }

  lobster.exp += actual;
  lobster.today_exp += actual;

  const stats = lobster.stats as Record<string, number>;
  if (food.statBias in stats) {
    const bonus = Math.random() > 0.5 ? 1 : 0;
    if (bonus > 0) {
      stats[food.statBias] += bonus;
      console.log(`\n🍽️  ${lobster.name} 吃了 ${food.label}！`);
      console.log(`   经验 +${actual} | ${food.statBias} +${bonus}`);
    } else {
      console.log(`\n🍽️  ${lobster.name} 吃了 ${food.label}！`);
      console.log(`   经验 +${actual}`);
    }
  }

  await appendLog(`🍽️ 喂食: ${food.label} → EXP+${actual}`);
  await writeLobster(lobster);

  console.log(`   今日经验: ${lobster.today_exp}/${lobster.daily_exp_cap}`);
}
