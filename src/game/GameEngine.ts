import { Building, EnemyType, GameMode, GameStats, PlayerProgression, Point, WeaponType } from '../types/game';
import { Player, Enemy, Bullet, Particle, createSparks } from './entities';
import { generateBuildings } from './map';
import { pointInRect } from './physics';
import { sound } from '../utils/audio';

export interface EngineCallbacks {
  onStatsUpdate: (stats: GameStats) => void;
  onHpChange: (hp: number, maxHp: number) => void;
  onGameOver: (isWin: boolean, stats: GameStats) => void;
  onWeaponChange: (weapon: WeaponType) => void;
  onDashCooldown: (percent: number) => void;
  onStealthState: (isExposed: boolean) => void;
  onExpGain: (amount: number) => void;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public virtualWidth = 1000;
  public virtualHeight = 650;

  // Game state
  public isRunning = false;
  public isPaused = false;
  public gameOver = false;
  public mode: GameMode = 'standard';
  public winKillTarget = 10;

  public showVisionCones = true;
  public showMinimap = true;

  // Entities
  public player: Player;
  public enemies: Enemy[] = [];
  public bullets: Bullet[] = [];
  public particles: Particle[] = [];
  public buildings: Building[] = [];

  // Upgrades
  public progression: PlayerProgression = {
    exp: 0,
    totalExpEarned: 0,
    level: 1,
    upgrades: {},
  };

  // Inputs
  public keys: Record<string, boolean> = {};
  public mousePos: Point = { x: 500, y: 325 };
  public isMouseDown = false;

  // FX & Animation
  private screenShake = 0;
  private animFrameId: number | null = null;

  // Stats
  public stats: GameStats = {
    kills: 0,
    stealthKills: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageTaken: 0,
    startTime: Date.now(),
    dashesUsed: 0,
    destructiblesDestroyed: 0,
    expEarned: 0,
  };

  private callbacks: EngineCallbacks;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.callbacks = callbacks;

    this.player = new Player(this.virtualWidth / 2, this.virtualHeight / 2 + 180);
    this.buildings = generateBuildings(this.mode);

