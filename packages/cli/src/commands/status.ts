import { readLobster, readSoul } from '../lib/memory.js';
import { RARITY_LABELS, SLOT_ICONS, SLOT_LABELS, MAX_INVENTORY } from '../lib/types.js';
import type { EquipSlot } from '../lib/types.js';
import { formatEquip, getEffectiveStats } from '../lib/equipment.js';
import { t } from '../lib/i18n.js';

function bar(current: number, max: number, width = 20): string {
  const filled = Math.round((current / Math.max(max, 1)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export async function status(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n' + t('no_lobster'));
    return;
  }

  const totalBattles = lobster.wins + lobster.losses;
  const winRate = totalBattles > 0 ? Math.round((lobster.wins / totalBattles) * 100) : 0;
  const expPct = lobster.exp_to_next > 0 ? Math.round((lobster.exp / lobster.exp_to_next) * 100) : 0;
  const eff = getEffectiveStats(lobster);

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
  console.log(`│  环境: ${lobster.environment.padEnd(20)} 深度: ${String(lobster.depth ?? 0).padEnd(13)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  EXP: ${bar(lobster.exp, lobster.exp_to_next)} ${String(expPct).padStart(3)}%  │`);
  console.log(`│       ${String(lobster.exp).padStart(5)} / ${String(lobster.exp_to_next).padEnd(28)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  ❤️  HP:  ${String(eff.hp).padEnd(6)} ⚔️  ATK: ${String(eff.attack).padEnd(15)}│`);
  console.log(`│  🛡️  DEF: ${String(eff.defense).padEnd(6)} 💨 SPD: ${String(eff.speed).padEnd(15)}│`);
  console.log(`│  👁️  INT: ${String(eff.intimidation).padEnd(6)} 🍀 LCK: ${String(eff.luck).padEnd(15)}│`);
  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  战绩: ${lobster.wins}胜 ${lobster.losses}负 (胜率${winRate}%)${' '.repeat(Math.max(0, 20 - String(lobster.wins).length - String(lobster.losses).length - String(winRate).length))}│`);
  console.log(`│  连胜: ${lobster.streak}  声望: ${lobster.reputation}  巡逻: ${lobster.patrol_count}${' '.repeat(Math.max(0, 15 - String(lobster.streak).length - String(lobster.reputation).length - String(lobster.patrol_count).length))}│`);

  const slots: EquipSlot[] = ['claw', 'shell', 'charm'];
  const hasEquip = slots.some(s => lobster.equipped?.[s]);
  if (hasEquip) {
    console.log('├' + '─'.repeat(44) + '┤');
    for (const s of slots) {
      const eq = lobster.equipped?.[s];
      const label = `${SLOT_ICONS[s]} ${SLOT_LABELS[s]}`;
      const lv = eq && (eq.level ?? 1) > 1 ? `+${eq.level}` : '';
      const info = eq ? `${eq.name}${lv}(${eq.durability}/${eq.max_durability})` : '-';
      console.log(`│  ${label}: ${info.padEnd(36)}│`);
    }
  }

  const invCount = lobster.inventory?.length ?? 0;
  if (invCount > 0) {
    console.log(`│  📦 背包: ${invCount}/${MAX_INVENTORY}${' '.repeat(31 - String(invCount).length - String(MAX_INVENTORY).length)}│`);
  }

  console.log('├' + '─'.repeat(44) + '┤');
  console.log(`│  性格:                                     │`);
  console.log(`│    勇气 ${lobster.soul.bravery}/10 | 好奇 ${lobster.soul.curiosity}/10 | 话量 ${lobster.soul.talkativeness}/10 | 脾气 ${lobster.soul.temper}/10  │`);

  const mapCount = lobster.dungeon_maps?.length ?? 0;
  const dgCompleted = lobster.dungeons_completed ?? 0;
  if (mapCount > 0 || dgCompleted > 0) {
    console.log(`│  🏰 地下城: ${dgCompleted}通关  🗺️ 地图: ${mapCount}${' '.repeat(Math.max(0, 19 - String(dgCompleted).length - String(mapCount).length))}│`);
  }
  if (lobster.active_dungeon) {
    console.log(`│  ⚡ 进行中地下城: 有${' '.repeat(24)}│`);
  }

  const achieveCount = lobster.achievements?.length ?? 0;
  if (achieveCount > 0) {
    console.log(`│  🏆 成就: ${achieveCount}${' '.repeat(33 - String(achieveCount).length)}│`);
  }

  console.log('└' + '─'.repeat(44) + '┘');

  console.log('\n' + t('status_battle_code', { code: lobster.id.slice(0, 8) }));

  const soulText = await readSoul();
  if (soulText) {
    const firstLine = soulText.split('\n').find(l => l.trim() && !l.startsWith('#'));
    if (firstLine) console.log(`📜 灵魂: ${firstLine.trim().slice(0, 60)}`);
  }
}
