import React from 'react';
import { PlayerProgression } from '../types/game';
import { UPGRADE_DEFINITIONS, calculateExpLevel } from '../game/upgrades';
import { sound } from '../utils/audio';
import {
  X,
  Sparkles,
  Shield,
  Zap,
  Footprints,
  Crosshair,
  Flame,
  Radio,
  Eye,
  CheckCircle2,
  ChevronUp,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  progression: PlayerProgression;
  onUpgradePurchased: (updated: PlayerProgression) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  progression,
  onUpgradePurchased,
}) => {
  if (!isOpen) return null;

  const { level, nextLevelExp, currentLevelExp } = calculateExpLevel(progression.totalExpEarned);
  const expPercent = Math.min(100, Math.round((currentLevelExp / nextLevelExp) * 100));

  const handleBuy = (upgradeId: string, cost: number, maxLevel: number) => {
    const curLvl = progression.upgrades[upgradeId] || 0;
    if (curLvl >= maxLevel || progression.exp < cost) return;

    const nextExp = progression.exp - cost;
    const nextUpgrades = {
      ...progression.upgrades,
      [upgradeId]: curLvl + 1,
    };

    sound.playUpgrade();
    onUpgradePurchased({
      ...progression,
      exp: nextExp,
      upgrades: nextUpgrades,
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return <Shield className="w-4 h-4 text-[#00ffcc]" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Footprints': return <Footprints className="w-4 h-4 text-emerald-400" />;
      case 'Crosshair': return <Crosshair className="w-4 h-4 text-cyan-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-rose-400" />;
      case 'Radio': return <Radio className="w-4 h-4 text-yellow-400" />;
      case 'Eye': return <Eye className="w-4 h-4 text-indigo-400" />;
      default: return <Sparkles className="w-4 h-4 text-[#00ffcc]" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-950/60 border border-cyan-800/40 rounded text-[#00ffcc]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                戰術神經晶片與軍備升級 (CYBER-UPGRADE)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                擊殺敵軍特工或破壞掩體獲取 EXP，強化裝甲、武器性能與特殊技能
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 經驗值與玩家等級條 */}
        <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">當前游擊士階級</span>
            <span className="text-sm font-bold text-[#00ffcc] px-2 py-0.5 bg-cyan-950/50 border border-cyan-800/50 rounded">
              RANK LV.{level}
            </span>
          </div>

          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>升級進度</span>
              <span>{currentLevelExp} / {nextLevelExp} EXP</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00ffcc] transition-all duration-300"
                style={{ width: `${expPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">可用經驗點數</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">
              {progression.exp} EXP
            </span>
          </div>
        </div>

        {/* 升級項目清單 */}
        <div className="p-6 overflow-y-auto space-y-3">
          {UPGRADE_DEFINITIONS.map((item) => {
            const currentLevel = progression.upgrades[item.id] || 0;
            const isMax = currentLevel >= item.maxLevel;
            const canAfford = progression.exp >= item.cost && !isMax;

            return (
              <div
                key={item.id}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-lg flex items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-md mt-0.5">
                    {getIcon(item.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{item.name}</span>
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">
                        LV {currentLevel} / {item.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {item.description}
                    </p>
                    <div className="text-[11px] text-[#00ffcc] mt-1.5 flex items-center gap-1">
                      <span>• 屬性強化：{item.statBonus}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {isMax ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/40 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 已滿級
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBuy(item.id, item.cost, item.maxLevel)}
                      disabled={!canAfford}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-[#00ffcc] hover:bg-[#00ffcc]/90 text-slate-950 shadow-[0_0_12px_rgba(0,255,204,0.3)]'
                          : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/40'
                      }`}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      升級 ({item.cost} EXP)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center text-xs text-slate-500">
          <span>提示：所有升級屬性將即時生效並永久保存於本機戰術檔案中。</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors cursor-pointer"
          >
            返回作戰
          </button>
        </div>
      </div>
    </div>
  );
};
