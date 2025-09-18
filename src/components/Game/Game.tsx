import React, { useEffect, useRef } from "react";
import { FOOD_COLORS } from "@utils/constants";
import { getOpponentColor, hashCode } from "@utils/helper";
import { Blob, Food, Circle } from "@utils/types";

interface GameComponentProps {
  players: Blob[];
  allPlayers: Blob[];
  visibleFood: Food[];
  currentPlayer: Blob | null;
  screenSize: { width: number; height: number };
  gameSize: number;
  buyIn: number;
  newTarget: { x: number; y: number };
  gameEnded: number;
}

type Threat = "prey" | "even" | "danger";

const SMOOTHING_FACTOR = 0.1;

const INDICATOR_MARGIN = 64;
const BASE_INDICATOR_SIZE = 32;
const MAX_INDICATORS = 3;
const SIZE_RANGE = { min: 0.9, max: 1.35 };
const OPACITY_RANGE = { min: 0.65, max: 0.95 };
const GLOW_BASE = 6;
const GLOW_RANGE = 8;
const PREY_RGB = [80, 255, 170] as const;
const EVEN_RGB = [255, 255, 255] as const;
const DANGER_RGB = [255, 90, 90] as const;
const ICONS = ["/slimey2.png", "/ggoat.png", "/grhino.png", "/gsnake.png", "/gpig.png", "/gcroc.png"];

const avatarCache = new Map<string, HTMLImageElement>();
const tintCache = new Map<string, HTMLCanvasElement>();
const rgba = (rgb: readonly [number, number, number], a: number) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
const PALETTE = [0, 40, 80, 160, 200, 260, 300, 340];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function totalMass(b: Blob | null | undefined) {
  if (!b) return 0;
  if (b.circles?.length) {
    return b.circles.reduce((s, c) => s + (c.size ?? 0), 0);
  }
  return b.score ?? 0;
}

function distanceFactor(dx: number, dy: number, halfW: number, halfH: number) {
  const dist = Math.hypot(dx, dy);
  const diag = Math.hypot(halfW, halfH);
  const t = 1 - clamp(dist / (1.25 * diag), 0, 1);
  return t;
}

function loadImageOnce(src: string): HTMLImageElement {
  if (avatarCache.has(src)) return avatarCache.get(src)!;
  const img = new Image();
  img.src = src;
  avatarCache.set(src, img);
  return img;
}

function pickHueForBlob(authority_or_name: string): number {
  const str = authority_or_name || "";
  const hash = hashCode(str);
  return PALETTE[hash % PALETTE.length];
}

function stableIconForOpponent(authority: string | null, name: string): string {
  const id = authority || name || "";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % ICONS.length;
  return ICONS[idx];
}

function getHueShiftedAvatar(
  img: HTMLImageElement,
  hueDeg: number,
  saturate = 1.0,
  brightness = 1.0,
): HTMLCanvasElement {
  const key = `${img.src}|hr:${hueDeg}|s:${saturate}|b:${brightness}`;
  const cached = tintCache.get(key);
  if (cached) return cached;

  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.filter = `hue-rotate(${hueDeg}deg) saturate(${saturate}) brightness(${brightness})`;
  ctx.drawImage(img, 0, 0);
  ctx.filter = "none";

  tintCache.set(key, c);
  return c;
}

