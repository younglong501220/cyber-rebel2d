import { WeaponConfig, WeaponType } from '../types/game';

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  gauss: {
    id: 'gauss',
    name: 'M1加蘭德/春田狙擊步槍',
    nameEn: 'M1 / Springfield Sniper',
    fireRate: 18,
    damage: 1,
    speed: 16,
    bulletCount: 1,
    spread: 0.015,
    color: '#38bdf8', // 盟軍天藍精準彈道
    description: '美軍海軍陸戰隊標準高精度穿透步槍，彈道筆直，適合巷弄視線遠程精確狙殺。',
    icon: 'Crosshair',
    ammoCap: -1,
  },
  scatter: {
    id: 'scatter',
    name: '溫徹斯特M1897戰壕散彈槍',
    nameEn: 'M1897 Trench Gun',
    fireRate: 32,
    damage: 1,
    speed: 12,
    bulletCount: 5,
    spread: 0.28,
    color: '#fb923c', // 熾熱鉛彈
    description: '威名赫赫的「戰壕清道夫」，扇形擴散的強烈鹿彈彈幕，掩體拐角伏擊壓制首選。',
    icon: 'Flame',
    ammoCap: -1,
  },
  emp: {
    id: 'emp',
    name: 'MK2特種震盪眩暈彈',
    nameEn: 'MK2 Stun Concussion',
    fireRate: 24,
    damage: 1,
    speed: 13,
    bulletCount: 1,
    spread: 0.03,
    color: '#facc15',
    description: '強烈震盪波使納粹敵軍暫時失能與聽覺阻斷，阻斷警戒巡邏網絡。',
    icon: 'Zap',
    ammoCap: -1,
  },
};
