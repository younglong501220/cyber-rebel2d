import React, { useState } from 'react';
import { X, Code2, Eye, Shield, Cpu, ChevronRight, Zap, Target } from 'lucide-react';

interface AlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlgorithmModal: React.FC<AlgorithmModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'los' | 'collision' | 'ai' | 'destructible'>('los');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-[#00ffcc]">
            <Code2 className="w-5 h-5" />
            <span className="font-bold text-base tracking-wide">核心演算法與戰術機制架構</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab('los')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'los'
                ? 'border-[#00ffcc] text-[#00ffcc] bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            視線遮擋 (LoS)
          </button>
          <button
            onClick={() => setActiveTab('collision')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'collision'
                ? 'border-[#00ffcc] text-[#00ffcc] bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Circle-AABB 滑動
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'ai'
                ? 'border-[#00ffcc] text-[#00ffcc] bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            多兵種 AI 狀態機
          </button>
          <button
            onClick={() => setActiveTab('destructible')}
            className={`flex-1 py-3 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'destructible'
                ? 'border-[#00ffcc] text-[#00ffcc] bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            可破壞掩體與拓撲
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
          {activeTab === 'los' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded">
                <h4 className="text-sm font-bold text-[#00ffcc] mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" /> 二維向量外積 (Cross Product / CCW) 射線交點檢測
                </h4>
                <p className="text-slate-300">
                  將敵軍至玩家的連線視為一條 2D 射線 (Ray)。透過 Counter-Clockwise (CCW) 演算法檢驗線段端點相對於另一線段的方向性，
                  當該射線與任何掩體矩形的四條邊相交時，即判定「視線遮斷」。
                </p>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800/90 rounded text-[11px] text-emerald-400 overflow-x-auto">
                <pre>{`// 關鍵邏輯：向量外積判斷兩線段是否交叉相交
function lineIntersectsLine(p1, p2, p3, p4) {
    const ccw = (A, B, C) => 
        (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && 
           (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

// 檢測起點到終點是否被建築遮擋
function isLineBlockedByBuildings(from, to, buildings) {
    for (let b of buildings) {
        if (pointInRect(from, b) || pointInRect(to, b)) return true;
        // 分別檢測建築 4 個邊界與視線射線的相交
        if (lineIntersectsLine(from, to, b.topEdge.p1, b.topEdge.p2)) return true;
    }
    return false;
}`}</pre>
              </div>

              <div className="text-slate-400 space-y-1">
                <p>• <strong>實時戰術意義：</strong>玩家躲在轉角建築後時，敵軍完全無法察覺，可趁機繞背進行伏擊背刺。</p>
                <p>• <strong>子彈防穿透：</strong>高速子彈同樣運用此幾何檢測，保證不會發生穿牆穿模 (Bullet Tunneling)。</p>
              </div>
            </div>
          )}

          {activeTab === 'collision' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded">
                <h4 className="text-sm font-bold text-[#00ffcc] mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" /> 圓形與軸對齊矩形 (Circle-AABB) 平滑夾限推離
                </h4>
                <p className="text-slate-300">
                  將角色的圓形碰撞體與建築矩形進行檢測。透過 <code className="text-[#00ffcc]">Math.max / Math.min</code> 夾限圓心在矩形邊界上的最近投影點，
                  當距離小於半徑時，計算重疊深度沿著法向量推開，實現無摩擦阻礙的順暢滑動。
                </p>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800/90 rounded text-[11px] text-emerald-400 overflow-x-auto">
                <pre>{`function resolveCircleRectCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));

    const distX = circle.x - closestX;
    const distY = circle.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < circle.radius * circle.radius) {
        const dist = Math.sqrt(distSq);
        const overlap = circle.radius - dist;
        circle.x += (distX / dist) * overlap;
        circle.y += (distY / dist) * overlap;
    }
}`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded">
                <h4 className="text-sm font-bold text-[#00ffcc] mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" /> 4 種敵種 AI 行為模式
                </h4>
                <p className="text-slate-300">
                  系統根據敵軍種類配備了專屬的行動樹與交火邏輯：
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[#ff3366] font-bold block mb-1">【標準特工 STANDARD】</span>
                  <p className="text-slate-400">
                    巡邏遊蕩，視線鎖定後自動維持中距離交火並具備彈道散布。
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[#a855f7] font-bold block mb-1">【重裝機甲 HEAVY】</span>
                  <p className="text-slate-400">
                    多層護甲 (4 HP)，主動逼近玩家並以雙聯連續重型脈衝火力進行區域壓制。
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[#38bdf8] font-bold block mb-1">【幽靈狙擊手 SNIPER】</span>
                  <p className="text-slate-400">
                    超長 460px 視線，保持 240px 遠程距離蓄力瞄準，發射極速高傷害穿透彈。
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[#ef4444] font-bold block mb-1">【自殺突擊者 KAMIKAZE】</span>
                  <p className="text-slate-400">
                    全速暴衝，接近玩家 40px 半徑觸發 0.3 秒引爆倒數，造成巨額範圍傷害與掩體破壞。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'destructible' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded">
                <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" /> 可破壞掩體與動態地圖拓撲 (Dynamic Map Topology)
                </h4>
                <p className="text-slate-300">
                  場地中的橘黃色防禦路障具備生命耐久度。當子彈或自爆衝擊命中時會損耗其耐久：
                </p>
              </div>

              <div className="text-slate-300 space-y-2">
                <p>• <strong>視線動態開通：</strong>掩體破碎後會即時從建築清單中移除，原本阻擋視線的死角瞬間變成開闊的交火走廊。</p>
                <p>• <strong>戰術主動性：</strong>玩家可使用高斯步槍或電漿散彈強行射穿破壞牆體，隔牆擊斃後方缺乏防備的狙擊手或巡邏隊。</p>
                <p>• <strong>經驗獎勵：</strong>每次成功摧毀障礙物將獲得額外 10 EXP 獎勵，可立即用於科技樹升級。</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
