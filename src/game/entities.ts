import { Point, Building, WeaponType, EnemyState, EnemyType } from '../types/game';
import { isLineBlockedByBuildings, resolveCircleRectCollision, raycastToBuildings } from './physics';
import { sound } from '../utils/audio';
import { WEAPONS } from './weapons';

export interface GhostTrail {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

export class Player {
  public x: number;
  public y: number;
  public radius = 15;
  public baseSpeed = 3.6;
  public hp = 3;
  public maxHp = 3;
  public angle = 0;
  public shootCooldown = 0;
  public activeWeapon: WeaponType = 'gauss';
  public color = '#4ade80';

  // 升級屬性加成
  public upgradeLevels: Record<string, number> = {};

  // 戰術戰壕衝刺/戰術翻滾
  public dashCooldown = 0;
  public maxDashCooldown = 120;
  public dashTimer = 0;
  public dashGhosts: GhostTrail[] = [];
  public isExposed = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public applyUpgrades(upgrades: Record<string, number>) {
    this.upgradeLevels = upgrades;

    // HP 提升
    const hpBoost = upgrades['hp_boost'] || 0;
    this.maxHp = 3 + hpBoost;
    this.hp = Math.min(this.hp, this.maxHp);

    // 移動速度
    const speedBoost = upgrades['move_speed'] || 0;
    this.baseSpeed = 3.6 * (1 + speedBoost * 0.12);

    // 衝刺冷卻縮減
    const dashBoost = upgrades['dash_cd'] || 0;
    this.maxDashCooldown = Math.round(120 * Math.max(0.4, 1 - dashBoost * 0.2));
  }

  public reset(x: number, y: number, upgrades: Record<string, number> = {}) {
    this.x = x;
    this.y = y;
    this.applyUpgrades(upgrades);
    this.hp = this.maxHp;
    this.shootCooldown = 0;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashGhosts = [];
    this.isExposed = false;
  }

  public dash(keys: Record<string, boolean>) {
    if (this.dashCooldown > 0) return false;

    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.angle);
      dy = Math.sin(this.angle);
    } else {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    this.dashTimer = 11;
    this.dashCooldown = this.maxDashCooldown;
    sound.playDash();
    return true;
  }

