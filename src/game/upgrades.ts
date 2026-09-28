import { PlayerProgression, UpgradeItem } from '../types/game';

export const UPGRADE_DEFINITIONS: Omit<UpgradeItem, 'currentLevel'>[] = [
  // 角色能力升級
  {
    id: 'hp_boost',
    name: '奈米護甲強化',
    description: '擴充玩家護甲能量槽上限，提高戰場生存容錯率。',
    category: 'ability',
    cost: 150,
    maxLevel: 3,
    icon: 'Shield',
    statBonus: '每級 +1 生命上限',
  },
  {
    id: 'dash_cd',
    name: '神經突觸加速器',
    description: '縮短戰術衝刺的冷卻時間，讓走位更加靈巧。',
    category: 'ability',
    cost: 120,
    maxLevel: 3,
    icon: 'Zap',
    statBonus: '每級減少 20% 衝刺冷卻',
  },
  {
    id: 'move_speed',
    name: '電磁動能鞋底',
    description: '提升玩家常態移動速度與轉角突破機動性。',
    category: 'ability',
    cost: 100,
    maxLevel: 3,
    icon: 'Footprints',
    statBonus: '每級提升 12% 移動速度',
  },

  // 武器威力升級
  {
    id: 'gauss_damage',
    name: '磁軌過載線圈',
    description: '大幅強化高斯狙擊步槍的傷害，並對重裝甲單位與掩體造成額外破壞。',
    category: 'weapon',
    cost: 180,
    maxLevel: 3,
    icon: 'Crosshair',
    statBonus: '每級 +1 子彈傷害 & 貫穿能力',
  },
  {
    id: 'scatter_pellets',
    name: '電漿分流矩陣',
    description: '增加電漿散彈的發射彈片數，提升近距離與轉角覆蓋面。',
    category: 'weapon',
    cost: 160,
    maxLevel: 3,
    icon: 'Flame',
    statBonus: '每級散彈增加 +2 枚電漿彈',
  },
  {
    id: 'emp_radius',
    name: '高頻 EMP 放大器',
    description: '延長電磁標槍對敵人的癱瘓癱瘓時間，並產生微型電磁震波。',
    category: 'weapon',
    cost: 140,
    maxLevel: 3,
    icon: 'Radio',
    statBonus: '每級癱瘓時間 +1.5 秒',
  },

  // 解鎖特殊技能
  {
    id: 'stealth_radar',
    name: '全息光學探測儀',
    description: '雷達常時標記可破壞掩體與敵軍朝向視野，並降低敵軍警戒積累。',
    category: 'skill',
    cost: 200,
    maxLevel: 2,
    icon: 'Eye',
    statBonus: '戰術雷達高精掃描 & 敵軍反應延遲',
  },
];

const STORAGE_KEY = 'CYBER_REBEL_PROGRESSION_V1';

export function loadProgression(): PlayerProgression {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        exp: parsed.exp ?? 0,
        totalExpEarned: parsed.totalExpEarned ?? 0,
        level: parsed.level ?? 1,
        upgrades: parsed.upgrades ?? {},
      };
    }
  } catch (err) {
    console.error('Failed to load progression:', err);
  }

  return {
    exp: 0,
    totalExpEarned: 0,
    level: 1,
    upgrades: {},
  };
}

export function saveProgression(prog: PlayerProgression): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
  } catch (err) {
    console.error('Failed to save progression:', err);
  }
}

export function calculateExpLevel(totalExp: number): { level: number; nextLevelExp: number; currentLevelExp: number } {
  // 每級所需經驗 100 * level
  let level = 1;
  let remaining = totalExp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }
  return {
    level,
    nextLevelExp: level * 100,
    currentLevelExp: remaining,
  };
}
