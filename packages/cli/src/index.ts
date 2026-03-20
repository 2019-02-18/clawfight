import { Command } from 'commander';
import { hatch } from './commands/hatch.js';
import { status } from './commands/status.js';
import { patrol } from './commands/patrol.js';
import { battle } from './commands/battle.js';
import { feed } from './commands/feed.js';
import { leaderboard } from './commands/leaderboard.js';

const program = new Command();

program
  .name('clawfight')
  .description('🦞 ClawFight — 龙虾电子宠物对战')
  .version('0.1.0');

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
  .description('进行一场战斗')
  .action(async () => {
    await battle();
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

program.parse();
