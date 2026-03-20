import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { apiReportResult } from '../lib/api.js';
import type { Lobster, LobsterStats } from '../lib/types.js';

interface SimOpponent {
  id: string;
  name: string;
  level: number;
  stats: LobsterStats;
}

function simulateOpponent(level: number): SimOpponent {
  const r = (base: number) => base + Math.floor(Math.random() * 5) - 2;
  return {
    id: 'sim-' + Math.random().toString(36).slice(2, 10),
    name: ['深海小透明', '珊瑚刺客', '暗礁守卫', '潮汐霸王', '蓝甲隐者'][Math.floor(Math.random() * 5)],
    level: Math.max(1, level + Math.floor(Math.random() * 5) - 2),
    stats: {
      hp: r(10 + level * 2),
      attack: r(5 + level),
      defense: r(5 + level),
      speed: r(5 + level),
      intimidation: r(3 + Math.floor(level / 2)),
      luck: r(3 + Math.floor(level / 2)),
    },
  };
}

function runBattle(a: LobsterStats, b: LobsterStats): { winner: 'a' | 'b' | 'draw'; rounds: number; log: string[] } {
  let hpA = a.hp;
  let hpB = b.hp;
  const log: string[] = [];

  const first = a.speed > b.speed ? 'a' : b.speed > a.speed ? 'b' : (Math.random() > 0.5 ? 'a' : 'b');
  log.push(`先手: ${first === 'a' ? '我方' : '对手'} (速度 ${first === 'a' ? a.speed : b.speed})`);

  for (let round = 1; round <= 10; round++) {
    const [atk1, def1, atk2, def2] = first === 'a'
      ? [a, b, b, a]
      : [b, a, a, b];
    const [hp1Ref, hp2Ref] = first === 'a' ? ['hpB', 'hpA'] : ['hpA', 'hpB'];

    const dmg1 = Math.max(1, Math.floor((atk1.attack - def1.defense * 0.5) * (1 + Math.random() * 0.2)));
    if (hp1Ref === 'hpB') hpB -= dmg1; else hpA -= dmg1;
    log.push(`  R${round}: ${first === 'a' ? '我方' : '对手'}攻击 → ${dmg1} 伤害`);

    if ((hp1Ref === 'hpB' ? hpB : hpA) <= 0) {
      return { winner: first, rounds: round, log };
    }

    const dmg2 = Math.max(1, Math.floor((atk2.attack - def2.defense * 0.5) * (1 + Math.random() * 0.2)));
    if (hp2Ref === 'hpB') hpB -= dmg2; else hpA -= dmg2;
    log.push(`  R${round}: ${first === 'a' ? '对手' : '我方'}攻击 → ${dmg2} 伤害`);

    if ((hp2Ref === 'hpB' ? hpB : hpA) <= 0) {
      return { winner: first === 'a' ? 'b' : 'a', rounds: round, log };
    }
  }

  return { winner: 'draw', rounds: 10, log };
}

export async function battle(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n🥚 还没有龙虾。运行 npx clawfight hatch 来孵化一只！');
    return;
  }

  if (lobster.status !== 'active') {
    console.log(`\n⚠️  ${lobster.name} 当前状态为 ${lobster.status}，无法战斗。`);
    return;
  }

  const opponent = simulateOpponent(lobster.level);

  console.log('\n' + '⚔️'.repeat(20));
  console.log(`  ${lobster.name} (Lv.${lobster.level}) VS ${opponent.name} (Lv.${opponent.level})`);
  console.log('⚔️'.repeat(20));

  const result = runBattle(lobster.stats, opponent.stats);

  console.log();
  for (const line of result.log) {
    console.log(line);
  }

  const isWin = result.winner === 'a';
  const isDraw = result.winner === 'draw';

  let expGain: number;
  if (isDraw) {
    expGain = 10;
    console.log(`\n🤝 平局！${result.rounds} 回合后双方精疲力竭`);
  } else if (isWin) {
    expGain = 30;
    lobster.wins++;
    lobster.streak = Math.max(0, lobster.streak) + 1;
    lobster.reputation++;
    console.log(`\n🏆 胜利！${lobster.name} 在 ${result.rounds} 回合后击败了 ${opponent.name}！`);
  } else {
    expGain = 10;
    lobster.losses++;
    lobster.streak = Math.min(0, lobster.streak) - 1;
    lobster.reputation = Math.max(0, lobster.reputation - 1);
    console.log(`\n💀 失败…${lobster.name} 在 ${result.rounds} 回合后被 ${opponent.name} 击败。`);
  }

  const actual = Math.min(expGain, lobster.daily_exp_cap - lobster.today_exp);
  if (actual > 0) {
    lobster.exp += actual;
    lobster.today_exp += actual;
  }
  console.log(`经验 +${actual} | 战绩: ${lobster.wins}胜 ${lobster.losses}负 | 连胜: ${lobster.streak}`);

  lobster.last_battle = new Date().toISOString();

  const resultStr = isDraw ? '平局' : isWin ? '胜利' : '失败';
  await appendLog(`⚔️ VS ${opponent.name}(Lv.${opponent.level}) → ${resultStr} (${result.rounds}回合)`);

  await writeLobster(lobster);
}
