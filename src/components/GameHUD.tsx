import React from 'react';
import { GameStats, WeaponType } from '../types/game';
import { WEAPONS } from '../game/weapons';
import {
  Shield,
  Eye,
  EyeOff,
  Crosshair,
  Zap,
  Radio,
  Volume2,
  VolumeX,
  Pause,
  Play,
  BookOpen,
  Sparkles,
  ArrowUpCircle,
} from 'lucide-react';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  stats: GameStats;
  winKillTarget: number;
  activeWeapon: WeaponType;
  dashCooldownPercent: number; // 0 to 1 (1 = ready)
  isExposed: boolean;
  isPaused: boolean;
  soundMuted: boolean;
  showVisionCones: boolean;
  showMinimap: boolean;
  availableExp: number;
  onSelectWeapon: (weapon: WeaponType) => void;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onToggleVisionCones: () => void;
  onToggleMinimap: () => void;
  onOpenAlgorithmModal: () => void;
  onOpenUpgradeModal: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hp,
  maxHp,
  stats,
  winKillTarget,
  activeWeapon,
  dashCooldownPercent,
  isExposed,
  isPaused,
  soundMuted,
  showVisionCones,
  showMinimap,
  availableExp,
  onSelectWeapon,
  onToggleSound,
  onTogglePause,
  onToggleVisionCones,
  onToggleMinimap,
  onOpenAlgorithmModal,
  onOpenUpgradeModal,
}) => {
  const isDashReady = dashCooldownPercent >= 0.99;

  return (
    <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between font-mono select-none">
      {/* 頂部狀態列 */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        {/* 左側：生命值與隱蔽狀態 */}
        <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 border border-slate-800 rounded">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#00ffcc]" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">護甲</span>
            <div className="flex items-center gap-1.5 ml-1">
              {Array.from({ length: maxHp }).map((_, idx) => {
                const filled = idx < hp;
                return (
                  <div
                    key={idx}
                    className={`w-6 h-2.5 rounded-xs transition-all duration-200 ${
                      filled
                        ? 'bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]'
                        : 'bg-slate-800/80 border border-slate-700/50'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="w-[1px] h-4 bg-slate-800" />

          {/* 隱蔽 / 暴露指示燈 */}
          <div className="flex items-center gap-1.5 text-xs">
            {isExposed ? (
              <span className="flex items-center gap-1 text-[#ff0055] font-bold animate-pulse">
                <Eye className="w-3.5 h-3.5" />
                暴露 EXPOSED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#00ffcc]">
                <EyeOff className="w-3.5 h-3.5" />
                隱蔽 HIDDEN
              </span>
            )}
          </div>
        </div>

        {/* 中間：擊殺目標與經驗獲得 */}
        <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 border border-slate-800 rounded flex items-center gap-3">
          <span className="text-xs text-slate-400">殲滅德軍</span>
          <span className="text-base font-bold text-[#ff3366] tabular-nums">
            {stats.kills}{' '}
            <span className="text-xs font-normal text-slate-500">
              / {winKillTarget > 100 ? '∞' : winKillTarget}
            </span>
          </span>
          {stats.stealthKills > 0 && (
            <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-800/40 rounded">
              背刺奇襲 {stats.stealthKills}
            </span>
          )}
          {stats.destructiblesDestroyed > 0 && (
            <span className="text-[11px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 border border-amber-800/40 rounded">
              破壞掩體 {stats.destructiblesDestroyed}
            </span>
          )}
        </div>

        {/* 右側：快速控制鈕與升級面板進入點 */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1.5 border border-slate-800 rounded">
          <button
            onClick={onOpenUpgradeModal}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs transition-colors cursor-pointer mr-1"
            title="開啟科技升級樹"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span className="font-bold">{availableExp} EXP</span>
          </button>

          <button
            onClick={onToggleVisionCones}
            title={showVisionCones ? '關閉視野錐體' : '開啟視野錐體'}
            className={`p-1.5 rounded transition-colors ${
              showVisionCones ? 'text-[#00ffcc] bg-cyan-950/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSound}
            title={soundMuted ? '開啟音效' : '靜音'}
            className={`p-1.5 rounded transition-colors ${
              soundMuted ? 'text-slate-500' : 'text-[#00ffcc] hover:text-[#00ffcc]/80'
            }`}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onTogglePause}
            title={isPaused ? '繼續遊戲 (P)' : '暫停 (P)'}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4 text-[#00ffcc]" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenAlgorithmModal}
            title="演算法架構"
            className="p-1.5 text-slate-400 hover:text-[#00ffcc] rounded transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 底部控制面板：武器切換與衝刺能量槽 */}
      <div className="flex items-end justify-between pointer-events-auto">
        {/* 戰術衝刺狀態 */}
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-2 border border-slate-800 rounded flex flex-col gap-1 w-44">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">戰術翻滾 [SPACE]</span>
            <span className={isDashReady ? 'text-[#00ffcc] font-bold' : 'text-slate-500'}>
              {isDashReady ? 'READY' : `${Math.floor(dashCooldownPercent * 100)}%`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isDashReady
                  ? 'bg-[#00ffcc] shadow-[0_0_6px_#00ffcc]'
                  : 'bg-slate-500'
              }`}
              style={{ width: `${dashCooldownPercent * 100}%` }}
            />
          </div>
        </div>

        {/* 武器切換欄位 */}
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md p-1.5 border border-slate-800 rounded">
          {(['gauss', 'scatter', 'emp'] as WeaponType[]).map((wId, idx) => {
            const config = WEAPONS[wId];
            const isSelected = activeWeapon === wId;
            return (
              <button
                key={wId}
                onClick={() => onSelectWeapon(wId)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all text-xs cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 text-white border border-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <span className="text-[10px] text-slate-500 font-mono">[{idx + 1}]</span>
                {wId === 'gauss' && <Crosshair className="w-3.5 h-3.5" style={{ color: config.color }} />}
                {wId === 'scatter' && <Zap className="w-3.5 h-3.5" style={{ color: config.color }} />}
                {wId === 'emp' && <Radio className="w-3.5 h-3.5" style={{ color: config.color }} />}
                <span>{config.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
