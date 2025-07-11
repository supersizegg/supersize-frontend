import React, { useEffect, useRef } from "react";
import { FOOD_COLORS } from "@utils/constants";
import { getOpponentColor } from "@utils/helper";
import { Blob, Food, Circle } from "@utils/types";

interface GameComponentProps {
  players: Blob[];
  visibleFood: Food[];
  currentPlayer: Blob | null;
  screenSize: { width: number; height: number };
  gameSize: number;
  buyIn: number;
  newTarget: { x: number; y: number; };
}

const SMOOTHING_FACTOR = 0.1;

const GameComponent: React.FC<GameComponentProps> = ({
  players,
  visibleFood,
  currentPlayer,
  screenSize,
  gameSize,
  buyIn,
  newTarget,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenSizeRef = useRef(screenSize);
  const gameSizeRef = useRef(gameSize);
  const foodRef = useRef(visibleFood);
  const newTargetRef = useRef(newTarget);

  const timeStep = 40.0; 

  const previousTime = useRef(0.0);
  const accumulator = useRef(0.0);

  const currentPlayerRef = useRef<Blob | null>(null);
  const previousPlayerPos = useRef(currentPlayerRef.current);
  const currentPlayerOnchainRef = useRef<Blob | null>(null);

  const playersRef = useRef<Blob[]>([]);
  const previousPlayersRef = useRef<Blob[]>(playersRef.current);
  const playersOnchainRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    /*
    console.log("screenSize in game", screenSize);
    const canvas = document.getElementById('gamecanvas');
    if (canvas) {
      canvas.style.width  = `${screenSize.width}px`;
      canvas.style.height = `${screenSize.height}px`;
    }
    */
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
      if (updatedPlayer && updatedPlayer.circles.length > 0) {
        if(existingPlayer.circles.length != updatedPlayer.circles.length) {
          //existingPlayer.circles = updatedPlayer.circles.map(c => ({ ...c }));
          if(existingPlayer.circles.length > updatedPlayer.circles.length) {
            const index = existingPlayer.circles.length - 1;
            const newCircles = existingPlayer.circles.filter((_, idx) => idx !== index).map(c => ({ ...c }));
            existingPlayer.circles = newCircles;
          }
          if(existingPlayer.circles.length < updatedPlayer.circles.length) {
            let newCircles = existingPlayer.circles.map(c => ({ ...c }));
            const diff = updatedPlayer.circles.length - existingPlayer.circles.length;
            const lastItems = updatedPlayer.circles.slice(-diff); 
            newCircles.push(...lastItems);
            existingPlayer.circles = newCircles; 
          }
          
        }

        existingPlayer.circles.forEach((circle, index) => {
          circle.radius = updatedPlayer.circles[index].radius;
          circle.speed = updatedPlayer.circles[index].speed;
        });
        existingPlayer.target_x = updatedPlayer.target_x;
        existingPlayer.target_y = updatedPlayer.target_y;
        existingPlayer.score = updatedPlayer.score;
      }
    }); 
  }, [players]);

  useEffect(() => {
    currentPlayerOnchainRef.current = currentPlayer;
    if (currentPlayerRef.current == null) {
      currentPlayerRef.current = currentPlayer;
    }
    if(currentPlayerRef.current && currentPlayer &&
      currentPlayerRef.current.circles.length != currentPlayer.circles.length) {
      //currentPlayerRef.current.circles = currentPlayer.circles.map(c => ({ ...c }));
      if(currentPlayer.circles.length < currentPlayerRef.current.circles.length) {
        const index = currentPlayerRef.current.circles.length - 1;
        const newCircles = currentPlayerRef.current.circles.filter((_, idx) => idx !== index).map(c => ({ ...c }));
        currentPlayerRef.current.circles = newCircles;
      }
      if(currentPlayer.circles.length > currentPlayerRef.current.circles.length) {
        let newCircles = currentPlayerRef.current.circles.map(c => ({ ...c }));
        const diff = currentPlayer.circles.length - currentPlayerRef.current.circles.length;
        const lastItems = currentPlayer.circles.slice(-diff); 
        newCircles.push(...lastItems);
        currentPlayerRef.current.circles = newCircles; 
      }
    }
    if (currentPlayerRef.current && currentPlayer && currentPlayer.circles.length > 0) {
      currentPlayerRef.current.circles.forEach((circle, index) => {
        circle.radius = currentPlayer.circles[index].radius;
        circle.speed = currentPlayer.circles[index].speed;
      });
      currentPlayerRef.current.target_x = currentPlayer.target_x;
      currentPlayerRef.current.target_y = currentPlayer.target_y;
      currentPlayerRef.current.score = currentPlayer.score;
    }
    foodRef.current = visibleFood;
  }, [currentPlayer]);

  const updatePlayerPositionImmutable = (
    player: Blob,
    target_x: number,
    target_y: number,
    gameSize: number
  ): Blob => {
    // build a new circles array
    const newCircles = player.circles.map(circle => {
      // copy fields first
      const { x: player_x, y: player_y, speed, size } = circle;
      const player_speed = speed * 0.1;
      const dx = target_x - player_x;
      const dy = target_y - player_y;
      const deg = Math.atan2(dy, dx);
  
      // compute slow_down safely
      let slow_down = 1.0;
      if (player_speed <= 6.3) {
        const ratio = size / 10;
        if (ratio > 0) {
          const val = Math.log(ratio) / 1.504 - 0.531;
          slow_down = Math.max(val, 0.1); // clamp to avoid zero/negative
        }
      }
      let delta_x = (player_speed * Math.cos(deg)) / slow_down;
      let delta_y = (player_speed * Math.sin(deg)) / slow_down;
  
      let newX = player_x + delta_x;
      let newY = player_y + delta_y;
      // round if you need integer positions
      newX = Math.round(newX);
      newY = Math.round(newY);
      // clamp to bounds
      newX = Math.max(0, Math.min(newX, gameSize));
      newY = Math.max(0, Math.min(newY, gameSize));
  
      return {
        ...circle,
        x: newX,
        y: newY,
      };
    });
  
    // compute new center
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
    const dt = time - previousTime.current;
    previousTime.current = time;

    accumulator.current += dt;

    while (accumulator.current >= timeStep) {
      if (currentPlayerRef.current) {
       // previousPlayerPos.current = { ...currentPlayerRef.current };
        previousPlayerPos.current = {
          ...currentPlayerRef.current,
          circles: currentPlayerRef.current.circles.map(c => ({ ...c })),
        };
        currentPlayerRef.current = updatePlayerPositionImmutable(
          currentPlayerRef.current,
          newTargetRef.current.x,
          newTargetRef.current.y,
          gameSizeRef.current
          //currentPlayerRef.current.target_x,
          //currentPlayerRef.current.target_y,
          //currentPlayerRef.current.speed > 6.25,
        );
      }

      if (playersRef.current) {
        //previousPlayersRef.current = playersRef.current.map(player => ({ ...player }));
        previousPlayersRef.current = playersRef.current.map(player => ({
          ...player,
          circles: player.circles.map(circle => ({ ...circle }))
        }));
        playersRef.current = playersRef.current.map(existingPlayer => 
            updatePlayerPositionImmutable(
              existingPlayer,
              existingPlayer.target_x,
              existingPlayer.target_y,
              gameSizeRef.current
            )
        );
      }
      
      if (currentPlayerRef.current && currentPlayerOnchainRef.current) {
        currentPlayerRef.current.x +=
          SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.x - currentPlayerRef.current.x);
        currentPlayerRef.current.y +=
          SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.y - currentPlayerRef.current.y);

        currentPlayerRef.current.circles.forEach((circle, index) => {
          if(currentPlayerOnchainRef.current && currentPlayerOnchainRef.current.circles[index]) {
            circle.x += SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.circles[index].x - circle.x);
            circle.y += SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.circles[index].y - circle.y);
          }
        });
      }
        

      if(playersRef.current) {
        playersRef.current.forEach(existingPlayer => {
          const updatedPlayer = playersOnchainRef.current.find(player => player.authority?.toString() === existingPlayer.authority?.toString());
          if (updatedPlayer) {
            existingPlayer.x += SMOOTHING_FACTOR * (updatedPlayer.x - existingPlayer.x);
            existingPlayer.y += SMOOTHING_FACTOR * (updatedPlayer.y - existingPlayer.y);

            existingPlayer.circles.forEach((circle, index) => {
              if(updatedPlayer && updatedPlayer.circles[index]) {
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
          //console.log(canvas.width, canvas.height, screenSizeRef.current.width, screenSizeRef.current.height)
          canvas.width = screenSizeRef.current.width;
          canvas.height = screenSizeRef.current.height;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const interpolatedX = prevPos.x + (currPos.x - prevPos.x) * alpha;
          const interpolatedY = prevPos.y + (currPos.y - prevPos.y) * alpha;
          
          
          if (currPos.circles.length != prevPos.circles.length) {
            if(currPos.circles.length < prevPos.circles.length) {
              const index = prevPos.circles.length - 1;
              const newMyCircles = prevPos.circles.filter((_, idx) => idx !== index).map(c => ({ ...c }));
              prevPos.circles = newMyCircles;
            }
            if(currPos.circles.length > prevPos.circles.length) {
              let newCircles = prevPos.circles.map(c => ({ ...c }));
              const diff = currPos.circles.length - prevPos.circles.length;
              const lastItems = currPos.circles.slice(-diff); 
              newCircles.push(...lastItems);
              prevPos.circles = newCircles; 
            }
          } 
          //let interpolatedCircles : Circle[] = currPos.circles;       
          //if(prevPos.circles.length == currPos.circles.length) {
          let interpolatedCircles = prevPos.circles.map((circle, index) => {
              return {
                ...circle,
                x: circle.x + (currPos.circles[index].x - circle.x) * alpha,
                y: circle.y + (currPos.circles[index].y - circle.y) * alpha,
              };
            });
          //}
          drawBackground(ctx, { x: interpolatedX, y: interpolatedY }, screenSizeRef.current);
          
          playersRef.current.forEach((blob, index) => {

            const prevBlob = previousPlayersRef.current[index] || blob;
            const interpolatedBlobX = prevBlob.x + (blob.x - prevBlob.x) * alpha;
            const interpolatedBlobY = prevBlob.y + (blob.y - prevBlob.y) * alpha;
            
            if (prevBlob.circles.length != blob.circles.length) {
              if(prevBlob.circles.length > blob.circles.length) {
                const index = prevBlob.circles.length - 1;
                const newCircles = prevBlob.circles.filter((_, idx) => idx !== index).map(c => ({ ...c }));
                prevBlob.circles = newCircles;
              }
              if(prevBlob.circles.length < blob.circles.length) {
                let newCircles = prevBlob.circles.map(c => ({ ...c }));
                const diff = blob.circles.length - prevBlob.circles.length;
                const lastItems = blob.circles.slice(-diff); 
                newCircles.push(...lastItems);
                prevBlob.circles = newCircles; 
              }
            }
            
            //let interpolatedBlobCircles : Circle[] = blob.circles;
            //if(prevBlob.circles.length == blob.circles.length) {
            let interpolatedBlobCircles = prevBlob.circles.map((circle, index) => {
                return {
                  ...circle,
                  x: circle.x + (blob.circles[index].x - circle.x) * alpha,
                  y: circle.y + (blob.circles[index].y - circle.y) * alpha,
                };
              });
            //}
  
            const adjustedX =
              interpolatedBlobX - interpolatedX + screenSizeRef.current.width / 2;
            const adjustedY =
              interpolatedBlobY - interpolatedY + screenSizeRef.current.height / 2;
            const adjustedCircles = interpolatedBlobCircles.map((circle, index) => {
              return {
                ...circle,
                x: circle.x - interpolatedX + screenSizeRef.current.width / 2,
                y: circle.y - interpolatedY + screenSizeRef.current.height / 2,
              };
            });
            
            if (currentPlayerRef.current) {
              drawOpponentPlayer(
                ctx,
                { ...blob, x: adjustedX, y: adjustedY, circles: adjustedCircles },
                currentPlayerRef.current.score
              );
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
            screenSizeRef.current
          );
          drawBorder(ctx, { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY }, screenSizeRef.current, gameSizeRef.current);
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

  const drawMouth = (ctx: CanvasRenderingContext2D, circle_x: number, circle_y: number, circle_radius: number, isSmiling: boolean = true) => {
    const mouthWidth = circle_radius * 0.5;
    const mouthYOffset = circle_radius * 0.3;
    const mouthHeight = circle_radius * 0.1;

    const startX = circle_x - mouthWidth;
    const startY = circle_y + mouthYOffset;
    const endX = circle_x + mouthWidth;
    const endY = startY;

    const controlY = isSmiling ? startY + mouthHeight : startY - mouthHeight;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(circle_x, controlY, endX, endY);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawOpponentPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, myPlayerScore: number) => {
    for (const circle of blob.circles) {
      const circle_x = circle.x;
      const circle_y = circle.y;

      const color = getOpponentColor(blob.authority, blob.name);

      const time = performance.now() / 1000;
      const pulse = 10 + 10 * Math.abs(Math.sin(time * 2));

      ctx.save();

      ctx.shadowBlur = pulse;
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.arc(circle_x, circle_y, circle.radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Render the blob's name and dollar signs 10px above the player circle
      ctx.fillStyle = color;
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${blob.name}`, circle_x, circle_y - circle.radius - 20);
    }

    ctx.restore();
  };

  const drawMyPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, currentblob: Blob, buyIn: number, screenSize: { width: number; height: number }) => {
    for (const circle of currentblob.circles) {
      const circle_x = circle.x - currentblob.x + screenSize.width / 2;
      const circle_y = circle.y - currentblob.y + screenSize.height / 2;

      const color = getOpponentColor(blob.authority, blob.name);

      const time = performance.now() / 1000;
      const pulse = 10 + 10 * Math.abs(Math.sin(time * 2));

      ctx.save();

      ctx.shadowBlur = pulse;
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.arc(circle_x, circle_y, circle.radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Render the blob's name and dollar signs 10px above the player circle
      ctx.fillStyle = color;
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${blob.name}`, circle_x, circle_y - circle.radius - 20);
    }
  };

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food) => {
    let diameter = 20;
    let color;
    if (food.food_value >= 10.0) {
      color = "#FFD700";
      ctx.shadowBlur = 30;
      ctx.shadowColor = "rgba(255, 215, 0, 1.0)";
      diameter = 3 * food.food_value;
    } else {
      const index = Math.max(0, Math.min(FOOD_COLORS.length - 1, food.food_value - 1));
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
