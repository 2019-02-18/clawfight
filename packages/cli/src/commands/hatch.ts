import { randomUUID } from 'node:crypto';
import { readLobster, writeLobster, writeSoul, appendLog } from '../lib/memory.js';
import { generateSoul, buildSoulMarkdown } from '../lib/soul.js';
import { calcExpToNext, RARITY_WEIGHTS, RARITY_LABELS } from '../lib/types.js';
import type { Lobster, Rarity, LobsterStats } from '../lib/types.js';

function rollRarity(): Rarity {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    cumulative += weight;
    if (roll < cumulative) return rarity as Rarity;
  }
  return 'common';
}

function rollStats(): LobsterStats {
  const r = () => 5 + Math.floor(Math.random() * 11);
  return {
    hp: r(),
    attack: r(),
    defense: r(),
    speed: r(),
    intimidation: r(),
    luck: r(),
  };
}

const NAME_PREFIXES = ['铁钳', '深海', '暗礁', '珊瑚', '潮汐', '碎浪', '蓝甲', '赤壳', '影刺', '雷霆', '寒潮', '烈焰', '幽光', '破浪', '岩穴'];
const NAME_SUFFIXES = ['老六', '霸王', '独行侠', '小透明', '大将军', '守夜人', '探险家', '浪子', '刺客', '先锋', '隐者', '狂战士', '哲学家', '观察者', '漫游者'];

function randomName(): string {
  const p = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const s = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return p + s;
}

export async function hatch(name?: string): Promise<void> {
  const existing = await readLobster();
  if (existing) {
    console.log(`\n🦞 你已经有一只龙虾了：${existing.name}（Lv.${existing.level}）`);
    console.log('一人一虾，不可替代。');
    return;
  }

  const lobsterName = name || randomName();
  const rarity = rollRarity();
  const stats = rollStats();
  const soul = generateSoul();
  const now = new Date().toISOString();

  const lobster: Lobster = {
    id: randomUUID(),
    name: lobsterName,
    level: 1,
    exp: 0,
    exp_to_next: calcExpToNext(1),
    rarity,
    stats,
    soul,
    environment: 'coastal',
    status: 'active',
    wins: 0,
    losses: 0,
    streak: 0,
    reputation: 0,
    patrol_count: 0,
    molt_count: 0,
    created_at: now,
    last_patrol: '',
    last_battle: '',
    today_exp: 0,
    daily_exp_cap: 100,
  };

  await writeLobster(lobster);

  const soulMd = buildSoulMarkdown(lobsterName, soul, rarity, 'coastal');
  await writeSoul(soulMd);

  await appendLog(`🥚 **${lobsterName}** 破壳而出！稀有度：${RARITY_LABELS[rarity]}，环境：沿海浅滩`);

  console.log('\n' + '='.repeat(50));
  console.log('  🥚 → 🦞  孵 化 成 功 ！');
  console.log('='.repeat(50));
  console.log();
  console.log(`  名称: ${lobsterName}`);
  console.log(`  稀有度: ${RARITY_LABELS[rarity]} (${rarity})`);
  console.log(`  等级: Lv.1`);
  console.log(`  环境: 沿海浅滩`);
  console.log();
  console.log(`  ❤️  HP: ${stats.hp}    ⚔️  ATK: ${stats.attack}    🛡️  DEF: ${stats.defense}`);
  console.log(`  💨 SPD: ${stats.speed}    👁️  INT: ${stats.intimidation}    🍀 LCK: ${stats.luck}`);
  console.log();
  console.log(`  性格:`);
  console.log(`    勇气 ${soul.bravery}/10 | 好奇 ${soul.curiosity}/10 | 话量 ${soul.talkativeness}/10 | 脾气 ${soul.temper}/10`);
  console.log();
  console.log(`  ID: ${lobster.id}`);
  console.log('='.repeat(50));
  console.log();
  console.log('你的龙虾已经准备好探索海洋了！');
  console.log('运行 npx clawfight patrol 开始第一次巡逻。');
}
