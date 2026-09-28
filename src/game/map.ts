import { Building, GameMode } from '../types/game';

export function generateBuildings(mode: GameMode = 'standard'): Building[] {
  if (mode === 'night_ops') {
    return [
      // 外部防線（大型主體建築，不可摧毀）
      { id: 'b1', x: 80, y: 80, w: 110, h: 220, label: 'SECTOR-01' },
      { id: 'b2', x: 80, y: 360, w: 110, h: 220, label: 'SECTOR-02' },
      { id: 'b3', x: 810, y: 80, w: 110, h: 220, label: 'SECTOR-03' },
      { id: 'b4', x: 810, y: 360, w: 110, h: 220, label: 'SECTOR-04' },

      // 內環主要戰術節點（不可摧毀）
      { id: 'b5', x: 280, y: 120, w: 140, h: 100, label: 'COMMS' },
      { id: 'b6', x: 580, y: 120, w: 140, h: 100, label: 'ARMORY' },
      { id: 'b7', x: 280, y: 430, w: 140, h: 100, label: 'STORAGE' },
      { id: 'b8', x: 580, y: 430, w: 140, h: 100, label: 'RELAY' },

      // 中央高科技主伺服器（不可摧毀）
      { id: 'b9', x: 440, y: 270, w: 120, h: 110, label: 'MAINFRAME' },

      // 可破壞防禦路障與加固沙包掩體（承受傷害後會坍塌破碎）
      { id: 'db1', x: 440, y: 150, w: 120, h: 40, label: 'BARRICADE-N', destructible: true, hp: 6, maxHp: 6 },
      { id: 'db2', x: 440, y: 460, w: 120, h: 40, label: 'BARRICADE-S', destructible: true, hp: 6, maxHp: 6 },
      { id: 'db3', x: 230, y: 280, w: 40, h: 90, label: 'GATE-W', destructible: true, hp: 5, maxHp: 5 },
      { id: 'db4', x: 730, y: 280, w: 40, h: 90, label: 'GATE-E', destructible: true, hp: 5, maxHp: 5 },
    ];
  }

  // 經典都市游擊佈局（融合固定大廈與可擊穿破壞掩體）
  return [
    // 兩側縱向大型企業商廈（不可摧毀主體）
    { id: 'b1', x: 110, y: 90, w: 130, h: 200, label: 'CORP-A' },
    { id: 'b2', x: 110, y: 370, w: 130, h: 190, label: 'LAB-01' },
    { id: 'b3', x: 760, y: 90, w: 130, h: 200, label: 'CORP-B' },
    { id: 'b4', x: 760, y: 370, w: 130, h: 190, label: 'STORAGE' },

    // 四大轉角街區建築
    { id: 'b5', x: 330, y: 130, w: 110, h: 130, label: 'NODE-NW' },
    { id: 'b6', x: 560, y: 130, w: 110, h: 130, label: 'NODE-NE' },
    { id: 'b7', x: 330, y: 390, w: 110, h: 130, label: 'NODE-SW' },
    { id: 'b8', x: 560, y: 390, w: 110, h: 130, label: 'NODE-SE' },

    // 中心控制台核心掩體
    { id: 'b9', x: 440, y: 275, w: 120, h: 80, label: 'CYBER-CORE' },

    // 【可破壞掩體】：輕型能量護盾路障與防彈玻璃隔板，被摧毀後將打通新的射擊視線
    { id: 'db1', x: 450, y: 170, w: 100, h: 32, label: 'BARRIER-N', destructible: true, hp: 5, maxHp: 5 },
    { id: 'db2', x: 450, y: 430, w: 100, h: 32, label: 'BARRIER-S', destructible: true, hp: 5, maxHp: 5 },
    { id: 'db3', x: 270, y: 285, w: 32, h: 70, label: 'DEPOT-W', destructible: true, hp: 4, maxHp: 4 },
    { id: 'db4', x: 698, y: 285, w: 32, h: 70, label: 'DEPOT-E', destructible: true, hp: 4, maxHp: 4 },
  ];
}
