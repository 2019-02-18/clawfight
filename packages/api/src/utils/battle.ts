interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  intimidation: number;
  luck: number;
  crusher_claw?: number;
  pincer_claw?: number;
}

interface BattleRoundLog {
  round: number;
  attacker: string;
  type: string;
  damage: number;
  defender_hp: number;
}

interface BattleOutcome {
  winner: 'a' | 'b' | 'draw';
  loser: 'a' | 'b' | 'draw';
  rounds_log: BattleRoundLog[];
  total_rounds: number;
}

function seededRandom(seed: string, index: number): number {
  const combined = seed + ':' + index;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function calculateBattle(statsA: Stats, statsB: Stats, seed: string): BattleOutcome {
  let randIndex = 0;
  const rand = () => seededRandom(seed, randIndex++);

  const hpA = { current: statsA.hp };
  const hpB = { current: statsB.hp };

  let first: 'a' | 'b';
  if (statsA.speed > statsB.speed) first = 'a';
  else if (statsA.speed < statsB.speed) first = 'b';
  else first = statsA.intimidation >= statsB.intimidation ? 'a' : 'b';

  const second: 'a' | 'b' = first === 'a' ? 'b' : 'a';
  const firstStats = first === 'a' ? statsA : statsB;
  const secondStats = first === 'a' ? statsB : statsA;
  const firstHp = first === 'a' ? hpA : hpB;
  const secondHp = first === 'a' ? hpB : hpA;

  const intimDiff = Math.abs(firstStats.intimidation - secondStats.intimidation);
  if (intimDiff > 5) {
    const fleeChance = intimDiff * 5;
    if (rand() % 100 < fleeChance) {
      const winner = firstStats.intimidation >= secondStats.intimidation ? first : second;
      return {
        winner,
        loser: winner === 'a' ? 'b' : 'a',
        rounds_log: [{ round: 0, attacker: winner, type: 'flee', damage: 0, defender_hp: 0 }],
        total_rounds: 0,
      };
    }
  }

  const roundsLog: BattleRoundLog[] = [];

  const chooseAttack = (atk: Stats, rv: number) =>
    (rv % 100) < (60 + (atk.luck || 0) * 2) ? 'crusher' : 'pincer';

  const calcDamage = (atk: Stats, def: Stats, type: string, rv: number) => {
    const fluctuation = ((rv % 40) - 20) / 100;
    if (type === 'crusher') {
      const base = atk.attack + (atk.crusher_claw || 0);
      return Math.floor(Math.max(1, base - def.defense * 0.5) * (1 + fluctuation));
    }
    if (rv % 100 >= 90) return 0;
    const base = atk.attack + (atk.pincer_claw || 0);
    return Math.floor(Math.max(1, base - def.defense * 0.3) * (1 + fluctuation * 0.5));
  };

  for (let round = 1; round <= 10; round++) {
    const t1 = chooseAttack(firstStats, rand());
    const d1 = calcDamage(firstStats, secondStats, t1, rand());
    secondHp.current -= d1;
    roundsLog.push({ round, attacker: first, type: t1, damage: d1, defender_hp: Math.max(0, secondHp.current) });
    if (secondHp.current <= 0) return { winner: first, loser: second, rounds_log: roundsLog, total_rounds: round };

    const t2 = chooseAttack(secondStats, rand());
    const d2 = calcDamage(secondStats, firstStats, t2, rand());
    firstHp.current -= d2;
    roundsLog.push({ round, attacker: second, type: t2, damage: d2, defender_hp: Math.max(0, firstHp.current) });
    if (firstHp.current <= 0) return { winner: second, loser: first, rounds_log: roundsLog, total_rounds: round };
  }

  return { winner: 'draw', loser: 'draw', rounds_log: roundsLog, total_rounds: 10 };
}

export function calculateExpGain(winnerLevel: number, loserLevel: number, result: string): number {
  if (result === 'draw') return 10;
  if (result === 'loss') return 10;
  const diff = winnerLevel - loserLevel;
  if (diff >= 5) return 20;
  if (diff >= 0) return 25;
  return 30;
}