const GameComponent: React.FC<GameComponentProps> = ({
  players,
  allPlayers,
  visibleFood,
  currentPlayer,
  screenSize,
  gameSize,
  buyIn,
  newTarget,
  gameEnded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenSizeRef = useRef(screenSize);
  const gameSizeRef = useRef(gameSize);
  const foodRef = useRef(visibleFood);
  const newTargetRef = useRef(newTarget);
  const lastMeRef = useRef<Blob | null>(null);

  const timeStep = 40.0;

  const previousTime = useRef(0.0);
  const accumulator = useRef(0.0);

  const currentPlayerRef = useRef<Blob | null>(null);
  const previousPlayerPos = useRef(currentPlayerRef.current);
  const currentPlayerOnchainRef = useRef<Blob | null>(null);

  const allPlayersRef = useRef<Blob[]>([]);
  useEffect(() => {
    allPlayersRef.current = allPlayers;
  }, [allPlayers]);

  useEffect(() => {
    if (currentPlayer) lastMeRef.current = currentPlayer;
  }, [currentPlayer]);

  const playersRef = useRef<Blob[]>([]);
  const previousPlayersRef = useRef<Blob[]>(playersRef.current);
  const playersOnchainRef = useRef<Blob[]>([]);

  const gameEndedRef = useRef(gameEnded);

  useEffect(() => {
    gameEndedRef.current = gameEnded;
  }, [gameEnded]);

  useEffect(() => {
    screenSizeRef.current = screenSize;
  }, [screenSize]);

  useEffect(() => {
    gameSizeRef.current = gameSize;
  }, [gameSize]);

  useEffect(() => {
    foodRef.current = visibleFood;
  }, [visibleFood]);

  useEffect(() => {
    newTargetRef.current = newTarget;
  }, [newTarget]);

  useEffect(() => {
    if (players.length > 0) {
      playersOnchainRef.current = players;
    }

    players.forEach((player) => {
      const playerExists = playersRef.current.some(
        (existingPlayer) => existingPlayer.authority?.toString() === player.authority?.toString(),
      );
      if (!playerExists) {
        playersRef.current.push(player);
      }
    });

    playersRef.current = playersRef.current.filter((existingPlayer) =>
      players.some((player) => player.authority?.toString() === existingPlayer.authority?.toString()),
    );

    playersRef.current.forEach((p) => {
      const updated = players.find((u) => u.authority?.toString() === p.authority?.toString());
      if (!updated) return;
      p.circles = reconcileCircles(p.circles, updated.circles ?? []);
      p.target_x = updated.target_x;
      p.target_y = updated.target_y;
      p.score = updated.score;
    });
  }, [players]);

  useEffect(() => {
    currentPlayerOnchainRef.current = currentPlayer;
    if (currentPlayerRef.current == null) {
      currentPlayerRef.current = currentPlayer;
    }
    if (
      currentPlayerRef.current &&
      currentPlayer &&
      currentPlayerRef.current.circles.length != currentPlayer.circles.length
    ) {
      if (currentPlayer.circles.length < currentPlayerRef.current.circles.length) {
        const index = currentPlayerRef.current.circles.length - 1;
        const newCircles = currentPlayerRef.current.circles.filter((_, idx) => idx !== index).map((c) => ({ ...c }));
        currentPlayerRef.current.circles = newCircles;
      }
      if (currentPlayer.circles.length > currentPlayerRef.current.circles.length) {
        let newCircles = currentPlayerRef.current.circles.map((c) => ({ ...c }));
        const diff = currentPlayer.circles.length - currentPlayerRef.current.circles.length;
        const lastItems = currentPlayer.circles.slice(-diff);
        newCircles.push(...lastItems);
        currentPlayerRef.current.circles = newCircles;
      }
    }
    if (currentPlayerRef.current && currentPlayer) {
      currentPlayerRef.current.circles = reconcileCircles(
        currentPlayerRef.current.circles,
        currentPlayer.circles ?? [],
      );
      currentPlayerRef.current.target_x = currentPlayer.target_x;
      currentPlayerRef.current.target_y = currentPlayer.target_y;
      currentPlayerRef.current.score = currentPlayer.score;
    }
    foodRef.current = visibleFood;
  }, [currentPlayer]);

  function projectToScreenEdge(
    dx: number,
    dy: number,
    halfW: number,
    halfH: number,
    margin = INDICATOR_MARGIN,
  ): { x: number; y: number; angle: number } | null {
    if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) return null;

    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    const ux = dx / len;
    const uy = dy / len;

    const kx = ux !== 0 ? (ux > 0 ? (halfW - margin) / ux : (-halfW + margin) / ux) : Infinity;
    const ky = uy !== 0 ? (uy > 0 ? (halfH - margin) / uy : (-halfH + margin) / uy) : Infinity;
    const k = Math.min(Math.abs(kx), Math.abs(ky));

    const x = ux * k + halfW;
    const y = uy * k + halfH;

    const angle = Math.atan2(uy, ux);
    return { x, y, angle };
  }

  function getThreat(opp: Blob, me: Blob | null): Threat {
    const ref = me ?? lastMeRef.current;
    if (!ref) return "even";
    const myMass = totalMass(ref);
    const theirMass = totalMass(opp);
    const ratio = theirMass / Math.max(1, myMass);
    return ratio >= 1.05 ? "danger" : "prey";
  }

  function drawArrowIndicator(
    ctx: CanvasRenderingContext2D,
    ind: { x: number; y: number; angle: number; label: string; threat: Threat; scale: number; opacity: number },
  ) {
    const t = performance.now() * 0.001;
    const pulse = GLOW_BASE + GLOW_RANGE * (0.5 + 0.5 * Math.sin(t * 2.0));

    const baseRGB = ind.threat === "danger" ? DANGER_RGB : ind.threat === "prey" ? PREY_RGB : EVEN_RGB;

    const size = BASE_INDICATOR_SIZE * ind.scale;

    const tipX = ind.x + Math.cos(ind.angle) * size;
    const tipY = ind.y + Math.sin(ind.angle) * size;
    const tailX = ind.x - Math.cos(ind.angle) * size * 0.7;
    const tailY = ind.y - Math.sin(ind.angle) * size * 0.7;

    const grad = ctx.createLinearGradient(tipX, tipY, tailX, tailY);
    grad.addColorStop(0, rgba(baseRGB, ind.opacity));
    grad.addColorStop(1, rgba([255, 255, 255], 0.12 * ind.opacity));

    ctx.save();
    ctx.translate(ind.x, ind.y);
    ctx.rotate(ind.angle);

    ctx.shadowColor = rgba(baseRGB, 0.75);
    ctx.shadowBlur = pulse;

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, size * 0.6);
    ctx.lineTo(-size * 0.6, -size * 0.6);
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 0.6, 0);
    ctx.lineTo(-size * 0.4, size * 0.35);
    ctx.lineTo(-size * 0.4, -size * 0.35);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();

    ctx.restore();

    const labelX = ind.x + Math.cos(ind.angle) * (size + 12);
    const labelY = ind.y + Math.sin(ind.angle) * (size + 6);

    ctx.save();
    ctx.font = "600 12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const text = ind.label;
    const textW = ctx.measureText(text).width;
    const pillW = textW + 16;
    const pillH = 18;
    const radius = 9;

    ctx.translate(labelX, labelY);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-pillW / 2 + radius, 0);
    ctx.arcTo(pillW / 2, 0, pillW / 2, pillH, radius);
    ctx.arcTo(pillW / 2, pillH, -pillW / 2, pillH, radius);
    ctx.arcTo(-pillW / 2, pillH, -pillW / 2, 0, radius);
    ctx.arcTo(-pillW / 2, 0, pillW / 2, 0, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, pillH / 2 - 1);
    ctx.restore();
  }

  const updatePlayerPositionImmutable = (player: Blob, target_x: number, target_y: number, gameSize: number): Blob => {
    if (!player.circles || player.circles.length === 0) {
      return player;
    }
    const newCircles = player.circles.map((circle) => {
      const { x: player_x, y: player_y, speed, size } = circle;
      const player_speed = speed * 0.1;
      const dx = target_x - player_x;
      const dy = target_y - player_y;
      const deg = Math.atan2(dy, dx);

      let slow_down = 1.0;
      if (player_speed <= 6.3) {
        const ratio = size / 10;
        if (ratio > 0) {
          const val = Math.log(ratio) * 0.17 + 0.22;
          slow_down = Math.max(val, 0.1);
        }
      }
      let delta_x = (player_speed * Math.cos(deg)) / slow_down;
      let delta_y = (player_speed * Math.sin(deg)) / slow_down;

      let newX = player_x + delta_x;
      let newY = player_y + delta_y;
      newX = Math.round(newX);
      newY = Math.round(newY);
      newX = Math.max(0, Math.min(newX, gameSize));
      newY = Math.max(0, Math.min(newY, gameSize));

      return {
        ...circle,
        x: newX,
        y: newY,
      };
    });

    const x_sum = newCircles.reduce((sum, c) => sum + c.x, 0);
    const y_sum = newCircles.reduce((sum, c) => sum + c.y, 0);
    const avgX = x_sum / newCircles.length;
    const avgY = y_sum / newCircles.length;

    return {
      ...player,
      circles: newCircles,
      x: avgX,
      y: avgY,
    };
  };

  const loop = (time: number) => {
    if (gameEndedRef.current != 0 && gameEndedRef.current != 4) {
      return;
    }

    const dt = time - previousTime.current;
    previousTime.current = time;

    accumulator.current += dt;

    while (accumulator.current >= timeStep) {
      if (currentPlayerRef.current) {
        previousPlayerPos.current = {
          ...currentPlayerRef.current,
          circles: currentPlayerRef.current.circles.map((c) => ({ ...c })),
        };
        currentPlayerRef.current = updatePlayerPositionImmutable(
          currentPlayerRef.current,
          newTargetRef.current.x,
          newTargetRef.current.y,
          gameSizeRef.current,
        );
      }

      if (playersRef.current) {
        previousPlayersRef.current = playersRef.current.map((player) => ({
          ...player,
          circles: player.circles.map((circle) => ({ ...circle })),
        }));
        playersRef.current = playersRef.current.map((existingPlayer) =>
          updatePlayerPositionImmutable(
            existingPlayer,
            existingPlayer.target_x,
            existingPlayer.target_y,
            gameSizeRef.current,
          ),
        );
      }

      if (currentPlayerRef.current && currentPlayerOnchainRef.current) {
        currentPlayerRef.current.x +=
          SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.x - currentPlayerRef.current.x);
        currentPlayerRef.current.y +=
          SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.y - currentPlayerRef.current.y);

        currentPlayerRef.current.circles.forEach((circle, index) => {
          if (currentPlayerOnchainRef.current && currentPlayerOnchainRef.current.circles[index]) {
            circle.x += SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.circles[index].x - circle.x);
            circle.y += SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.circles[index].y - circle.y);
          }
        });
      }

      if (playersRef.current) {
        playersRef.current.forEach((existingPlayer) => {
          const updatedPlayer = playersOnchainRef.current.find(
            (player) => player.authority?.toString() === existingPlayer.authority?.toString(),
          );
          if (updatedPlayer) {
            existingPlayer.x += SMOOTHING_FACTOR * (updatedPlayer.x - existingPlayer.x);
            existingPlayer.y += SMOOTHING_FACTOR * (updatedPlayer.y - existingPlayer.y);

            existingPlayer.circles.forEach((circle, index) => {
              if (updatedPlayer && updatedPlayer.circles[index]) {
                circle.x += SMOOTHING_FACTOR * (updatedPlayer.circles[index].x - circle.x);
                circle.y += SMOOTHING_FACTOR * (updatedPlayer.circles[index].y - circle.y);
              }
            });
          }
        });
      }

      accumulator.current -= timeStep;
    }

    const alpha = accumulator.current / timeStep;

    if (previousPlayerPos.current && currentPlayerRef.current) {
      renderWithInterpolation(previousPlayerPos.current, currentPlayerRef.current, alpha);
    }

    window.requestAnimationFrame(loop);
  };

  const renderWithInterpolation = (prevPos: Blob, currPos: Blob, alpha: number) => {
    if (currentPlayerRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = screenSizeRef.current.width;
          canvas.height = screenSizeRef.current.height;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const interpolatedX = prevPos.x + (currPos.x - prevPos.x) * alpha;
          const interpolatedY = prevPos.y + (currPos.y - prevPos.y) * alpha;
          const interpolatedCircles = interpolateCircles(prevPos.circles, currPos.circles, alpha);

          //}
          drawBackground(ctx, { x: interpolatedX, y: interpolatedY }, screenSizeRef.current);

          const halfW = screenSizeRef.current.width / 2;
          const halfH = screenSizeRef.current.height / 2;

          const candidates = allPlayersRef.current
            .filter(
              (p) =>
                p.circles.length > 0 &&
                p.authority &&
                currentPlayerRef.current?.authority &&
                p.authority.toString() !== currentPlayerRef.current.authority.toString(),
            )
            .map((p) => {
              const dx = p.x - interpolatedX;
              const dy = p.y - interpolatedY;
              const dist2 = dx * dx + dy * dy;
              return { blob: p, dx, dy, dist2 };
            })
            .sort((a, b) => a.dist2 - b.dist2);

          const picked: {
            x: number;
            y: number;
            angle: number;
            label: string;
            threat: Threat;
            scale: number;
            opacity: number;
          }[] = [];

          for (const c of candidates) {
            const projection = projectToScreenEdge(c.dx, c.dy, halfW, halfH, INDICATOR_MARGIN);
            if (!projection) continue;

            const label =
              c.blob.name && c.blob.name !== "unnamed"
                ? c.blob.name
                : `P${(c.blob.authority?.toString() || "").slice(0, 4)}`;

            const f = distanceFactor(c.dx, c.dy, halfW, halfH);
            const scale = lerp(SIZE_RANGE.min, SIZE_RANGE.max, f);
            const opacity = lerp(OPACITY_RANGE.min, OPACITY_RANGE.max, f);

            picked.push({
              x: projection.x,
              y: projection.y,
              angle: projection.angle,
              label,
              threat: getThreat(c.blob, currentPlayerRef.current),
              scale,
              opacity,
            });

            if (picked.length >= MAX_INDICATORS) break;
          }

          for (const ind of picked) {
            drawArrowIndicator(ctx, ind);
          }

          playersRef.current.forEach((blob, index) => {
            const prevBlob = previousPlayersRef.current[index] || blob;
            const interpolatedBlobX = prevBlob.x + (blob.x - prevBlob.x) * alpha;
            const interpolatedBlobY = prevBlob.y + (blob.y - prevBlob.y) * alpha;

            const interpolatedBlobCircles = interpolateCircles(prevBlob.circles, blob.circles, alpha);

            const adjustedX = interpolatedBlobX - interpolatedX + screenSizeRef.current.width / 2;
            const adjustedY = interpolatedBlobY - interpolatedY + screenSizeRef.current.height / 2;
            const adjustedCircles = interpolatedBlobCircles.map((circle) => {
              return {
                ...circle,
                x: circle.x - interpolatedX + screenSizeRef.current.width / 2,
                y: circle.y - interpolatedY + screenSizeRef.current.height / 2,
              };
            });

            if (currentPlayerRef.current) {
              drawOpponentPlayer(ctx, { ...blob, x: adjustedX, y: adjustedY, circles: adjustedCircles });
            }
          });

          foodRef.current.forEach((food) => {
            drawFood(ctx, {
              ...food,
              x: food.x - interpolatedX + screenSizeRef.current.width / 2,
              y: food.y - interpolatedY + screenSizeRef.current.height / 2,
            });
          });

          const centeredPlayer = {
            ...currentPlayerRef.current,
            x: screenSizeRef.current.width / 2,
            y: screenSizeRef.current.height / 2,
          };

          drawMyPlayer(
            ctx,
            { ...centeredPlayer, x: centeredPlayer.x, y: centeredPlayer.y, circles: centeredPlayer.circles },
            { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY, circles: interpolatedCircles },
            buyIn,
            screenSizeRef.current,
          );
          drawBorder(
            ctx,
            { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY },
            screenSizeRef.current,
            gameSizeRef.current,
          );
        }
      }
    }
  };

  useEffect(() => {
    window.requestAnimationFrame((time) => {
      previousTime.current = time;
      window.requestAnimationFrame(loop);
    });
  }, []);

  function drawPotion(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cx: number,                 // center x
    cy: number,                 // center y
    longSide: number,           // destination long side in px
    options?: { verticalIsLongSide?: boolean } // default true
  ): boolean {
    if (!img.complete || img.naturalWidth === 0) return false;
  
    const { verticalIsLongSide = true } = options ?? {};
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
  
    // Scale so the chosen long side matches longSide (contain; no crop)
    const scale = verticalIsLongSide ? (longSide / ih) : (longSide / iw);
    const dw = iw * scale;   // dest width
    const dh = ih * scale;   // dest height
  
    // Top-left so it’s centered at (cx, cy)
    const dx = cx - dw / 2;
    const dy = cy - dh / 2;
  
    ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
    return true;
  }

  function drawAvatarCircle(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cx: number,
    cy: number,
    radius: number,
    authority_or_name?: string | null,
  ) {
    if (!img.complete || img.naturalWidth === 0) {
      return false;
    }

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2;
    const sy = (ih - side) / 2;

    ctx.save();

    // ctx.beginPath();
    // ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    // ctx.closePath();
    // ctx.clip();

    const source: CanvasImageSource = authority_or_name
      ? getHueShiftedAvatar(img, pickHueForBlob(authority_or_name || ""))
      : img;
    ctx.drawImage(source, sx, sy, side, side, cx - radius, cy - radius, radius * 2, radius * 2);

    ctx.restore();
    return true;
  }

  function drawOpponentPlayer(ctx: CanvasRenderingContext2D, blob: Blob) {
    const iconPath = stableIconForOpponent(blob.authority?.toString() ?? null, blob.name ?? "");
    const img = loadImageOnce(iconPath);

    for (const circle of blob.circles) {
      const { x, y, radius } = circle;

      const drawn = drawAvatarCircle(ctx, img, x, y, radius, blob.authority?.toBase58() || blob.name || "");
      if (!drawn) {
        const color = getOpponentColor(blob.authority, blob.name);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }

      if (blob.name) {
        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = "600 16px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(blob.name, x, y - radius - 8);
        ctx.restore();
      }
    }
  }

  function interpolateCircles(prev: Circle[], curr: Circle[], alpha: number): Circle[] {
    const out: Circle[] = new Array(curr.length);
    const n = Math.min(prev.length, curr.length);

    for (let i = 0; i < n; i++) {
      const a = prev[i],
        b = curr[i];
      out[i] = {
        ...a,
        x: a.x + (b.x - a.x) * alpha,
        y: a.y + (b.y - a.y) * alpha,
        radius: b.radius,
        speed: b.speed,
        size: b.size ?? a.size,
      };
    }
    for (let i = n; i < curr.length; i++) {
      const b = curr[i];
      const seed = prev[n - 1] ?? b;
      out[i] = { ...b, x: seed.x, y: seed.y };
    }
    return out;
  }

  function reconcileCircles(dst: Circle[], src: Circle[]): Circle[] {
    const out: Circle[] = new Array(src.length);

    const n = Math.min(dst.length, src.length);
    for (let i = 0; i < n; i++) {
      const d = dst[i];
      const s = src[i];
      out[i] = {
        ...d,
        radius: s.radius,
        speed: s.speed,
        size: s.size ?? d.size,
      };
    }

    for (let i = n; i < src.length; i++) {
      const s = src[i];
      const seed = dst[n - 1] ?? s;
      out[i] = {
        ...s,
        x: seed.x,
        y: seed.y,
      };
    }

    return out;
  }

  function drawMyPlayer(
    ctx: CanvasRenderingContext2D,
    blob: Blob,
    currentblob: Blob,
    buyIn: number,
    screenSize: { width: number; height: number },
  ) {
    const user = localStorage.getItem("user");
    let myIconPath = (user ? (JSON.parse(user).icon as string | undefined) : undefined) || "/slimey2.png";
    const img = loadImageOnce(myIconPath);

    for (const circle of currentblob.circles) {
      const cx = circle.x - currentblob.x + screenSize.width / 2;
      const cy = circle.y - currentblob.y + screenSize.height / 2;
      const r = circle.radius;

      const drawn = drawAvatarCircle(ctx, img, cx, cy, r);
      if (!drawn) {
        const color = getOpponentColor(blob.authority, blob.name);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food) => {
    const green_potion = loadImageOnce("/green_potion.png");
    const heart_potion = loadImageOnce("/heart_potion.png");
    const ice_potion = loadImageOnce("/ice_potion.png");
    const energy_potion = loadImageOnce("/energy_potion.png");

    let diameter = 20;
    let color = FOOD_COLORS[0];
    let img;
    if (food.food_value == 15.0) {
      img = green_potion;
      diameter = 60;
    }
    else if (food.food_value == 14.0) {
      img = heart_potion;
      diameter = 60;
    }
    else if (food.food_value == 13.0) {
      img = energy_potion;
      diameter = 60;
    }
    else if (food.food_value == 12.0) {
      img = ice_potion;
      diameter = 60;
    }
    else if (food.food_value == 11.0) {
      img = green_potion;
      diameter = 50;
    }
    else if (food.food_value == 10.0) {
      img = heart_potion;
      diameter = 50;
    }
    else if (food.food_value == 9.0) {
      img = energy_potion;
      diameter = 50;
    }
    else if (food.food_value == 8.0) {
      img = ice_potion;
      diameter = 50;
    }
    else if (food.food_value == 7.0) {
      img = green_potion;
      diameter = 40;
    }
    else if (food.food_value == 6.0) {
      img = heart_potion;
      diameter = 40;
    }
    else if (food.food_value == 5.0) {
      img = energy_potion;
      diameter = 40;
    }
    else if (food.food_value == 4.0) {
      img = ice_potion;
      diameter = 40;
    }
    else{
      const index = Math.max(0, Math.min(FOOD_COLORS.length - 1, food.food_value - 1));
      color = FOOD_COLORS[0];
      diameter = diameter + food.food_value * 5;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    if (img) {
      const drawn = drawPotion(ctx, img, food.x, food.y, diameter);
      if (!drawn) {
        ctx.beginPath();
        ctx.arc(food.x, food.y, diameter / 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }else{
      ctx.beginPath();
      ctx.arc(food.x, food.y, diameter / 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  const drawBorder = (
    ctx: CanvasRenderingContext2D,
    currentPlayer: Blob,
    screenSize: { width: number; height: number },
    gameSize: number,
  ) => {
    const offsetX = currentPlayer.x - screenSize.width / 2;
    const offsetY = currentPlayer.y - screenSize.height / 2;

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";

    ctx.beginPath();
    ctx.moveTo(0 - offsetX, 0 - offsetY);
    ctx.lineTo(gameSize - offsetX, 0 - offsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(gameSize - offsetX, 0 - offsetY);
    ctx.lineTo(gameSize - offsetX, gameSize - offsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(gameSize - offsetX, gameSize - offsetY);
    ctx.lineTo(0 - offsetX, gameSize - offsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0 - offsetX, gameSize - offsetY);
    ctx.lineTo(0 - offsetX, 0 - offsetY);
    ctx.stroke();
  };

  const drawBackground = (
    ctx: CanvasRenderingContext2D,
    playerPos: { x: number; y: number },
    screenSize: { width: number; height: number },
    spacing = 100,
    dotRadius = 5,
  ) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, screenSize.width, screenSize.height);

    const offsetX = -(playerPos.x % spacing);
    const offsetY = -(playerPos.y % spacing);

    ctx.fillStyle = "rgba(128, 128, 128, 0.5)";

    for (let x = offsetX; x < screenSize.width; x += spacing) {
      for (let y = offsetY; y < screenSize.height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  return (
    <canvas
      id="gamecanvas"
      ref={canvasRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    ></canvas>
  );
};

export default GameComponent;
