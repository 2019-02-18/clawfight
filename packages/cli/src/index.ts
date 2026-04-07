import { Command } from 'commander';
import { hatch } from './commands/hatch.js';
import { status } from './commands/status.js';
import { patrol } from './commands/patrol.js';
import { battle } from './commands/battle.js';
import { feed } from './commands/feed.js';
import { leaderboard } from './commands/leaderboard.js';
import { rest } from './commands/rest.js';
import { wake } from './commands/wake.js';
import { equip } from './commands/equip.js';
import { achievements } from './commands/achievements.js';
import { explore } from './commands/explore.js';

const CURRENT_VERSION = '1.5.1';

async function checkUpdate(): Promise<void> {
  try {
    const res = await fetch('https://registry.npmjs.org/@2025-6-19/clawfight/latest', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return;
    const data = await res.json() as { version?: string };
    if (data.version && data.version !== CURRENT_VERSION) {
      console.log(`\n🆕 新版本可用: v${data.version} (当前 v${CURRENT_VERSION})`);
      console.log(`   运行: npx @2025-6-19/clawfight@latest <command>\n`);
    }
  } catch { /* silent */ }
}

const program = new Command();

program
  .name('clawfight')
  .description('🦞 ClawFight — 龙虾电子宠物对战')
  .version(CURRENT_VERSION);

program
  .command('hatch')
  .description('孵化一只新龙虾')
  .argument('[name]', '为龙虾取名')
  .action(async (name?: string) => {
    await hatch(name);
  });

program
  .command('status')
  .description('查看龙虾状态')
  .action(async () => {
    await status();
  });

program
  .command('patrol')
  .description('巡逻签到，触发随机事件和遭遇')
  .action(async () => {
    await patrol();
  });

program
  .command('battle')
  .description('通过战斗码挑战指定对手')
  .argument('[code]', '对手的战斗码（排行榜中可见）')
  .action(async (code?: string) => {
    await battle(code);
  });

program
  .command('feed')
  .description('喂养龙虾')
  .argument('[food_type]', '食物类型: protein, algae, mineral')
  .action(async (foodType?: string) => {
    await feed(foodType);
  });

program
  .command('leaderboard')
  .alias('lb')
  .description('查看全球排行榜')
  .action(async () => {
    await leaderboard();
  });

program
  .command('rest')
  .description('进入休眠（暂停巡逻和战斗）')
  .action(async () => {
    await rest();
  });

program
  .command('wake')
  .description('从休眠中唤醒（附带恢复加成）')
  .action(async () => {
    await wake();
  });

program
  .command('equip')
  .description('装备管理（查看/穿戴/卸下/丢弃）')
  .argument('[action]', '编号(装备) / drop / unequip')
  .argument('[arg]', '编号或槽位(claw/shell/charm)')
  .action(async (action?: string, arg?: string) => {
    await equip(action, arg);
  });

program
  .command('achievements')
  .alias('ach')
  .description('查看成就')
  .action(async () => {
    await achievements();
  });

program
  .command('explore')
  .alias('dg')
  .description('地下城探索（进入/选择/放弃/查看地图）')
  .argument('[action]', '1|2(选择) / abandon(放弃) / maps(查看地图) / 地图编号(进入)')
  .action(async (action?: string) => {
    await explore(action);
  });

program.hook('postAction', async () => {
  await checkUpdate();
});

program.parse();
