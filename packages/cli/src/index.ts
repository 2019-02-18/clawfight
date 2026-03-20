import { Command } from 'commander';
import { hatch } from './commands/hatch.js';
import { status } from './commands/status.js';
import { patrol } from './commands/patrol.js';
import { battle } from './commands/battle.js';
import { feed } from './commands/feed.js';
import { leaderboard } from './commands/leaderboard.js';
import { rest } from './commands/rest.js';
import { wake } from './commands/wake.js';

const program = new Command();

program
  .name('clawfight')
  .description('🦞 ClawFight — 龙虾电子宠物对战')
  .version('1.3.0');

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

program.parse();
