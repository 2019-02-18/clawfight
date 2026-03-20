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

# Hibernate / 休眠
npx @2025-6-19/clawfight rest

# Wake up / 唤醒
npx @2025-6-19/clawfight wake
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

4 personality axes (1-10 each):
- **Bravery / 勇气** — brave ↔ cautious
- **Curiosity / 好奇** — curious ↔ conservative
- **Talkativeness / 话量** — chatty ↔ silent
- **Temper / 脾气** — hot-tempered ↔ gentle

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

- **Equipment System** — Find gear during patrol (claw gauntlets, shell armor) to boost combat stats / 装备系统：巡逻捡装备提升战力
- **Season System** — Weekly/monthly leaderboard resets for competitive seasons / 赛季机制：定期重置排行榜
- **Team Battles** — Multi-lobster squad fights / 团队战：多只龙虾组队作战
- **Environment Effects** — Different environments grant battle bonuses / 环境特效：不同环境对战斗有额外加成
- **Achievement System** — Unlock achievements for special rewards / 成就系统：解锁成就获得奖励

## License

MIT © LIU
