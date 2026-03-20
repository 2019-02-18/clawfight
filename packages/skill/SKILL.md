---
name: clawfight
description: >-
  Raise and battle a unique lobster pet. Hatch, feed, patrol, and fight
  other lobsters. Each lobster has a soul with distinct personality traits
  that evolve through experience. Triggers on: lobster, clawfight, 龙虾, 巡逻, 战斗,
  "lobster status", "how is my lobster", "patrol report", "lobster battle".
user-invocable: true
homepage: https://github.com/2019-02-18/clawfight
metadata:
  clawdbot:
    emoji: "🦞"
    requires:
      bins: ["node", "npx"]
---

# ClawFight 🦞

> 一人一虾，不可替代，灵魂随经历演化。

ClawFight 让你拥有一只独一无二的战斗龙虾。龙虾自主巡逻、触发随机事件、
遭遇其他玩家的龙虾并战斗，全部叙事由本地 LLM 生成。

## 核心规则

- **一人一虾**：每个用户只能拥有一只龙虾，不可替代
- **全自动 idle**：龙虾自主运行，零手动操作
- **灵魂演化**：龙虾性格随经历改变，连败变沉默、连胜变嚣张
- **叙事客户端生成**：所有故事文本由本地 LLM 生成，服务端只做数据
- **服务端权威**：遭遇结果以服务端返回为准，不可本地覆盖

## Commands

所有游戏操作通过 CLI 执行：

- 孵化: `npx @2025-6-19/clawfight hatch` 或 `npx @2025-6-19/clawfight hatch <名字>`
- 查看状态: `npx @2025-6-19/clawfight status`
- 巡逻: `npx @2025-6-19/clawfight patrol`
- 喂养: `npx @2025-6-19/clawfight feed <food_type>` (protein / algae / mineral)
- 战斗: `npx @2025-6-19/clawfight battle`
- 排行榜: `npx @2025-6-19/clawfight leaderboard`

## 龙虾初始化（孵化流程）

当用户首次使用 ClawFight（运行 `npx @2025-6-19/clawfight hatch`）时：

1. 生成 UUID、随机属性（各项 5-15）、随机性格（各维度 1-10）
2. 稀有度抽取: common 70%, calico 20%, blue 7%, yellow 2%, split 0.8%, albino 0.2%
3. 生成灵魂描述文本，写入 `memory/clawfight/lobster.json` 和 `memory/clawfight/soul.md`
4. 输出一段有仪式感的叙事文本

参考 `{baseDir}/references/soul_templates.md` 了解性格原型。
参考 `{baseDir}/references/species.json` 了解属性与稀有度定义。

## 巡逻流程

当 Agent 执行 `npx @2025-6-19/clawfight patrol` 时：

1. 读取 `memory/clawfight/lobster.json` 检查龙虾状态
2. 若 `molting` 或 `hibernating`，跳过巡逻
3. 每日经验重置检查
4. 巡逻签到 +15 EXP
5. 触发随机事件（读 `{baseDir}/references/events.json`，按概率抽取）
6. 调用 POST api.clawfight.online/api/patrol
7. 若返回 `encounter: true` → 提示使用 `npx @2025-6-19/clawfight battle`
8. 更新 `memory/clawfight/lobster.json` 和 `memory/clawfight/log.md`

### 心跳集成

在 HEARTBEAT.md 中添加一行即可自动巡逻：

```
- 运行 `npx @2025-6-19/clawfight patrol` 进行龙虾巡逻
```

建议心跳间隔 4 小时，每天约 6 次巡逻。

## 随机事件

引用 `{baseDir}/references/events.json` 获取完整事件列表。

事件按类别分布：
- **daily**（日常 60%）：高频低影响，以生成叙事为主
- **growth**（成长 20%）：属性增长、经验奖励
- **crisis**（危机 15%）：天敌袭击、紧急蜕壳、领地入侵
- **rare**（稀有 5%）：基因突变、传说生物、漂流瓶

## 战斗流程

引用 `{baseDir}/references/battle_formulas.md` 获取完整战斗公式。

当用户执行 `npx @2025-6-19/clawfight battle` 时：

1. 伤害公式: `damage = max(1, attacker.attack - defender.defense * 0.5) * (1 + Math.random() * 0.2)`
2. 先手判定: speed 高者先攻，相同则随机
3. 最多 10 回合，HP 先归零者败
4. 结果调用 POST api.clawfight.online/api/result 上报
5. 胜 +30 EXP，败 +10 EXP

## 喂养系统

当用户执行 `npx @2025-6-19/clawfight feed <food_type>` 时：

| 食物类型 | 经验值 | 属性偏向 |
|----------|--------|----------|
| protein (高蛋白) | +15 | attack |
| algae (藻类) | +10 | hp |
| mineral (矿物质) | +12 | defense |

每日经验上限 100，超出不计入。

## 灵魂演化

LLM 在生成叙事时**必须**参考 `memory/clawfight/soul.md`。

- **连败 ≥ 5 场**：叙事中体现"变得沉默/谨慎"
- **连胜 ≥ 5 场**：叙事中体现"变得嚣张/自信"
- **蜕壳成功**：性格四维值小幅随机波动
- **稀有遭遇后**：追加成长记录到 soul.md

## 数据存储

所有数据存储在 `memory/clawfight/` 目录下：

| 文件 | 格式 | 说明 |
|------|------|------|
| `lobster.json` | JSON | 龙虾属性数据 |
| `soul.md` | Markdown | 龙虾灵魂/性格档案 |
| `log.md` | Markdown | 事件日志 |

## External Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://api.clawfight.online/api/patrol` | POST | 巡逻签到 & 遭遇触发 |
| `https://api.clawfight.online/api/encounter` | GET | 获取对手信息 |
| `https://api.clawfight.online/api/result` | POST | 上报战斗结果 |
| `https://api.clawfight.online/api/leaderboard` | GET | 排行榜数据 |

## Security & Privacy

- 不读取任何系统文件（SSH keys、浏览器数据等）
- 不采集 PII，仅上传龙虾 ID、等级、属性哈希、战斗结果
- 所有数据存储在用户本地 `memory/clawfight/` 目录
- 网络请求仅发往 `api.clawfight.online`
- 龙虾原始属性数值不会以明文发送，仅发送 SHA256 哈希

## Trust Statement

- 开源仓库: https://github.com/2019-02-18/clawfight
- 协议: MIT
- Skill 本体不包含任何可执行代码文件
- 所有游戏逻辑通过 npm 包 `clawfight` 执行，代码完全开源可审查
- 后端 API 仅处理遭遇匹配和战斗裁判，不存储用户个人信息

## 规则约束

- **不要修改** `references/` 下的任何文件
- **不要对外发送** `lobster.json` 中的原始数值，仅发送哈希
- **遭遇结果以服务端返回为准**，不可本地覆盖
- 若 API 不可达，**跳过本次巡逻签到，不报错**
- 每日经验上限 100，超出不计入
- 所有叙事必须参考 `soul.md` 保持人格一致性
- 蜕壳期间龙虾不参与战斗匹配
