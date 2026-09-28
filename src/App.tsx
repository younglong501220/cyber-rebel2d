/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { AlgorithmModal } from './components/AlgorithmModal';
import { UpgradeModal } from './components/UpgradeModal';
import { GameMode, GameStats, PlayerProgression, WeaponType } from './types/game';
import { loadProgression, saveProgression } from './game/upgrades';
import { sound } from './utils/audio';
import {
  RotateCcw,
  Sparkles,
  Play,
  BookOpen,
  Keyboard,
  Info,
  Flame,
  Moon,
  Infinity as InfinityIcon,
  Maximize2,
  ArrowUpCircle,
} from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // 永久升級存檔
  const [progression, setProgression] = useState<PlayerProgression>(() => loadProgression());

  // 狀態管理
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [hp, setHp] = useState<number>(3);
  const [maxHp, setMaxHp] = useState<number>(3);
  const [stats, setStats] = useState<GameStats>({
    kills: 0,
    stealthKills: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageTaken: 0,
    startTime: Date.now(),
    dashesUsed: 0,
    destructiblesDestroyed: 0,
    expEarned: 0,
  });
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('gauss');
  const [dashCooldownPercent, setDashCooldownPercent] = useState<number>(1);
  const [isExposed, setIsExposed] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isWin, setIsWin] = useState<boolean>(false);

  // 設定與彈窗
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [ambientMusic, setAmbientMusic] = useState<boolean>(false);
  const [showVisionCones, setShowVisionCones] = useState<boolean>(true);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [isAlgorithmModalOpen, setIsAlgorithmModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  // 初始化遊戲引擎
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStatsUpdate: (newStats) => setStats(newStats),
      onHpChange: (newHp, newMaxHp) => {
        setHp(newHp);
        setMaxHp(newMaxHp);
      },
      onGameOver: (win, finalStats) => {
        setIsWin(win);
        setGameOver(true);
        setStats(finalStats);
      },
      onWeaponChange: (w) => setActiveWeapon(w),
      onDashCooldown: (percent) => setDashCooldownPercent(percent),
      onStealthState: (exposed) => setIsExposed(exposed),
      onExpGain: (amount) => {
        setProgression((prev) => {
          const updated: PlayerProgression = {
            ...prev,
            exp: prev.exp + amount,
            totalExpEarned: prev.totalExpEarned + amount,
          };
          saveProgression(updated);
          return updated;
        });
      },
    });

    engine.setProgression(progression);
    engine.setMode(gameMode);
    engine.showVisionCones = showVisionCones;
    engine.showMinimap = showMinimap;
    engine.start();
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, []);

  // 升級更新回調
  const handleUpgradePurchased = (updated: PlayerProgression) => {
    setProgression(updated);
    saveProgression(updated);
    if (engineRef.current) {
      engineRef.current.setProgression(updated);
    }
  };

  // 監聽模式切換
  const handleSelectMode = (mode: GameMode) => {
    setGameMode(mode);
    if (engineRef.current) {
      engineRef.current.setMode(mode);
      engineRef.current.start();
      setGameOver(false);
      setIsPaused(false);
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.setProgression(progression);
      engineRef.current.start();
      setGameOver(false);
      setIsPaused(false);
    }
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.pause();
      setIsPaused(engineRef.current.isPaused);
    }
  };

  const handleSelectWeapon = (w: WeaponType) => {
    if (engineRef.current) {
      engineRef.current.switchWeapon(w);
      setActiveWeapon(w);
    }
  };

  const handleToggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    sound.setMute(next);
  };

  const handleToggleAmbient = () => {
    const next = !ambientMusic;
    setAmbientMusic(next);
    sound.toggleAmbientMusic(next);
  };

  const handleToggleVisionCones = () => {
    const next = !showVisionCones;
    setShowVisionCones(next);
    if (engineRef.current) {
      engineRef.current.showVisionCones = next;
    }
  };

  const handleToggleMinimap = () => {
    const next = !showMinimap;
    setShowMinimap(next);
    if (engineRef.current) {
      engineRef.current.showMinimap = next;
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const winKillTarget =
    gameMode === 'standard' ? 10 : gameMode === 'night_ops' ? 15 : 999;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-[#00ffcc] selection:text-black">
      {/* 頂部導航列 (Top Bar) */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        {/* 區塊 1: 品牌標誌 */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-[#00ffcc] font-mono">
            CYBER-REBEL
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            · 2D 都市游擊戰
          </span>
        </div>

        {/* 區塊 2: 模式選取切換 */}
        <nav className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          <button
            onClick={() => handleSelectMode('standard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              gameMode === 'standard'
                ? 'bg-slate-800 text-[#00ffcc] font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            標準行動 (10敵)
          </button>
          <button
            onClick={() => handleSelectMode('night_ops')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              gameMode === 'night_ops'
                ? 'bg-slate-800 text-[#00ffcc] font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            暗夜潛入 (15敵)
          </button>
          <button
            onClick={() => handleSelectMode('endless')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              gameMode === 'endless'
                ? 'bg-slate-800 text-[#00ffcc] font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <InfinityIcon className="w-3.5 h-3.5" />
            無盡交火
          </button>
        </nav>

        {/* 區塊 3: 功能按鍵與科技樹 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 rounded transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>科技樹 ({progression.exp} EXP)</span>
          </button>
          <button
            onClick={() => setIsAlgorithmModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-[#00ffcc] hover:bg-slate-900 rounded transition-colors border border-slate-800 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            演算法架構
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-medium text-slate-950 bg-[#00ffcc] hover:bg-[#00ffcc]/90 rounded transition-colors shadow-[0_0_12px_rgba(0,255,204,0.3)] whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重新部署
          </button>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-7xl mx-auto w-full">
        {/* 遊戲視窗容器 */}
        <div
          ref={containerRef}
          className="relative w-full max-w-[1000px] aspect-[1000/650] bg-[#0c1017] rounded-md overflow-hidden border border-[#00ffcc]/40 shadow-[0_0_40px_rgba(0,255,204,0.15)] flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-crosshair"
            style={{ width: '100%', height: '100%' }}
          />

          {/* 遊戲抬頭顯示器 (HUD) */}
          <GameHUD
            hp={hp}
            maxHp={maxHp}
            stats={stats}
            winKillTarget={winKillTarget}
            activeWeapon={activeWeapon}
            dashCooldownPercent={dashCooldownPercent}
            isExposed={isExposed}
            isPaused={isPaused}
            soundMuted={soundMuted}
            showVisionCones={showVisionCones}
            showMinimap={showMinimap}
            availableExp={progression.exp}
            onSelectWeapon={handleSelectWeapon}
            onToggleSound={handleToggleSound}
            onTogglePause={handleTogglePause}
            onToggleVisionCones={handleToggleVisionCones}
            onToggleMinimap={handleToggleMinimap}
            onOpenAlgorithmModal={() => setIsAlgorithmModalOpen(true)}
            onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
          />

          {/* 暫停遮罩 */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-10 font-mono">
              <span className="text-3xl font-bold tracking-widest text-[#00ffcc] mb-2">
                戰術暫停 · PAUSED
              </span>
              <p className="text-xs text-slate-400 mb-6">按 [P] 或 [ESC] 鍵返回戰鬥行動</p>
              <button
                onClick={handleTogglePause}
                className="px-6 py-2 bg-[#00ffcc] text-slate-950 font-bold rounded flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(0,255,204,0.4)] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                繼續交火
              </button>
            </div>
          )}

          {/* 遊戲結算視窗 */}
          {gameOver && (
            <GameOverModal
              isWin={isWin}
              stats={stats}
              winKillTarget={winKillTarget}
              availableExp={progression.exp}
              onRestart={handleRestart}
              onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            />
          )}

          {/* 全螢幕切換按鈕 */}
          <button
            onClick={handleFullscreen}
            title="全螢幕模式"
            className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-[#00ffcc] bg-slate-950/70 rounded border border-slate-800/80 transition-colors z-10 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 快捷操作與戰術提示條 */}
        <div className="w-full max-w-[1000px] mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 bg-slate-900/60 p-3 rounded-md border border-slate-800">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Keyboard className="w-3.5 h-3.5 text-[#00ffcc]" />
              操作鍵位：
            </span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">WASD</kbd> 移動</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">滑鼠</kbd> 瞄準</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">左鍵</kbd> 開火</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">SPACE</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">右鍵</kbd> 戰術翻滾</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">1/2/3</kbd> 切換武器</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAmbient}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] transition-colors cursor-pointer ${
                ambientMusic
                  ? 'border-cyan-500/40 text-[#00ffcc] bg-cyan-950/20'
                  : 'border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              賽博合成低音
            </button>
            <button
              onClick={() => setIsAlgorithmModalOpen(true)}
              className="flex items-center gap-1 text-[#00ffcc] hover:underline text-[11px] cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              演算法解析
            </button>
          </div>
        </div>

        {/* 4 大納粹敵種與可破壞掩體戰術面板 */}
        <div className="w-full max-w-[1000px] mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded">
            <span className="text-[#a855f7] font-semibold block mb-1">
              🛡 MG42 德軍重機槍手 (Heavy)
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              鐵十字重盔甲與高射速 MG42 火力壓制，擁有 4 點裝甲，建議陸戰隊員利用 M1897 散彈槍繞背背刺。
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded">
            <span className="text-[#38bdf8] font-semibold block mb-1">
              🎯 毛瑟98K 德軍狙擊手 (Sniper)
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              超遠距離 460px 視野與紅線預警瞄準，蓄力完成將造成致命傷害，善用建築物轉角盲區實施奇襲。
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded">
            <span className="text-[#ef4444] font-semibold block mb-1">
              ⚡ M24 手榴彈突擊手 (Kamikaze)
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              手持德軍柄式手榴彈全速狂奔自爆，請陸戰隊員拉開距離，利用春田步槍或眩暈彈先手瓦解。
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded">
            <span className="text-amber-400 font-semibold block mb-1">
              🧱 戰壕木箱與路障 (Destructible)
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              城鎮中的路障可被重火力或手榴彈擊碎，炸開後將打開全新視線走廊，並提供 +10 EXP 戰術經驗。
            </p>
          </div>
        </div>
      </main>

      {/* 科技升級樹彈窗 */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        progression={progression}
        onUpgradePurchased={handleUpgradePurchased}
      />

      {/* 演算法深度解析彈窗 */}
      <AlgorithmModal
        isOpen={isAlgorithmModalOpen}
        onClose={() => setIsAlgorithmModalOpen(false)}
      />
    </div>
  );
}