  public update(
    keys: Record<string, boolean>,
    mousePos: Point,
    isMouseDown: boolean,
    canvasW: number,
    canvasH: number,
    buildings: Building[],
    bullets: Bullet[],
    particles: Particle[],
    onShoot?: (w: WeaponType) => void
  ) {
    let dx = 0;
    let dy = 0;

    if (keys['w'] || keys['W'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['S'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['A'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['D'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    let currentSpeed = this.baseSpeed;
    if (this.dashTimer > 0) {
      currentSpeed = this.baseSpeed * 2.8;
      this.dashTimer--;
      this.dashGhosts.push({
        x: this.x,
        y: this.y,
        angle: this.angle,
        alpha: 0.65,
      });
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown--;
    }

    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].alpha -= 0.08;
      if (this.dashGhosts[i].alpha <= 0) {
        this.dashGhosts.splice(i, 1);
      }
    }

    this.x += dx * currentSpeed;
    this.y += dy * currentSpeed;

    this.x = Math.max(this.radius, Math.min(canvasW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasH - this.radius, this.y));

    buildings.forEach((b) => resolveCircleRectCollision(this, b));

    this.angle = Math.atan2(mousePos.y - this.y, mousePos.x - this.x);

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (isMouseDown && this.shootCooldown <= 0) {
      this.shoot(bullets, particles);
      if (onShoot) onShoot(this.activeWeapon);
    }
  }

  public shoot(bullets: Bullet[], particles: Particle[]) {
    const config = WEAPONS[this.activeWeapon];
    this.shootCooldown = config.fireRate;

    let damage = config.damage;
    let count = config.bulletCount;
    let bulletSpeed = config.speed;
    const baseAngle = this.angle;

    if (this.activeWeapon === 'gauss') {
      const gaussBoost = this.upgradeLevels['gauss_damage'] || 0;
      damage += gaussBoost;
      bulletSpeed += gaussBoost * 2;
      sound.playGaussShot();
    } else if (this.activeWeapon === 'scatter') {
      const scatterBoost = this.upgradeLevels['scatter_pellets'] || 0;
      count += scatterBoost * 2;
      sound.playScatterShot();
    } else {
      sound.playEMPShot();
    }

    for (let i = 0; i < count; i++) {
      let shotAngle = baseAngle;
      if (count > 1) {
        const spreadWidth = config.spread * (1 + (count - 5) * 0.1);
        const step = spreadWidth / (count - 1);
        shotAngle = baseAngle - spreadWidth / 2 + step * i + (Math.random() - 0.5) * 0.04;
      } else {
        shotAngle = baseAngle + (Math.random() - 0.5) * config.spread;
      }

      const muzzleX = this.x + Math.cos(shotAngle) * (this.radius + 8);
      const muzzleY = this.y + Math.sin(shotAngle) * (this.radius + 8);

      bullets.push(
        new Bullet(
          muzzleX,
          muzzleY,
          shotAngle,
          bulletSpeed,
          config.color,
          'player',
          this.activeWeapon,
          damage
        )
      );

      createSparks(muzzleX, muzzleY, shotAngle, config.color, 4, particles);
    }
  }

  public takeDamage(particles: Particle[]): boolean {
    if (this.dashTimer > 0) return false;

    this.hp--;
    sound.playPlayerHit();
    createSparks(this.x, this.y, 0, '#ef4444', 22, particles);
    return this.hp <= 0;
  }

  /**
   * 繪製【美軍海軍陸戰隊隊員 (US Marine Raider)】造型：
   * - 經典 M1 鋼盔（橄欖綠+偽裝網帶）
   * - 獵鴨迷彩/卡其戰鬥服雙肩
   * - 胸前 USMC 標誌或背帶
   * - 雙手端持加蘭德步槍木質槍托與黑色金屬槍管
   */
  public draw(ctx: CanvasRenderingContext2D, buildings: Building[]) {
    // 衝刺殘影
    this.dashGhosts.forEach((ghost) => {
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.rotate(ghost.angle);
      ctx.globalAlpha = ghost.alpha;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 狙擊步槍雷射瞄準線
    if (this.activeWeapon === 'gauss') {
      const ray = raycastToBuildings({ x: this.x, y: this.y }, this.angle, 550, buildings);
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(ray.hit.x, ray.hit.y);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(ray.hit.x, ray.hit.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 暴露或警戒光暈
    if (this.isExposed) {
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 18;
    }

    // 1. 步兵雙肩（卡其綠色陸戰隊作訓服 USMC Khaki/Olive Drab）
    ctx.fillStyle = '#4b553d'; // 美軍野戰橄欖綠
    ctx.beginPath();
    ctx.ellipse(-2, -12, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-2, 12, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身體背帶裝備（武裝帶與彈匣包）
    ctx.fillStyle = '#374151';
    ctx.fillRect(-6, -8, 8, 16);

    // 2. 武器端持：木質槍身（胡桃木）+ 金屬槍管
    ctx.fillStyle = '#854d0e'; // 經典木質護木
    ctx.fillRect(4, -3, 14, 5);
    ctx.fillStyle = '#1e293b'; // 黑色槍管
    ctx.fillRect(16, -2, 8, 3);

    // 手部（膚色戰術握持）
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(6, -7, 3, 0, Math.PI * 2);
    ctx.arc(10, 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // 3. M1 鋼盔 (M1 Helmet) 頂視圖
    // 鋼盔外圓（深橄欖綠）
    ctx.fillStyle = '#3f4935';
    ctx.strokeStyle = '#22291e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 鋼盔前簷 (Front Visor/Brim)
    ctx.fillStyle = '#2f3826';
    ctx.beginPath();
    ctx.arc(4, 0, 8, -Math.PI / 3, Math.PI / 3);
    ctx.fill();

    // 鋼盔迷彩偽裝網紋理 (Camouflage Netting)
    ctx.strokeStyle = 'rgba(163, 163, 163, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.lineTo(7, 7);
    ctx.moveTo(-7, 7);
    ctx.lineTo(7, -7);
    ctx.stroke();

    // 海軍陸戰隊白色鷹地球錨徽章（簡化象徵：美軍白星 / 錨紋）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Enemy {
  public id: string;
  public type: EnemyType;
  public x: number;
  public y: number;
  public radius = 15;
  public baseSpeed = 1.8;
  public hp = 1;
  public maxHp = 1;
  public angle: number;
  public targetAngle: number;
  public state: EnemyState = 'PATROL';
  public viewDistance = 320;
  public patrolTimer = 0;
  public shootCooldown: number;
  public stunTimer = 0;
  public color = '#ef4444';
  public alertNoticeTimer = 0;
  public lastSeenPlayerPos: Point | null = null;
  public hasTriggeredAlertSound = false;

  // 自殺式特有屬性（敢死隊手榴彈突擊兵）
  public kamikazeExplodeTimer = -1;

  // 狙擊特有屬性（毛瑟 98K 狙擊手）
  public sniperAimTimer = 0;

  constructor(x: number, y: number, type: EnemyType = 'standard') {
    this.id = Math.random().toString(36).substring(2, 9);
    this.type = type;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.shootCooldown = Math.floor(Math.random() * 40);

    switch (type) {
      case 'heavy':
        this.radius = 18;
        this.baseSpeed = 1.1;
        this.hp = 4;
        this.maxHp = 4;
        this.viewDistance = 300;
        this.color = '#71717a'; // 重裝鐵灰色
        break;

      case 'sniper':
        this.radius = 13;
        this.baseSpeed = 1.6;
        this.hp = 1;
        this.maxHp = 1;
        this.viewDistance = 460;
        this.color = '#38bdf8';
        break;

      case 'kamikaze':
        this.radius = 13;
        this.baseSpeed = 2.7;
        this.hp = 1;
        this.maxHp = 1;
        this.viewDistance = 280;
        this.color = '#dc2626';
        break;

      case 'standard':
      default:
        this.radius = 15;
        this.baseSpeed = 1.8;
        this.hp = 1;
        this.maxHp = 1;
        this.viewDistance = 320;
        this.color = '#94a3b8'; // 國防軍德式野田灰 Feldgrau
        break;
    }
  }

  public stun(frames = 240) {
    this.stunTimer = frames;
    this.state = 'PATROL';
    this.sniperAimTimer = 0;
    this.kamikazeExplodeTimer = -1;
  }

  public update(
    player: Player,
    canvasW: number,
    canvasH: number,
    buildings: Building[],
    bullets: Bullet[],
    particles: Particle[],
    nightOps = false,
    onKamikazeExplode?: (e: Enemy) => void
  ) {
    if (this.stunTimer > 0) {
      this.stunTimer--;
      if (Math.random() < 0.25) {
        createSparks(this.x, this.y, Math.random() * Math.PI * 2, '#ffe600', 1, particles);
      }
      return;
    }

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

    let angleDiff = Math.abs(this.angle - angleToPlayer);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

    const effectiveViewDist = nightOps ? this.viewDistance * 1.15 : this.viewDistance;
    const inFov = angleDiff < Math.PI * 0.45 || distToPlayer < 65;

    const hasClearLoS =
      inFov &&
      distToPlayer < effectiveViewDist &&
      !isLineBlockedByBuildings({ x: this.x, y: this.y }, { x: player.x, y: player.y }, buildings);

    if (hasClearLoS) {
      if (this.state !== 'ALERT') {
        this.alertNoticeTimer = 45;
        if (!this.hasTriggeredAlertSound) {
          sound.playAlertSound();
          this.hasTriggeredAlertSound = true;
        }
      }
      this.state = 'ALERT';
      player.isExposed = true;
      this.lastSeenPlayerPos = { x: player.x, y: player.y };
      this.angle = angleToPlayer;

      this.handleAlertBehavior(
        player,
        distToPlayer,
        bullets,
        particles,
        nightOps,
        onKamikazeExplode
      );
    } else {
      this.hasTriggeredAlertSound = false;
      this.sniperAimTimer = 0;

      if (this.state === 'ALERT' && this.lastSeenPlayerPos) {
        const distToLast = Math.hypot(
          this.lastSeenPlayerPos.x - this.x,
          this.lastSeenPlayerPos.y - this.y
        );
        if (distToLast > 30) {
          this.angle = Math.atan2(this.lastSeenPlayerPos.y - this.y, this.lastSeenPlayerPos.x - this.x);
          this.x += Math.cos(this.angle) * this.baseSpeed;
          this.y += Math.sin(this.angle) * this.baseSpeed;
        } else {
          this.state = 'PATROL';
          this.lastSeenPlayerPos = null;
        }
      } else {
        this.state = 'PATROL';
        this.patrolTimer--;
        if (this.patrolTimer <= 0) {
          this.targetAngle = Math.random() * Math.PI * 2;
          this.patrolTimer = 70 + Math.floor(Math.random() * 90);
        }
        this.angle += (this.targetAngle - this.angle) * 0.05;
        this.x += Math.cos(this.angle) * this.baseSpeed;
        this.y += Math.sin(this.angle) * this.baseSpeed;
      }
    }

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.alertNoticeTimer > 0) this.alertNoticeTimer--;

    this.x = Math.max(this.radius, Math.min(canvasW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasH - this.radius, this.y));
    buildings.forEach((b) => resolveCircleRectCollision(this, b));
  }

  private handleAlertBehavior(
    player: Player,
    distToPlayer: number,
    bullets: Bullet[],
    particles: Particle[],
    nightOps: boolean,
    onKamikazeExplode?: (e: Enemy) => void
  ) {
    if (this.type === 'kamikaze') {
      this.x += Math.cos(this.angle) * this.baseSpeed * 1.35;
      this.y += Math.sin(this.angle) * this.baseSpeed * 1.35;

      if (distToPlayer < 40) {
        if (this.kamikazeExplodeTimer === -1) {
          this.kamikazeExplodeTimer = 18;
          sound.playSniperCharge();
        }
      }

      if (this.kamikazeExplodeTimer > 0) {
        this.kamikazeExplodeTimer--;
        createSparks(this.x, this.y, Math.random() * Math.PI * 2, '#ef4444', 2, particles);
        if (this.kamikazeExplodeTimer <= 0) {
          if (onKamikazeExplode) onKamikazeExplode(this);
        }
      }
    } else if (this.type === 'sniper') {
      if (distToPlayer < 240) {
        this.x -= Math.cos(this.angle) * this.baseSpeed * 1.2;
        this.y -= Math.sin(this.angle) * this.baseSpeed * 1.2;
      }

      this.sniperAimTimer++;
      if (this.sniperAimTimer === 30) {
        sound.playSniperCharge();
      }

      if (this.sniperAimTimer >= 70 && this.shootCooldown <= 0) {
        this.shootSniper(bullets, particles);
        this.sniperAimTimer = 0;
        this.shootCooldown = 90;
      }
    } else if (this.type === 'heavy') {
      if (distToPlayer > 140) {
        this.x += Math.cos(this.angle) * this.baseSpeed;
        this.y += Math.sin(this.angle) * this.baseSpeed;
      }

      if (this.shootCooldown <= 0) {
        this.shootHeavy(bullets, particles);
        this.shootCooldown = 35;
      }
    } else {
      const currentSpeed = nightOps ? this.baseSpeed * 1.3 : this.baseSpeed * 1.15;
      if (distToPlayer > 190) {
        this.x += Math.cos(this.angle) * currentSpeed;
        this.y += Math.sin(this.angle) * currentSpeed;
      } else if (distToPlayer < 90) {
        this.x -= Math.cos(this.angle) * currentSpeed * 0.8;
        this.y -= Math.sin(this.angle) * currentSpeed * 0.8;
      }

      if (this.shootCooldown <= 0) {
        this.shootStandard(bullets, particles);
        this.shootCooldown = (nightOps ? 45 : 55) + Math.floor(Math.random() * 20);
      }
    }
  }

  public shootStandard(bullets: Bullet[], particles: Particle[]) {
    sound.playEnemyShot();
    const spread = (Math.random() - 0.5) * 0.16;
    const shootAngle = this.angle + spread;
    const muzzleX = this.x + Math.cos(shootAngle) * (this.radius + 6);
    const muzzleY = this.y + Math.sin(shootAngle) * (this.radius + 6);

    // 德軍 MP40 衝鋒槍金屬彈
    bullets.push(new Bullet(muzzleX, muzzleY, shootAngle, 9.5, '#f59e0b', 'enemy', 'gauss', 1));
    createSparks(muzzleX, muzzleY, shootAngle, '#f59e0b', 4, particles);
  }

  public shootSniper(bullets: Bullet[], particles: Particle[]) {
    sound.playGaussShot();
    const muzzleX = this.x + Math.cos(this.angle) * (this.radius + 8);
    const muzzleY = this.y + Math.sin(this.angle) * (this.radius + 8);

    // 毛瑟 98K 狙擊高精度高速彈
    bullets.push(new Bullet(muzzleX, muzzleY, this.angle, 17, '#f87171', 'enemy', 'gauss', 1));
    createSparks(muzzleX, muzzleY, this.angle, '#f87171', 6, particles);
  }

  public shootHeavy(bullets: Bullet[], particles: Particle[]) {
    sound.playHeavyShot();
    // MG42 機槍撕裂彈
    [-0.08, 0.08].forEach((offset) => {
      const shootAngle = this.angle + offset;
      const muzzleX = this.x + Math.cos(shootAngle) * (this.radius + 6);
      const muzzleY = this.y + Math.sin(shootAngle) * (this.radius + 6);
      bullets.push(new Bullet(muzzleX, muzzleY, shootAngle, 10.5, '#ef4444', 'enemy', 'gauss', 1));
    });
    createSparks(this.x, this.y, this.angle, '#ef4444', 5, particles);
  }

  /**
   * 繪製【德軍士兵 (Wehrmacht / Nazi Soldier)】造型：
   * - 標誌性 M35/M40 德軍德式鋼盔 (Stahlhelm) 特色輪廓（兩側明顯突出的護耳下延邊緣、後頸延伸下緣）
   * - 德軍野戰灰 (Feldgrau / Field Grey) 戰袍雙肩
   * - 右側手臂帶有經典紅色識別袖章 (Armband / Reichsadler Emblem)
   * - 武器：MP40 衝鋒槍 / MG42 重機槍 / 毛瑟 98K / M24 炳式長手榴彈
   */
  public draw(ctx: CanvasRenderingContext2D, buildings: Building[], showVisionCone: boolean) {
    // 視野錐體
    if (showVisionCone && this.stunTimer <= 0) {
      ctx.save();
      const coneAngle = this.type === 'sniper' ? Math.PI * 0.28 : Math.PI * 0.45;
      const startAngle = this.angle - coneAngle / 2;
      const raySteps = 10;
      const angleStep = coneAngle / raySteps;

      let coneFill = 'rgba(239, 68, 68, 0.07)';
      if (this.state === 'ALERT') {
        if (this.type === 'sniper') coneFill = 'rgba(248, 113, 113, 0.18)';
        else if (this.type === 'heavy') coneFill = 'rgba(161, 98, 7, 0.16)';
        else if (this.type === 'kamikaze') coneFill = 'rgba(220, 38, 38, 0.22)';
        else coneFill = 'rgba(239, 68, 68, 0.14)';
      }

      ctx.fillStyle = coneFill;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);

      for (let i = 0; i <= raySteps; i++) {
        const curA = startAngle + angleStep * i;
        const ray = raycastToBuildings({ x: this.x, y: this.y }, curA, this.viewDistance, buildings);
        ctx.lineTo(ray.hit.x, ray.hit.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 狙擊預警線
    if (this.type === 'sniper' && this.state === 'ALERT' && this.stunTimer <= 0) {
      const ray = raycastToBuildings({ x: this.x, y: this.y }, this.angle, this.viewDistance, buildings);
      ctx.save();
      ctx.strokeStyle = `rgba(248, 113, 113, ${Math.min(1, this.sniperAimTimer / 60)})`;
      ctx.lineWidth = this.sniperAimTimer > 50 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(ray.hit.x, ray.hit.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.stunTimer > 0) {
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 14;
    } else if (this.state === 'ALERT') {
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 16;
    }

    ctx.rotate(this.angle);

    // 1. 德軍制服雙肩（野戰灰 Feldgrau 羊毛呢大衣）
    const coatColor = this.type === 'heavy' ? '#334155' : '#475569';
    ctx.fillStyle = coatColor;
    ctx.beginPath();
    ctx.ellipse(-2, -12, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-2, 12, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 左手臂：德軍紅色袖章標誌 (Red Armband with Center Emblem)
    ctx.fillStyle = '#dc2626'; // 猩紅袖章
    ctx.fillRect(-5, -14, 4, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -13, 2, 1);

    // 黑色戰術皮帶 (Belt & Y-Straps)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6, -7, 6, 14);

    // 2. 武器端持
    ctx.fillStyle = '#1e293b';
    if (this.type === 'heavy') {
      // MG42 通用機槍（長散熱筒與雙腳架）
      ctx.fillRect(4, -5, 20, 10);
      ctx.fillStyle = '#475569';
      ctx.fillRect(18, -2, 6, 4);
    } else if (this.type === 'sniper') {
      // 毛瑟 Kar98k 狙擊步槍（附長瞄準鏡）
      ctx.fillStyle = '#78350f'; // 胡桃木托
      ctx.fillRect(4, -3, 14, 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(16, -2, 9, 3);
      // 瞄準鏡
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(8, -5, 8, 2);
    } else if (this.type === 'kamikaze') {
      // M24 炳式長手榴彈 (Stielhandgranate "Potato Masher")
      ctx.fillStyle = '#92400e'; // 木柄
      ctx.fillRect(3, -2, 12, 4);
      ctx.fillStyle = '#475569'; // 金屬彈頭
      ctx.fillRect(14, -4, 8, 8);
    } else {
      // MP40 衝鋒槍（折疊槍托、黑色金屬機匣與下垂彈匣）
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, -3, 16, 5);
      ctx.fillRect(10, 2, 3, 7); // 下垂直彈匣
    }

    // 手部（手套/膚色）
    ctx.fillStyle = '#1e293b'; // 黑色皮手套
    ctx.beginPath();
    ctx.arc(6, -7, 3, 0, Math.PI * 2);
    ctx.arc(10, 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // 3. 德式鋼盔 (Stahlhelm M35/M40)
    // 德軍鋼盔特點：圓頂，但在兩側與後部有明顯加寬護耳下沿（Bell shape）
    ctx.fillStyle = '#334155'; // 炭黑色/鐵灰塗裝
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    // 構建鋼盔特徵輪廓：前簷較短，兩側外擴護耳，後頸向後延伸
    ctx.moveTo(8, -5);
    ctx.quadraticCurveTo(11, 0, 8, 5);     // 前端眉簷
    ctx.quadraticCurveTo(2, 12, -4, 12);   // 左護耳向外凸展
    ctx.quadraticCurveTo(-11, 8, -10, 0);  // 後頸護邊
    ctx.quadraticCurveTo(-11, -8, -4, -12);// 右護耳外凸
    ctx.quadraticCurveTo(2, -12, 8, -5);   // 回到前簷
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鋼盔頂部弧度陰影
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(-1, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // 鋼盔側面的三色盾徽 (National colors decal: 黑白紅 / 鐵十字象徵標記)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, -10.5, 3, 1.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -9, 3, 1);

    ctx.restore();

    // 重裝兵生命條
    if (this.maxHp > 1 && this.hp > 0) {
      const barW = 28;
      const barH = 3.5;
      const barX = this.x - barW / 2;
      const barY = this.y - this.radius - 11;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }

    // 狀態標籤
    if (this.stunTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#ffe600';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ STUNNED', this.x, this.y - 22);
      ctx.restore();
    } else if (this.kamikazeExplodeTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 13px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💥 BOOM!', this.x, this.y - 22);
      ctx.restore();
    } else if (this.state === 'ALERT' || this.alertNoticeTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      const label =
        this.type === 'heavy'
          ? 'MG42 德軍重機槍手'
          : this.type === 'sniper'
          ? '98K 德軍狙擊手'
          : this.type === 'kamikaze'
          ? 'M24 手榴彈突擊手'
          : '納粹國防軍步兵';
      ctx.fillText(label, this.x, this.y - 22);
      ctx.restore();
    }
  }
}

export class Bullet {
  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  public vx: number;
  public vy: number;
  public color: string;
  public source: 'player' | 'enemy';
  public weaponType: WeaponType;
  public damage: number;
  public alive = true;

  constructor(
    x: number,
    y: number,
    angle: number,
    speed: number,
    color: string,
    source: 'player' | 'enemy',
    weaponType: WeaponType,
    damage = 1
  ) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.source = source;
    this.weaponType = weaponType;
    this.damage = damage;
  }

  public update(
    canvasW: number,
    canvasH: number,
    buildings: Building[],
    player: Player,
    enemies: Enemy[],
    particles: Particle[],
    onEnemyKilled?: (e: Enemy, stealth: boolean) => void,
    onPlayerHit?: () => void,
    onBuildingDestroyed?: (b: Building) => void
  ) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx;
    this.y += this.vy;

    // 1. 檢測子彈是否飛出地圖
    if (this.x < 0 || this.x > canvasW || this.y < 0 || this.y > canvasH) {
      this.alive = false;
      return;
    }

    // 2. 子彈高速連續軌跡與建築物掩體碰撞檢測
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (isLineBlockedByBuildings({ x: this.prevX, y: this.prevY }, { x: this.x, y: this.y }, [b])) {
        this.alive = false;

        if (b.destructible && b.hp !== undefined) {
          b.hp -= this.damage;
          sound.playDebrisHit();
          createSparks(this.x, this.y, Math.atan2(-this.vy, -this.vx), '#f59e0b', 8, particles);

          if (b.hp <= 0) {
            sound.playExplosion();
            createSparks(b.x + b.w / 2, b.y + b.h / 2, 0, '#f97316', 24, particles);
            buildings.splice(i, 1);
            if (onBuildingDestroyed) onBuildingDestroyed(b);
          }
        } else {
          sound.playRicochet();
          createSparks(this.x, this.y, Math.atan2(-this.vy, -this.vx), '#94a3b8', 6, particles);
        }
        return;
      }
    }

    // 3. 實體受擊檢測
    if (this.source === 'player') {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + 5) {
          this.alive = false;

          if (this.weaponType === 'emp') {
            const empLevel = player.upgradeLevels['emp_radius'] || 0;
            const stunDuration = 240 + empLevel * 90;
            e.stun(stunDuration);
            createSparks(e.x, e.y, 0, '#ffe600', 16, particles);
          } else {
            const isStealth = e.state === 'PATROL';
            e.hp -= this.damage;
            createSparks(e.x, e.y, 0, '#ef4444', 16, particles);

            if (e.hp <= 0) {
              sound.playEnemyDown();
              enemies.splice(i, 1);
              if (onEnemyKilled) onEnemyKilled(e, isStealth);
            } else {
              sound.playDebrisHit();
              e.state = 'ALERT';
              e.lastSeenPlayerPos = { x: player.x, y: player.y };
            }
          }
          break;
        }
      }
    } else if (this.source === 'enemy') {
      if (Math.hypot(player.x - this.x, player.y - this.y) < player.radius + 4) {
        this.alive = false;
        player.takeDamage(particles);
        if (onPlayerHit) onPlayerHit();
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.weaponType === 'scatter' ? 2.5 : 3.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.9, this.y - this.vy * 0.9);
    ctx.stroke();
    ctx.restore();
  }
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life = 1.0;
  public decay: number;
  public color: string;
  public size: number;

  constructor(x: number, y: number, angle: number, color: string) {
    this.x = x;
    this.y = y;
    const speed = Math.random() * 4.5 + 1;
    const spread = (Math.random() - 0.5) * 1.6;
    this.vx = Math.cos(angle + spread) * speed;
    this.vy = Math.sin(angle + spread) * speed;
    this.decay = Math.random() * 0.05 + 0.03;
    this.color = color;
    this.size = Math.random() * 2.5 + 1.5;
  }

  public update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function createSparks(
  x: number,
  y: number,
  baseAngle: number,
  color: string,
  count: number,
  particles: Particle[]
) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, baseAngle + Math.PI, color));
  }
}
