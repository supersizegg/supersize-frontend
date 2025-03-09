import React, { useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const OPPONENT_COLORS = [
  "#1abc9c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#34495e",
  "#16a085",
  "#27ae60",
  "#2980b9",
  "#8e44ad",
  "#2c3e50",
  "#f1c40f",
  "#e67e22",
  "#e74c3c",
  "#ecf0f1",
  "#95a5a6",
  "#f39c12",
  "#d35400",
  "#c0392b",
  "#bdc3c7",
  "#7f8c8d",
];

const FOOD_COLORS = [
  "#12F194", // Green
  "#27D7A2",
  "#3DB7B5",
  "#579BCB",
  "#6C7BDE",
  "#825AF0",
  "#9A47FF", // Purple
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getOpponentColor(blob: Blob): string {
  const identifier = blob.authority ? blob.authority.toString() : blob.name;
  const index = hashCode(identifier) % OPPONENT_COLORS.length;
  return OPPONENT_COLORS[index];
}

interface Blob {
  name: string;
  authority: PublicKey | null;
  x: number;
  y: number;
  radius: number;
  mass: number;
  score: number;
  speed: number;
  removal: BN;
  target_x: number;
  target_y: number;
}

interface Food {
  x: number;
  y: number;
  size: number;
  food_type: boolean;
}

interface GameComponentProps {
  players: Blob[];
  visibleFood: Food[];
  currentPlayer: Blob | null;
  screenSize: { width: number; height: number };
  gameSize: number;
  newTarget: { x: number; y: number; boost: boolean };
}

const SMOOTHING_FACTOR = 0.1;

const GameComponent: React.FC<GameComponentProps> = ({
  players,
  visibleFood,
  currentPlayer,
  screenSize,
  gameSize,
  newTarget,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const foodRef = useRef(visibleFood);
  const newTargetRef = useRef(newTarget);

  const timeStep = 40.0; // any value >50 works, testing ~90

  const previousTime = useRef(0.0);
  const accumulator = useRef(0.0);

  const currentPlayerRef = useRef<Blob | null>(null);
  const previousPlayerPos = useRef(currentPlayerRef.current);
  const currentPlayerOnchainRef = useRef<Blob | null>(null);

  const playersRef = useRef<Blob[]>([]);
  const previousPlayersRef = useRef<Blob[]>(playersRef.current);
  const playersOnchainRef = useRef<Blob[]>([]);

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

    players.forEach(player => {
      const playerExists = playersRef.current.some(existingPlayer => existingPlayer.authority?.toString() === player.authority?.toString());
      if (!playerExists) {
        playersRef.current.push(player);
      }
    });

    playersRef.current = playersRef.current.filter(existingPlayer =>
      players.some(player => player.authority?.toString() === existingPlayer.authority?.toString())
    );
    
    playersRef.current.forEach(existingPlayer => {
      const updatedPlayer = players.find(player => player.authority?.toString() === existingPlayer.authority?.toString());
      if (updatedPlayer) {
        existingPlayer.radius = updatedPlayer.radius;
        existingPlayer.target_x = updatedPlayer.target_x;
        existingPlayer.target_y = updatedPlayer.target_y;
        existingPlayer.speed = updatedPlayer.speed;
      }
    }); 
  }, [players]);

  useEffect(() => {
    currentPlayerOnchainRef.current = currentPlayer;
    if (currentPlayerRef.current == null) {
      currentPlayerRef.current = currentPlayer;
    }
    if (currentPlayerRef.current && currentPlayer) {
      currentPlayerRef.current.radius = currentPlayer.radius;
      currentPlayerRef.current.speed = currentPlayer.speed;
      currentPlayerRef.current.target_x = currentPlayer.target_x;
      currentPlayerRef.current.target_y = currentPlayer.target_y;
    }
    foodRef.current = visibleFood;
  }, [currentPlayer]);

  const updatePlayerPosition = (player: Blob, target_x: number, target_y: number, boost: boolean) => {
    const player_x = player.x;
    const player_y = player.y;

    const dx = target_x - player_x;
    const dy = target_y - player_y;
    const deg = Math.atan2(dy, dx);

    let effective_mass = 100.0;
    let true_mass = player.mass;
    if (true_mass > 100.0) {
      effective_mass = true_mass;
    }
    let slow_down = 1.0;
    if (player.speed <= 6.25) {
      slow_down = Math.log(effective_mass / 10) / 1.504 - 0.531;
    }

    let scale_up = 3.0;
    if (true_mass < 100.0) {
      scale_up = -0.01 * true_mass + 4.0;
    }
    /*
    if (boost) {
      if (player.mass > 100.0) {
        let boosted_speed = 12.0;
        if (true_mass > 100.0) {
          boosted_speed = -0.00008 * true_mass + 12.0;
        }
        player.speed = boosted_speed;
      }
    }
    */

    const delta_y = (player.speed * scale_up * Math.sin(deg)) / slow_down;
    const delta_x = (player.speed * scale_up * Math.cos(deg)) / slow_down;

    player.y = Math.round(player_y + delta_y);
    player.x = Math.round(player_x + delta_x);

    player.y = Math.max(0, Math.min(player.y, gameSize));
    player.x = Math.max(0, Math.min(player.x, gameSize));

    return player;
  };

  const loop = (time: number) => {
    const dt = time - previousTime.current;
    previousTime.current = time;

    accumulator.current += dt;

    while (accumulator.current >= timeStep) {
      if (currentPlayerRef.current) {
        previousPlayerPos.current = { ...currentPlayerRef.current };
        currentPlayerRef.current = updatePlayerPosition(
          currentPlayerRef.current,
          newTargetRef.current.x,
          newTargetRef.current.y,
          newTargetRef.current.boost,
          //currentPlayerRef.current.target_x,
          //currentPlayerRef.current.target_y,
          //currentPlayerRef.current.speed > 6.25,
        );
      }
      if (playersRef.current) {
        previousPlayersRef.current = playersRef.current.map(player => ({ ...player }));
        playersRef.current = playersRef.current.map(existingPlayer => 
            updatePlayerPosition(
              existingPlayer,
              existingPlayer.target_x,
              existingPlayer.target_y,
              existingPlayer.speed > 6.25,
            )
        );
      }
      if (currentPlayerRef.current && currentPlayerOnchainRef.current) {
        currentPlayerRef.current.x +=
          SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.x - currentPlayerRef.current.x);
        currentPlayerRef.current.y +=
          SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.y - currentPlayerRef.current.y);
      }

      if(playersRef.current) {
        playersRef.current.forEach(existingPlayer => {
          const updatedPlayer = playersOnchainRef.current.find(player => player.authority?.toString() === existingPlayer.authority?.toString());
          if (updatedPlayer) {
            existingPlayer.x += SMOOTHING_FACTOR * (updatedPlayer.x - existingPlayer.x);
            existingPlayer.y += SMOOTHING_FACTOR * (updatedPlayer.y - existingPlayer.y);
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
          canvas.width = screenSize.width;
          canvas.height = screenSize.height;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const interpolatedX = prevPos.x + (currPos.x - prevPos.x) * alpha;
          const interpolatedY = prevPos.y + (currPos.y - prevPos.y) * alpha;

          drawBackground(ctx, { x: interpolatedX, y: interpolatedY }, screenSize);

          playersRef.current.forEach((blob, index) => {

            const prevBlob = previousPlayersRef.current[index] || blob;
            const interpolatedBlobX = prevBlob.x + (blob.x - prevBlob.x) * alpha;
            const interpolatedBlobY = prevBlob.y + (blob.y - prevBlob.y) * alpha;

            const adjustedX =
              interpolatedBlobX - interpolatedX + screenSize.width / 2;
            const adjustedY =
              interpolatedBlobY - interpolatedY + screenSize.height / 2;

            if (currentPlayerRef.current) {
              drawOpponentPlayer(
                ctx,
                { ...blob, x: adjustedX, y: adjustedY },
              );
            }
          });

          foodRef.current.forEach((food) => {
            drawFood(ctx, {
              ...food,
              x: food.x - interpolatedX + screenSize.width / 2,
              y: food.y - interpolatedY + screenSize.height / 2,
            });
          });

          const centeredPlayer = {
            ...currentPlayerRef.current,
            x: screenSize.width / 2,
            y: screenSize.height / 2,
          };

          drawMyPlayer(
            ctx,
            { ...centeredPlayer, x: centeredPlayer.x, y: centeredPlayer.y },
            { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY },
          );
          drawBorder(ctx, { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY }, screenSize, gameSize);
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

  const drawMouth = (ctx: CanvasRenderingContext2D, blob: Blob, isSmiling: boolean = true) => {
    const mouthWidth = blob.radius * 0.5;
    const mouthYOffset = blob.radius * 0.3;
    const mouthHeight = blob.radius * 0.1;

    const startX = blob.x - mouthWidth;
    const startY = blob.y + mouthYOffset;
    const endX = blob.x + mouthWidth;
    const endY = startY;

    const controlY = isSmiling ? startY + mouthHeight : startY - mouthHeight;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(blob.x, controlY, endX, endY);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawOpponentPlayer = (ctx: CanvasRenderingContext2D, blob: Blob) => {

    const dx = blob.target_x - blob.x;
    const dy = blob.target_y - blob.y;
    const angle = Math.atan2(dy, dx);

    const color = getOpponentColor(blob);

    const time = performance.now() / 1000;
    const pulse = 10 + 10 * Math.abs(Math.sin(time * 2));

    ctx.save();

    ctx.shadowBlur = pulse;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    const eyeballRadius = blob.radius * 0.2;
    const pupilRadius = blob.radius * 0.08;
    const eyeSeparation = blob.radius * 0.4;
    const eyeVerticalOffset = blob.radius * 0.2;
    const maxPupilOffset = eyeballRadius - pupilRadius;
    const pupilDx = Math.cos(angle) * maxPupilOffset;
    const pupilDy = Math.sin(angle) * maxPupilOffset;

    const leftEyeX = blob.x - eyeSeparation;
    const leftEyeY = blob.y - eyeVerticalOffset;
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeballRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftEyeX + pupilDx, leftEyeY + pupilDy, pupilRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();

    const rightEyeX = blob.x + eyeSeparation;
    const rightEyeY = blob.y - eyeVerticalOffset;
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeballRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rightEyeX + pupilDx, rightEyeY + pupilDy, pupilRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();

    drawMouth(ctx, blob, false);

    ctx.restore();
  };

  const drawMyPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, currentblob: Blob) => {
    const dx = newTargetRef.current.x - currentblob.x;
    const dy = newTargetRef.current.y - currentblob.y;
    const angle = Math.atan2(dy, dx);

    const color = getOpponentColor(blob);

    const time = performance.now() / 1000;
    const pulse = 10 + 10 * Math.abs(Math.sin(time * 2));

    ctx.save();

    ctx.shadowBlur = pulse;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    const eyeballRadius = blob.radius * 0.2;
    const pupilRadius = blob.radius * 0.08;
    const eyeSeparation = blob.radius * 0.4;
    const eyeVerticalOffset = blob.radius * 0.2;
    const maxPupilOffset = eyeballRadius - pupilRadius;

    const pupilDx = Math.cos(angle) * maxPupilOffset;
    const pupilDy = Math.sin(angle) * maxPupilOffset;

    const leftEyeX = blob.x - eyeSeparation;
    const leftEyeY = blob.y - eyeVerticalOffset;

    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeballRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(leftEyeX + pupilDx, leftEyeY + pupilDy, pupilRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();

    const rightEyeX = blob.x + eyeSeparation;
    const rightEyeY = blob.y - eyeVerticalOffset;

    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeballRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rightEyeX + pupilDx, rightEyeY + pupilDy, pupilRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();

    drawMouth(ctx, blob, true);
  };

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food) => {
    const diameter = 20;
    let color;
    if (food.food_type) {
      color = "#FFD700";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "rgba(255, 215, 0, 1.0)";
    } else {
      const index = Math.max(0, Math.min(FOOD_COLORS.length - 1, food.size - 1));
      color = FOOD_COLORS[index];
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    ctx.beginPath();
    ctx.arc(food.x, food.y, diameter / 2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.stroke();
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
