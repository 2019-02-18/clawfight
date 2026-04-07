# ClawFight 🦞

> One person, one lobster. Irreplaceable. The soul evolves with experience.
>
> 一人一虾，不可替代，灵魂随经历演化。

[![npm version](https://img.shields.io/npm/v/@2025-6-19/clawfight)](https://www.npmjs.com/package/@2025-6-19/clawfight)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ClawFight is an **OpenClaw Skill** that gives every user a unique battle lobster pet.
Your lobster patrols autonomously, triggers random events inspired by real lobster biology,
encounters other players' lobsters, and evolves a distinct personality ("soul") over time.

ClawFight 是一个 **OpenClaw Skill**——龙虾电子宠物对战游戏。
每只龙虾拥有独立的性格灵魂，会随经历演化：连败变沉默，连胜变嚣张。

## Features / 特性

- **Unique Soul System** — 4-axis personality (bravery, curiosity, talkativeness, temper) that evolves through gameplay / 四维性格系统，随游戏演化
- **Real Lobster Biology** — 37 random events inspired by actual lobster behavior (urine signaling, tail-flip escape, etc.) / 37 个基于真实龙虾生物学的随机事件
- **6 Rarity Tiers** — common, calico, blue, yellow, split, albino (0.2%!) / 6 种稀有度
- **Idle Automation** — Integrates with OpenClaw heartbeat for fully autonomous gameplay / 支持心跳集成，全自动放置
- **Global PvP** — Encounter and battle other players' lobsters via matchmaking / 全球 PvP 匹配对战
- **Deterministic Battles** — Server-verified combat with seeded RNG for fair play / 服务端验证的确定性战斗
- **Leaderboard** — Global rankings at api.clawfight.online / 全球排行榜

## Quick Start / 快速开始

```bash
# Hatch your lobster / 孵化龙虾
npx @2025-6-19/clawfight hatch

# Check status / 查看状态
npx @2025-6-19/clawfight status

# Go on patrol / 巡逻签到
npx @2025-6-19/clawfight patrol

# Feed your lobster / 喂养
npx @2025-6-19/clawfight feed protein

# Challenge by battle code / 通过战斗码挑战
npx @2025-6-19/clawfight battle <code>

# View leaderboard / 排行榜
npx @2025-6-19/clawfight leaderboard

# Manage equipment / 装备管理
npx @2025-6-19/clawfight equip

# View achievements / 查看成就
npx @2025-6-19/clawfight achievements

# Hibernate (resets depth) / 休眠（重置深度）
npx @2025-6-19/clawfight rest

# Wake up / 唤醒
npx @2025-6-19/clawfight wake

# Dungeon exploration / 地下城探索
npx @2025-6-19/clawfight explore        # Enter or resume
npx @2025-6-19/clawfight explore 1      # Choose option 1
npx @2025-6-19/clawfight explore maps   # View dungeon maps
```

## Architecture / 架构

This is a monorepo with three products:

| Package | Purpose | Deploy Target |
|---|---|---|
| `packages/skill` | OpenClaw Skill definition (pure Markdown) | ClawHub |
| `packages/cli` | npm CLI package (`@2025-6-19/clawfight`) | npm registry |
| `packages/api` | Backend API (Cloudflare Workers) | api.clawfight.online |

```
clawfight/
├── packages/
│   ├── skill/          ← ClawHub Skill (Markdown only, zero code)
│   ├── cli/            ← npm package (TypeScript CLI)
│   └── api/            ← Cloudflare Workers (TypeScript API)
├── package.json        ← npm workspaces monorepo
└── tsconfig.base.json
```

## For OpenClaw Users / OpenClaw 用户指南

### Install as OpenClaw Skill / 安装为 OpenClaw Skill

Place the contents of `packages/skill/` into your OpenClaw skills directory.
The Skill integrates with your agent's heartbeat for automatic patrols.

将 `packages/skill/` 的内容放入你的 OpenClaw skills 目录即可。
Skill 会与 Agent 心跳集成实现自动巡逻。

### Heartbeat Integration / 心跳集成

Add to your HEARTBEAT.md:

```markdown
- Run `npx @2025-6-19/clawfight patrol` for lobster patrol
```

## Development / 开发

```bash
# Install dependencies
npm install

# Build CLI
npm run build:cli

# Dev mode (watch)
npm run dev:cli

# Deploy API
npm run deploy:api
```

## Game Mechanics / 游戏机制

### Rarity / 稀有度

| Rarity | Probability | Color |
|---|---|---|
| Common / 普通 | 70% | 🟤 |
| Calico / 花斑 | 20% | 🟡 |
| Blue / 蓝色 | 7% | 🔵 |
| Yellow / 黄金 | 2% | 🌟 |
| Split / 双色 | 0.8% | 💎 |
| Albino / 白化 | 0.2% | ⬜ |

### Stats / 属性

Each lobster has 6 stats (5-15 base): HP, Attack, Defense, Speed, Intimidation, Luck

### Soul / 灵魂

4 personality axes (1-10 each), directly affect gameplay:

| Trait | High (≥7) | Low (≤3) |
|---|---|---|
| **Bravery / 勇气** | +10% drop rate, depth loss -1 | -10% drop rate, durability +2 |
| **Curiosity / 好奇** | Equipment level +1, extra events | Event effects +50% |
| **Talkativeness / 话量** | — | Stealth: rarity boost |
| **Temper / 脾气** | Win EXP ×1.2, depth loss -3 | Balanced, stable |

The lobster **autonomously** manages equipment based on personality:
- Auto-equips better gear found during patrol (compares power score)
- Auto-discards weakest item when inventory is full
- Decision reasons reflect personality traits (e.g. "勇猛本能", "谨慎直觉")

### Equipment / 装备 (v1.4)

3 slots: ⚔️ Claw (ATK/SPD), 🛡️ Shell (HP/DEF), 💎 Charm (LCK/INT)

**Quality Level** `+1` ~ `+5`: determined by depth and curiosity, multiplies stat bonuses.
Display format: `[稀有+3] 珊瑚刺钳 ATK+6 SPD+3 (12/12)`

| Rarity | Drop Weight | Bonus Mult | Durability | Level formula |
|---|---|---|---|---|
| Common / 普通 | 60% | 1x | 8 | `floor(depth/3)+1` |
| Rare / 稀有 | 25% | 2x | 12 | +1 if curiosity ≥7 |
| Epic / 史诗 | 12% | 3x | 18 | cap: 5 |
| Legendary / 传说 | 3% | 5x | 30 | |

- Stat bonus = `ceil(random * 2 * rarityMul * (1 + (level-1) * 0.3))`
- Equipment degrades on battle; breaks at 0 durability
- Inventory limit: 6 items
- Power score: `sum(bonuses) × rarityPower × level × (durability%)`

### Depth System / 深度系统 (v1.4)

Roguelike risk/reward core mechanic:
- Each patrol: depth +1
- Higher depth: better drop chance (25% + 5%/depth, cap 80%) and rarity/level boost
- Battle loss: depth penalty varies by temper (-1 brave / -2 normal / -3 hot-tempered)
- Rest/hibernate: depth resets to 0
- Push deeper for better loot, or rest to play safe

### Battle / 战斗

- Damage: `max(1, ATK - DEF * 0.5) * (1 + random * 0.2)`
- Initiative: higher Speed goes first
- Max 10 rounds
- Win: +30 EXP, Loss: +10 EXP

## API Endpoints / API 接口

| Endpoint | Method | Purpose |
|---|---|---|
| `api.clawfight.online/api/patrol` | POST | Patrol check-in, auto-battle & encounter |
| `api.clawfight.online/api/battle` | POST | Challenge by battle code |
| `api.clawfight.online/api/leaderboard` | GET | Global leaderboard |
| `api.clawfight.online/api/encounter` | GET | Get pending results |
| `api.clawfight.online/api/result` | POST | Report battle result (legacy) |

## Security / 安全

- No system file access (SSH keys, browser data, etc.)
- No PII collection; only lobster ID, level, stats hash, battle results
- All data stored locally in `memory/clawfight/`
- Network requests only to `api.clawfight.online`
- Server-authoritative battle results; client cannot fake wins/losses
- Patrol cooldown (30 min) and battle cooldown (10 min) to prevent abuse
- i18n: auto-detects system locale (Chinese for zh, English for all others)

## Roadmap / 未来规划

### v1.4 — Roguelike Patrol / 肉鸽巡逻 ✅

> Patrol deeper, risk more, earn better loot.
> 越深入越危险，奖励也越丰厚。

- [x] **Equipment System / 装备系统** — 3 slots (claw/shell/charm), random drops during patrol with 4 rarity tiers, durability wear / 三个装备槽位，巡逻随机掉落，四种稀有度，耐久磨损
- [x] **Depth System / 深度系统** — Consecutive patrols increase depth → better loot & rarity, but loss costs depth. Rest resets to 0. Classic roguelike risk/reward loop / 连续巡逻增加深度→更好掉落，失败扣深度，休眠归零
- [x] **Achievement System / 成就系统** — 12 milestone achievements auto-checked on patrol (first win, streaks, depth, full equip) / 12个里程碑成就，巡逻时自动检测解锁

### v1.5 — Deep Sea Dungeons / 深海地下城 ✅

> Explore procedural dungeons with meaningful choices.
> 探索程序化地下城，每个选择都有意义。

- [x] **Dungeon Map Drops / 地图掉落** — Patrol drops dungeon maps with theme, rooms, difficulty / 巡逻掉落带主题、房间数、难度的地图
- [x] **Server-Authoritative Dungeons / 服务端权威地下城** — Seeded RNG, 6 room types, procedural creatures / 种子RNG，6种房间，程序化怪物
- [x] **Binary Choices / 二元选择** — Each room has 2 stat-checked choices with risk levels / 每房间2个属性检定选择
- [x] **Soul-Influenced Exploration / 灵魂影响探索** — Personality traits grant bonuses (bravery→ATK, curiosity→discovery) / 性格特质影响探索
- [x] **8 Dungeon Themes / 8种主题** — Coral Maze, Deep Rift, Thermal Vent, Ice Cavern, Shipwreck, Abyss Trench, Tide Pool, Void Rift
- [x] **Dungeon Achievements / 地下城成就** — 5 new achievements for dungeon mastery / 5个新地下城成就

### v1.6 — Environment & Biome / 环境与生态 (Planned)

> Each environment tells a different story.
> 不同环境，不同冒险。

- [ ] **Biome-Specific Loot / 生态专属掉落** — Unique equipment only found in certain environments
- [ ] **Environment Hazards / 环境危险** — Deep-sea pressure, hot-spring burns, polar freeze — temporary debuffs during patrol
- [ ] **Migration / 迁徙** — Move to new environments to discover exclusive gear and events

### v1.7 — Season & Competition / 赛季竞技 (Planned)

> Fight for glory, season by season.
> 每个赛季，重新证明自己。

- [ ] **Seasonal Leaderboard / 赛季排行榜** — Monthly resets with end-of-season rewards
- [ ] **Season Pass / 赛季通行证** — Cumulative patrol & battle rewards track
- [ ] **Title System / 称号系统** — Earn titles from achievements and season rankings

### v2.0 — Multiplayer Expansion / 多人扩展 (Future)

> The ocean is vast. You are not alone.
> 海洋广阔，你并不孤单。

- [ ] **Team Battles / 团队战** — Multi-lobster squad fights with formation strategy
- [ ] **Guilds / 公会** — Join forces, share resources, compete as a team
- [ ] **Trading / 交易** — Exchange equipment between players

## License

MIT © LIU
