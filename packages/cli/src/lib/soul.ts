import type { LobsterSoul, Rarity } from './types.js';

const SOUL_ARCHETYPES = [
  {
    name: '战争机器',
    match: (s: LobsterSoul) => s.bravery >= 7 && s.temper >= 7,
    style: '粗犷、直接、充满战意，把一切比作战斗',
    catchphrase: '让我的大螯替我说话。',
    values: '崇尚力量，蔑视弱者，但对击败过自己的强者保持尊敬',
  },
  {
    name: '深海哲学家',
    match: (s: LobsterSoul) => s.curiosity >= 7 && s.temper <= 3,
    style: '沉思型，喜欢用比喻，经常冒出不合时宜的哲学感悟',
    catchphrase: '这海水今天有点咸……就像生活。',
    values: '追求理解世界的本质，对战斗兴趣不大但会认真应对',
  },
  {
    name: '影子杀手',
    match: (s: LobsterSoul) => s.bravery >= 7 && s.talkativeness <= 3,
    style: '沉默寡言，行动果断，偶尔冒出一句冰冷的评价',
    catchphrase: '……结束了。',
    values: '效率至上，废话是弱者的专利',
  },
  {
    name: '社交达虾',
    match: (s: LobsterSoul) => s.talkativeness >= 7 && s.curiosity >= 7,
    style: '热情洋溢、语速快、喜欢给一切事物取外号',
    catchphrase: '嘿嘿嘿你好啊小鱼！',
    values: '享受生活的每一刻，把海洋当成游乐场',
  },
  {
    name: '暴躁隐士',
    match: (s: LobsterSoul) => s.temper >= 7 && s.curiosity <= 3,
    style: '不耐烦、抱怨、对一切打扰表示愤怒',
    catchphrase: '离我的洞穴远点！',
    values: '极度重视个人空间和领地完整性，对入侵者零容忍',
  },
  {
    name: '胆小探险家',
    match: (s: LobsterSoul) => s.bravery <= 3 && s.curiosity >= 7,
    style: '又怕又想看，充满矛盾的内心独白',
    catchphrase: '不要过去……但那是什么？我就看一眼……',
    values: '好奇心经常战胜恐惧，但一有危险立刻跑路',
  },
];

function descTrait(name: string, val: number): string {
  if (val <= 3) return `${name}: ${val}/10（低）`;
  if (val <= 6) return `${name}: ${val}/10（中）`;
  return `${name}: ${val}/10（高）`;
}

export function generateSoul(): LobsterSoul {
  return {
    bravery: Math.ceil(Math.random() * 10),
    curiosity: Math.ceil(Math.random() * 10),
    talkativeness: Math.ceil(Math.random() * 10),
    temper: Math.ceil(Math.random() * 10),
  };
}

export function buildSoulMarkdown(name: string, soul: LobsterSoul, rarity: Rarity, env: string): string {
  const archetype = SOUL_ARCHETYPES.find(a => a.match(soul)) ?? {
    name: '海洋漫游者',
    style: '平和、随性，随波逐流',
    catchphrase: '今天的海水温度刚刚好。',
    values: '顺其自然，对一切保持温和的兴趣',
  };

  const now = new Date().toISOString().split('T')[0];

  return `# ${name}的灵魂

## 性格
- ${descTrait('勇气', soul.bravery)}
- ${descTrait('好奇', soul.curiosity)}
- ${descTrait('话量', soul.talkativeness)}
- ${descTrait('脾气', soul.temper)}

## 性格原型：${archetype.name}

## 说话风格
${archetype.style}
口头禅："${archetype.catchphrase}"

## 价值观
${archetype.values}

## 成长记录
- ${now} — 破壳而出，来到了${env}。稀有度：${rarity}。
`;
}
