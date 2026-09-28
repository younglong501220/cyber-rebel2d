import React from 'react';
import { GameStats } from '../types/game';
import { Trophy, Skull, RotateCcw, Crosshair, ShieldAlert, Zap, Clock, ArrowUpCircle } from 'lucide-react';

interface GameOverModalProps {
  isWin: boolean;
  stats: GameStats;
  winKillTarget: number;
  availableExp: number;
  onRestart: () => void;
  onOpenUpgradeModal: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isWin,
  stats,
  winKillTarget,
  availableExp,
  onRestart,
  onOpenUpgradeModal,
}) => {
  const durationSec = stats.endTime
    ? Math.round((stats.endTime - stats.startTime) / 1000)
    : 0;

  const accuracy = stats.shotsFired > 0
    ? Math.round((stats.shotsHit / stats.shotsFired) * 100)
    : 0;

  // 評價判定
  let rank = 'C';
  let rankColor = 'text-slate-400';
  let rankDesc = '游擊新人';

  if (isWin) {
    if (stats.damageTaken === 0 && accuracy >= 60) {
      rank = 'S';
      rankColor = 'text-[#00ffcc] shadow-[0_0_15px_#00ffcc]';
      rankDesc = '幻影幽靈 (PERFECT INFILTRATION)';
    } else if (stats.damageTaken <= 1 || stats.stealthKills >= 5) {
      rank = 'A';
      rankColor = 'text-cyan-300';
      rankDesc = '王牌游擊士 (TACTICAL MASTER)';
    } else {
      rank = 'B';
      rankColor = 'text-amber-400';
      rankDesc = '城鎮破壞者 (URBAN VETERAN)';
    }
  } else {
    rank = 'MIA';
    rankColor = 'text-[#ff0055]';
    rankDesc = '通訊中斷 (SIGNAL LOST)';
  }

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-20">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-lg p-6 shadow-2xl flex flex-col gap-5 text-slate-200 font-mono">
        {/* 標題區域 */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div
            className={`p-3 rounded-md ${
              isWin ? 'bg-cyan-950/60 text-[#00ffcc] border border-cyan-700/40' : 'bg-rose-950/60 text-[#ff0055] border border-rose-700/40'
            }`}
          >
            {isWin ? <Trophy className="w-7 h-7" /> : <Skull className="w-7 h-7" />}
          </div>
          <div>
            <h2
              className={`text-2xl font-bold tracking-wider ${
                isWin ? 'text-[#00ffcc]' : 'text-[#ff0055]'
              }`}
            >
              {isWin ? '作戰勝利 · MISSION COMPLETE' : '陣亡失聯 · KIA (LOST IN ACTION)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isWin
                ? '美軍海軍陸戰隊先鋒突擊成功！已肅清城鎮納粹守軍，奪回盟軍戰略樞紐！'
                : '陸戰隊員陣亡於城鎮瓦礫巷弄……納粹守軍仍在警戒，請重新部署突擊部隊。'}
            </p>
          </div>
        </div>

        {/* 戰術評級與作戰數據 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase">作戰評級</span>
            <div className={`text-3xl font-extrabold my-1 ${rankColor}`}>{rank}</div>
            <span className="text-[10px] text-slate-500 truncate">{rankDesc}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-[#00ffcc]" /> 擊斃納粹兵
            </span>
            <div className="text-2xl font-bold text-white my-1 tabular-nums">
              {stats.kills}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {winKillTarget > 100 ? '∞' : winKillTarget}</span>
            </div>
            <span className="text-[10px] text-emerald-400">背刺伏擊: {stats.stealthKills}</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded flex flex-col justify-between">
            <span className="text-[11px] text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> 作戰耗時
            </span>
            <div className="text-2xl font-bold text-white my-1 tabular-nums">{durationSec}s</div>
            <span className="text-[10px] text-slate-500">命中率: {accuracy}%</span>
          </div>
        </div>

        {/* 本場經驗獲得與作戰戰損 */}
        <div className="bg-slate-950/50 border border-slate-800 rounded p-3 text-xs flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">本場戰鬥獲取：</span>
            <span className="font-bold text-amber-400">+{stats.expEarned} EXP</span>
          </div>
          <div className="text-[11px] text-slate-400">
            累積可用經驗：<span className="text-white font-bold">{availableExp} EXP</span>
          </div>
        </div>

        {/* 次要指標 */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded p-3 text-xs flex justify-around text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>承受傷害: {stats.damageTaken} 點</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>翻滾次數: {stats.dashesUsed}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">🧱</span>
            <span>掩體爆破: {stats.destructiblesDestroyed}</span>
          </div>
        </div>

        {/* 雙按鈕：升級軍備 或 重新部署 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUpgradeModal}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold rounded flex items-center justify-center gap-2 tracking-wider transition-colors cursor-pointer text-xs"
          >
            <ArrowUpCircle className="w-4 h-4" />
            前往軍備升級 ({availableExp} EXP)
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-3 bg-[#00ffcc] hover:bg-[#00ffcc]/90 text-slate-950 font-bold rounded flex items-center justify-center gap-2 tracking-wider transition-colors shadow-[0_0_20px_rgba(0,255,204,0.3)] cursor-pointer text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            重新部署 (REDEPLOY)
          </button>
        </div>
      </div>
    </div>
  );
};