    this.bindEvents();
    this.resizeCanvas();
  }

  public setMode(mode: GameMode) {
    this.mode = mode;
    if (mode === 'standard') {
      this.winKillTarget = 10;
    } else if (mode === 'night_ops') {
      this.winKillTarget = 15;
    } else {
      this.winKillTarget = 999; // endless
    }
  }

  public setProgression(prog: PlayerProgression) {
    this.progression = prog;
    if (this.player) {
      this.player.applyUpgrades(prog.upgrades);
      this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
    }
  }

  public resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.virtualWidth * dpr;
    this.canvas.height = this.virtualHeight * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  public start() {
    this.gameOver = false;
    this.isPaused = false;
    this.isRunning = true;

    this.stats = {
      kills: 0,
      stealthKills: 0,
      shotsFired: 0,
      shotsHit: 0,
      damageTaken: 0,
      startTime: Date.now(),
      dashesUsed: 0,
      destructiblesDestroyed: 0,
      expEarned: 0,
    };

    this.buildings = generateBuildings(this.mode);
    this.player.reset(this.virtualWidth / 2, this.virtualHeight / 2 + 180, this.progression.upgrades);
    this.enemies = [];
    this.bullets = [];
    this.particles = [];

    // 生成敵軍部隊
    const initialEnemies = this.mode === 'night_ops' ? 5 : 4;
    for (let i = 0; i < initialEnemies; i++) {
      this.spawnEnemy();
    }

    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
    this.callbacks.onStatsUpdate({ ...this.stats });

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.loop();
  }

  public pause() {
    this.isPaused = !this.isPaused;
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.unbindEvents();
  }

  public switchWeapon(weapon: WeaponType) {
    this.player.activeWeapon = weapon;
    this.callbacks.onWeaponChange(weapon);
  }

  public spawnEnemy() {
    if (this.gameOver) return;
    let valid = false;
    let x = 0;
    let y = 0;
    let attempts = 0;

    while (!valid && attempts < 100) {
      attempts++;
      x = Math.random() * (this.virtualWidth - 120) + 60;
      y = Math.random() * (this.virtualHeight - 120) + 60;

      const inBuilding = this.buildings.some((b) =>
        pointInRect({ x, y }, { x: b.x - 30, y: b.y - 30, w: b.w + 60, h: b.h + 60 })
      );
      const nearPlayer = Math.hypot(this.player.x - x, this.player.y - y) < 260;

      if (!inBuilding && !nearPlayer) {
        valid = true;
      }
    }

    if (valid) {
      // 隨機選取敵種類型（標準兵 50%, 重裝兵 20%, 狙擊手 15%, 自殺突擊者 15%）
      const rand = Math.random();
      let type: EnemyType = 'standard';

      if (this.mode === 'night_ops') {
        if (rand < 0.35) type = 'standard';
        else if (rand < 0.6) type = 'sniper';
        else if (rand < 0.8) type = 'heavy';
        else type = 'kamikaze';
      } else {
        if (rand < 0.5) type = 'standard';
        else if (rand < 0.7) type = 'heavy';
        else if (rand < 0.85) type = 'sniper';
        else type = 'kamikaze';
      }

      this.enemies.push(new Enemy(x, y, type));
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key] = true;

    // 快捷切換武器 (1, 2, 3)
    if (e.key === '1') this.switchWeapon('gauss');
    if (e.key === '2') this.switchWeapon('scatter');
    if (e.key === '3') this.switchWeapon('emp');

    // 戰術衝刺 [Space]
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.gameOver && !this.isPaused) {
        const dashed = this.player.dash(this.keys);
        if (dashed) {
          this.stats.dashesUsed++;
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      }
    }

    // 暫停 [Escape] 或 [P]
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (!this.gameOver) {
        this.pause();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key] = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.virtualWidth / rect.width;
    const scaleY = this.virtualHeight / rect.height;
    this.mousePos.x = (e.clientX - rect.left) * scaleX;
    this.mousePos.y = (e.clientY - rect.top) * scaleY;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
    } else if (e.button === 2) {
      // 右鍵戰術衝刺
      e.preventDefault();
      if (!this.gameOver && !this.isPaused) {
        const dashed = this.player.dash(this.keys);
        if (dashed) {
          this.stats.dashesUsed++;
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      }
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private triggerScreenShake(amount: number) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  private loop = () => {
    if (!this.isRunning) return;

    this.ctx.save();

    // 螢幕震動
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(shakeX, shakeY);
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    this.update();
    this.render();

    this.ctx.restore();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update() {
    if (this.gameOver || this.isPaused) return;

    this.player.isExposed = false;

    // 更新玩家
    this.player.update(
      this.keys,
      this.mousePos,
      this.isMouseDown,
      this.virtualWidth,
      this.virtualHeight,
      this.buildings,
      this.bullets,
      this.particles,
      () => {
        this.stats.shotsFired++;
        if (this.player.activeWeapon === 'gauss') {
          this.triggerScreenShake(2.5);
        }
        this.callbacks.onStatsUpdate({ ...this.stats });
      }
    );

    // 衝刺冷卻進度
    const dashPercent = 1 - this.player.dashCooldown / this.player.maxDashCooldown;
    this.callbacks.onDashCooldown(dashPercent);

    // 更新敵軍 AI（包括自殺自爆邏輯）
    const isNightOps = this.mode === 'night_ops';
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(
        this.player,
        this.virtualWidth,
        this.virtualHeight,
        this.buildings,
        this.bullets,
        this.particles,
        isNightOps,
        (kamikazeEnemy) => {
          // 自殺突擊自爆！
          sound.playExplosion();
          this.triggerScreenShake(12);
          createSparks(kamikazeEnemy.x, kamikazeEnemy.y, 0, '#ef4444', 30, this.particles);

          // 判斷自爆是否炸到玩家
          const distToPlayer = Math.hypot(this.player.x - kamikazeEnemy.x, this.player.y - kamikazeEnemy.y);
          if (distToPlayer < 75) {
            this.player.takeDamage(this.particles);
            this.stats.damageTaken++;
            this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
            if (this.player.hp <= 0) {
              this.endGame(false);
            }
          }

          // 同步炸傷周遭可摧毀掩體
          for (let bIdx = this.buildings.length - 1; bIdx >= 0; bIdx--) {
            const b = this.buildings[bIdx];
            if (b.destructible && b.hp !== undefined) {
              const bCenter = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
              if (Math.hypot(bCenter.x - kamikazeEnemy.x, bCenter.y - kamikazeEnemy.y) < 90) {
                b.hp -= 3;
                if (b.hp <= 0) {
                  this.buildings.splice(bIdx, 1);
                  this.stats.destructiblesDestroyed++;
                }
              }
            }
          }

          this.enemies.splice(i, 1);
          setTimeout(() => this.spawnEnemy(), 1500);
        }
      );
    }

    this.callbacks.onStealthState(this.player.isExposed);

    // 子彈更新與碰撞判定
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(
        this.virtualWidth,
        this.virtualHeight,
        this.buildings,
        this.player,
        this.enemies,
        this.particles,
        (killedEnemy, isStealth) => {
          this.stats.kills++;
          this.stats.shotsHit++;
          if (isStealth) {
            this.stats.stealthKills++;
          }

          // 擊殺不同敵人獲得經驗獎勵
          let expGain = 20;
          if (killedEnemy.type === 'heavy') expGain = 45;
          else if (killedEnemy.type === 'sniper') expGain = 35;
          else if (killedEnemy.type === 'kamikaze') expGain = 30;

          if (isStealth) expGain = Math.round(expGain * 1.5); // 背刺獎勵 1.5 倍

          this.stats.expEarned += expGain;
          this.callbacks.onExpGain(expGain);

          this.triggerScreenShake(4);
          this.callbacks.onStatsUpdate({ ...this.stats });

          if (this.stats.kills >= this.winKillTarget) {
            this.endGame(true);
          } else {
            // 補充守衛兵力
            const targetGuards = this.mode === 'night_ops' ? 5 : 4;
            if (this.enemies.length < targetGuards) {
              setTimeout(() => this.spawnEnemy(), 1200);
            }
          }
        },
        () => {
          // 玩家中彈
          this.stats.damageTaken++;
          this.triggerScreenShake(8);
          this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
          this.callbacks.onStatsUpdate({ ...this.stats });

          if (this.player.hp <= 0) {
            this.endGame(false);
          }
        },
        (_destroyedBuilding) => {
          // 可摧毀掩體被破壞
          this.stats.destructiblesDestroyed++;
          const expDebris = 10;
          this.stats.expEarned += expDebris;
          this.callbacks.onExpGain(expDebris);
          this.triggerScreenShake(6);
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      );

      if (!b.alive) {
        this.bullets.splice(i, 1);
      }
    }

    // 粒子系統更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private endGame(isWin: boolean) {
    this.gameOver = true;
    this.stats.endTime = Date.now();
    if (isWin) {
      sound.playVictory();
    } else {
      sound.playDefeat();
    }
    this.callbacks.onGameOver(isWin, { ...this.stats });
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 1. 賽博龐克黑暗都市地表與網格
    this.renderEnvironment(ctx);

    // 2. 敵軍手電筒/視野錐體
    this.enemies.forEach((e) => e.draw(ctx, this.buildings, this.showVisionCones));

    // 3. 實體渲染
    this.bullets.forEach((b) => b.draw(ctx));
    if (this.player.hp > 0) {
      this.player.draw(ctx, this.buildings);
    }
    this.particles.forEach((p) => p.draw(ctx));

    // 4. 雷達微縮地圖
    if (this.showMinimap) {
      this.renderMinimap(ctx);
    }
  }

  private renderEnvironment(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 科技網格線
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.virtualWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.virtualHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.virtualHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.virtualWidth, y);
      ctx.stroke();
    }

    // 繪製都市掩體建築
    this.buildings.forEach((b) => {
      if (b.destructible) {
        // 可破壞掩體（琥珀色/橘色警戒條紋風格）
        const healthPercent = b.hp !== undefined && b.maxHp ? b.hp / b.maxHp : 1;

        ctx.fillStyle = '#181309';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        ctx.strokeStyle = healthPercent > 0.4 ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.setLineDash([]);

        // 掩體耐久條
        const barH = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, barH);
        ctx.fillStyle = healthPercent > 0.4 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(b.x + 2, b.y + 2, (b.w - 4) * healthPercent, barH);

        // 標籤
        ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BREAKABLE', b.x + b.w / 2, b.y + b.h / 2 + 5);
      } else {
        // 固定防禦大樓
        ctx.fillStyle = '#070a10';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.strokeStyle = 'rgba(0, 255, 204, 0.18)';
        ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);

        if (b.label) {
          ctx.fillStyle = 'rgba(0, 255, 204, 0.28)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 3);
        }
      }
    });
  }

  private renderMinimap(ctx: CanvasRenderingContext2D) {
    const mapW = 140;
    const mapH = 90;
    const mapX = this.virtualWidth - mapW - 15;
    const mapY = 15;
    const scaleX = mapW / this.virtualWidth;
    const scaleY = mapH / this.virtualHeight;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    // 建築投影
    this.buildings.forEach((b) => {
      ctx.fillStyle = b.destructible ? 'rgba(245, 158, 11, 0.7)' : 'rgba(30, 41, 59, 0.9)';
      ctx.fillRect(mapX + b.x * scaleX, mapY + b.y * scaleY, b.w * scaleX, b.h * scaleY);
    });

    // 敵軍光點
    this.enemies.forEach((e) => {
      ctx.fillStyle = e.stunTimer > 0 ? '#ffe600' : e.color;
      ctx.beginPath();
      ctx.arc(mapX + e.x * scaleX, mapY + e.y * scaleY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 玩家光點
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(mapX + this.player.x * scaleX, mapY + this.player.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('RADAR SCAN', mapX + 4, mapY + 10);

    ctx.restore();
  }
}
