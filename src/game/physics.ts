import { Point, Building } from '../types/game';

/**
 * 檢查兩線段 (p1-p2) 與 (p3-p4) 是否相交
 * 關鍵幾何演算法：利用向量外積 (Cross Product / CCW) 判斷點是否位於線段的兩側
 */
export function lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const ccw = (A: Point, B: Point, C: Point) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

/**
 * 判斷點是否位於矩形內部
 */
export function pointInRect(p: Point, rect: { x: number; y: number; w: number; h: number }): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.w &&
         p.y >= rect.y && p.y <= rect.y + rect.h;
}

/**
 * 關鍵邏輯【視線遮擋 Line-of-Sight 射線檢測】：
 * 檢測起點 (from) 到終點 (to) 的直線是否被任何建築掩體阻斷
 */
export function isLineBlockedByBuildings(from: Point, to: Point, buildings: Building[]): boolean {
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    // 若任一點直接落在建築體內，判定視線被遮蔽
    if (pointInRect(from, b) || pointInRect(to, b)) {
      return true;
    }

    // 建築物矩形的四個頂點與四條邊
    const p1: Point = { x: b.x, y: b.y };
    const p2: Point = { x: b.x + b.w, y: b.y };
    const p3: Point = { x: b.x + b.w, y: b.y + b.h };
    const p4: Point = { x: b.x, y: b.y + b.h };

    // 分別檢測是否與矩形的四條邊相交
    if (lineIntersectsLine(from, to, p1, p2)) return true;
    if (lineIntersectsLine(from, to, p2, p3)) return true;
    if (lineIntersectsLine(from, to, p3, p4)) return true;
    if (lineIntersectsLine(from, to, p4, p1)) return true;
  }
  return false;
}

/**
 * 計算兩線段之具體交點（若有相交）
 */
export function getLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (denom === 0) return null; // 平行

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }
  return null;
}

/**
 * 射線射向建築物：回傳最近碰撞點與距離
 */
export function raycastToBuildings(
  from: Point,
  angle: number,
  maxDist: number,
  buildings: Building[]
): { hit: Point; dist: number; buildingHit: Building | null } {
  const to: Point = {
    x: from.x + Math.cos(angle) * maxDist,
    y: from.y + Math.sin(angle) * maxDist,
  };

  let closestDist = maxDist;
  let closestHit: Point = to;
  let hitBuilding: Building | null = null;

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const corners: [Point, Point][] = [
      [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }],
      [{ x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }],
      [{ x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }],
      [{ x: b.x, y: b.y + b.h }, { x: b.x, y: b.y }],
    ];

    for (const [p1, p2] of corners) {
      const pt = getLineIntersection(from, to, p1, p2);
      if (pt) {
        const d = Math.hypot(pt.x - from.x, pt.y - from.y);
        if (d < closestDist) {
          closestDist = d;
          closestHit = pt;
          hitBuilding = b;
        }
      }
    }
  }

  return { hit: closestHit, dist: closestDist, buildingHit: hitBuilding };
}

/**
 * 關鍵邏輯【圓形 vs 矩形平滑滑動碰撞 (Smooth Circle-AABB Resolution)】：
 * 將圓心夾限 (Clamp) 到矩形邊界上獲得最近點，若距離小於半徑則推離重疊量。
 * 支援多個掩體邊緣平滑滑動，不卡角。
 */
export function resolveCircleRectCollision(
  circle: { x: number; y: number; radius: number },
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));

  const distX = circle.x - closestX;
  const distY = circle.y - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < circle.radius * circle.radius) {
    const dist = Math.sqrt(distSq);
    if (dist === 0) {
      circle.x += 1;
      return true;
    }
    const overlap = circle.radius - dist;
    circle.x += (distX / dist) * overlap;
    circle.y += (distY / dist) * overlap;
    return true;
  }
  return false;
}
