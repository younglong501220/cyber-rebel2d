export interface Point {
  x: number;
  y: number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
  destructible?: boolean; // 是否為可破壞掩體
  hp?: number;            // 當前耐久值
  maxHp?: number;         // 最大耐久值
}

export type EnemyType = 'standard' | 'heavy' | 'sniper' | 'kamikaze';

export type EnemyState = 'PATROL' | 'SUSPICIOUS' | 'ALERT';

export type WeaponType = 'gauss' | 'scatter' | 'emp';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  nameEn: string;
  fireRate: number; // frames between shots
  damage: number;
  speed: number;
  bulletCount: number;
  spread: number;
  color: string;
  description: string;
  icon: string;
  ammoCap: number; // -1 for infinite
}

export interface GameStats {
  kills: number;
  stealthKills: number;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  startTime: number;
  endTime?: number;
  dashesUsed: number;
  destructiblesDestroyed: number;
  expEarned: number;
}

export type GameMode = 'standard' | 'night_ops' | 'endless';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0 to 1
  showVisionCones: boolean;
  showMinimap: boolean;
  difficulty: GameMode;
}

// 升級項目定義
export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  category: 'weapon' | 'ability' | 'skill';
  cost: number;
  maxLevel: number;
  currentLevel: number;
  icon: string;
  statBonus: string;
}

export interface PlayerProgression {
  exp: number;
  totalExpEarned: number;
  level: number;
  upgrades: Record<string, number>; // upgradeId -> level
}
