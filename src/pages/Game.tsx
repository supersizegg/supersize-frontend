import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import GameComponent from "@components/Game/Game";
import GameLeaderboard from "@components/Game/GameLeaderboard";
import { endpoints, MAP_COMPONENT } from "@utils/constants";
import { ActiveGame, Blob, Food } from "@utils/types";
import { createUndelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { COMPONENT_PLAYER_ID } from "../states/gamePrograms";
import { gameSystemExit } from "../states/gameSystemExit";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import { mapFetchOnEphem, playerFetchOnEphem } from "../states/gameFetch";
import { subscribeToGame, updateLeaderboard, updateMyPlayer } from "../states/gameListen";
import { gameSystemMove } from "../states/gameSystemMove";
import { gameSystemSpawnFood } from "../states/gameSystemSpawnFood";
import { decodeFood, stringToUint8Array, calculateWindowSize } from "@utils/helper";
import { useSoundManager } from "../hooks/useSoundManager";
import "./Landing.scss";
import "./game.scss";
import { averageCircleCoordinates, formatBuyIn } from "../utils/helper";
import SignUpBanner from "../components/util/SignUpBanner";

type gameProps = {
  gameInfo: ActiveGame;
  myPlayerEntityPda: PublicKey | null;
  sessionWalletInUse: boolean;
  preferredRegion: string;
};

const Game = ({ gameInfo, myPlayerEntityPda, sessionWalletInUse, preferredRegion }: gameProps) => {
  const navigate = useNavigate();
  const { engine } = useMagicBlockEngine();

  const animationFrame = useRef(0);

  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const exitHovered = useRef(false);

  const [target, setTarget] = useState({ x: 0, y: 0, boost: false });

  const [currentPlayer, setCurrentPlayer] = useState<Blob | null>(null);

  const entityMatch = useRef<PublicKey | null>(null);
  const currentPlayerEntity = useRef<PublicKey | null>(null);
  const anteroomEntity = useRef<PublicKey | null>(null);
  const foodEntities = useRef<PublicKey[]>([]);
  const playerEntities = useRef<PublicKey[]>([]);

  const countdown = useRef(5);
  const playerRemovalTimeRef = useRef<BN | null>(null);
  const [playerExiting, setPlayerExiting] = useState(false);
  const [gameEnded, setGameEnded] = useState(0);
  const [currentGameSize, setCurrentGameSize] = useState(gameInfo.size);
  const [cashoutTx, setCashoutTx] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);

  const [leaderboard, setLeaderboard] = useState<Blob[]>([]);
  const [allplayers, setAllPlayers] = useState<Blob[]>([]);
  const [allFood, setAllFood] = useState<Food[][]>([]);
  const [visibleFood, setVisibleFood] = useState<Food[][]>([]);
  const [foodListLen, setFoodListLen] = useState<number[]>([]);
  const [currentActivePlayers, setCurrentActivePlayers] = useState(gameInfo.active_players);
  const [currentRank, setCurrentRank] = useState(0);

  const playersComponentSubscriptionId = useRef<number[] | null>([]);
  const foodComponentSubscriptionId = useRef<number[] | null>([]);
  const myplayerComponentSubscriptionId = useRef<number | null>(null);
  const mapComponentSubscriptionId = useRef<number | null>(null);

  const currentPlayerRef = useRef<Blob | null>(null);
  const currentMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const currentIsSpaceDownRef = useRef<boolean>(false);
  const allplayersRef = useRef<Blob[]>([]);
  const playersRef = useRef<Blob[]>([]);
  const currentGameSizeRef = useRef(gameInfo.size);
  const gameEndedRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playBoostSound } = useSoundManager(soundEnabled);

  useEffect(() => {
    allplayersRef.current = allplayers;
  }, [allplayers]);

  useEffect(() => {
    if (currentPlayer?.removal) {
      playerRemovalTimeRef.current = currentPlayer.removal;
    }
    currentPlayerRef.current = currentPlayer;
    if (currentPlayer?.circles[0].radius) {
      let scoreSum = 0;
      for (let i = 0; i < currentPlayer.circles.length; i++) {
        scoreSum += currentPlayer.circles[i].size;
      }
      const windowSize = calculateWindowSize(scoreSum, window.innerWidth, window.innerHeight);
      setScreenSize(windowSize);
    }
    //console.log("screenSize", screenSize);
  }, [currentPlayer]);

  useEffect(() => {
    currentGameSizeRef.current = currentGameSize;
  }, [currentGameSize]);

  const checkSuccessfulExit = async (myplayerComponent: PublicKey) => {
    const playerData = await playerFetchOnEphem(engine, myplayerComponent);
    if (playerData && playerData.circles.length == 0 && playerData.name == "exited") {
      return true;
    }
    return false;
  };

  const handleExitClick = async () => {
    if (!currentPlayerEntity.current) {
      return;
    }
    if (!entityMatch.current) {
      return;
    }

    setPlayerExiting(true);
    countdown.current = 500;
    const myplayerComponent = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: currentPlayerEntity.current,
    });

    try {
      gameSystemExit(preferredRegion, engine, gameInfo, currentPlayerEntity.current, entityMatch.current).then(
        async () => {
          if (currentPlayerEntity.current && currentPlayer) {
            const playerData = await playerFetchOnEphem(engine, myplayerComponent);
            if (playerData) {
              updateMyPlayer(playerData, currentPlayer, setCurrentPlayer, setGameEnded);
            }
          }
        },
      );
    } catch (error) {
      console.log("error", error);
    }

    let startTime = Date.now();

    const checkRemovalTime = setInterval(() => {
      if (playerRemovalTimeRef.current && !playerRemovalTimeRef.current.isZero()) {
        startTime = playerRemovalTimeRef.current.toNumber() * 1000;
        clearInterval(checkRemovalTime);
        const timeoutinterval = setInterval(() => {
          if (playerRemovalTimeRef.current) {
            startTime = playerRemovalTimeRef.current.toNumber() * 1000;
          }
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          //console.log("elapsedTime", elapsedTime, countdown.current);
          countdown.current = Math.max(0, Math.floor(500 - elapsedTime / 10));

          if (elapsedTime > 5000) {
            if (!currentPlayerEntity.current) {
              return;
            }
            if (!entityMatch.current) {
              return;
            }
            try {
              gameSystemExit(preferredRegion, engine, gameInfo, currentPlayerEntity.current, entityMatch.current).then(
                (exitTx) => {
                  setCashoutTx(exitTx);
                },
              );
            } catch (error) {
              console.log("error", error);
            }
            checkSuccessfulExit(myplayerComponent).then((success) => {
              if (success) {
                clearInterval(timeoutinterval);
                setPlayerExiting(false);
              }
            });
            //clearInterval(interval);
          }
        }, 100);
      }
    }, 100);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !playerExiting) {
        handleExitClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExitClick]);

  const processNewFoodTransaction = async () => {
    if (!entityMatch.current) return;
    try {
      const mapComponent = FindComponentPda({
        componentId: MAP_COMPONENT,
        entity: entityMatch.current,
      });

      let newFood = { x: 0, y: 0, food_value: 0 };
      const mapParsedData = await mapFetchOnEphem(engine, mapComponent);
      //console.log("mapParsedData", mapParsedData);
      if (mapParsedData && mapParsedData.nextFood.length > 0) {
        //const foodDataArray = new Uint8Array(mapParsedData.nextFood[0].foodData);
        //const decodedFood = decodeFood(foodDataArray);
        //console.log("decodedFood", mapParsedData.nextFood[0]);
        newFood = {
          x: mapParsedData.nextFood[0].x,
          y: mapParsedData.nextFood[0].y,
          food_value: mapParsedData.nextFood[0].foodValue,
        };
      }

      await gameSystemSpawnFood(
        engine,
        gameInfo,
        newFood.x,
        newFood.y,
        //newFood.food_type,
        foodListLen,
        entityMatch.current,
        foodEntities.current,
      );
    } catch (error) {
      //console.log("Transaction failed", error);
    }
  };

  useEffect(() => {
    console.log("subscribeToGame");
    const mapEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });

    const anteEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("ante"),
    });
    const foodEntityPdas: PublicKey[] = [];
    let maxplayer = 10;
    let foodcomponents = 100;

    if (gameInfo.size == 4000) {
      maxplayer = 10;
      foodcomponents = 16 * 2;
    } else if (gameInfo.size == 10000) {
      maxplayer = 100;
      foodcomponents = 100;
    }

    for (let i = 1; i < foodcomponents + 1; i++) {
      const foodseed = "food" + i.toString();
      const foodEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(foodseed),
      });
      foodEntityPdas.push(foodEntityPda);
    }

    const playerEntityPdas: PublicKey[] = [];
    for (let i = 1; i < maxplayer + 1; i++) {
      const playerentityseed = "player" + i.toString();
      const playerEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(playerentityseed),
      });
      playerEntityPdas.push(playerEntityPda);
    }

    entityMatch.current = mapEntityPda;
    currentPlayerEntity.current = myPlayerEntityPda;
    anteroomEntity.current = anteEntityPda;
    foodEntities.current = foodEntityPdas;
    playerEntities.current = playerEntityPdas;
    const emptyPlayer: Blob = {
      name: "unnamed",
      authority: null,
      score: 0,
      removal: new BN(0),
      join: new BN(0),
      x: 0,
      y: 0,
      target_x: 0,
      target_y: 0,
      circles: [],
      timestamp: 0,
    };
    setAllPlayers(new Array(playerEntityPdas.length).fill(emptyPlayer));
    setAllFood(new Array(foodEntityPdas.length).fill([]));
    setFoodListLen(new Array(foodEntityPdas.length).fill(0));
    if (!entityMatch.current || !currentPlayerEntity.current) return;
    const mapComponent = FindComponentPda({
      componentId: MAP_COMPONENT,
      entity: entityMatch.current,
    });
    const mapData = mapFetchOnEphem(engine, mapComponent).then((mapData) => {
      if (mapData) {
        setCurrentGameSize(mapData.size);
        if (mapData.name.startsWith("f-")) {
          setIsFree(true);
        }
      }
    });

    subscribeToGame(
      engine,
      foodEntities.current,
      playerEntities.current,
      entityMatch.current,
      currentPlayerEntity.current,
      emptyPlayer,
      foodComponentSubscriptionId,
      playersComponentSubscriptionId,
      myplayerComponentSubscriptionId,
      mapComponentSubscriptionId,
      setAllPlayers,
      setCurrentPlayer,
      setGameEnded,
      setAllFood,
      setFoodListLen,
      setCurrentGameSize,
      setCurrentActivePlayers,
    );
  }, [gameInfo]);

  const endGame = async () => {
    if (currentPlayer && currentPlayer.circles.length == 0 && currentPlayerEntity.current && anteroomEntity.current) {
      playersComponentSubscriptionId.current = [];
      foodComponentSubscriptionId.current = [];
      myplayerComponentSubscriptionId.current = null;
      mapComponentSubscriptionId.current = null;
      currentPlayerRef.current = null;
      entityMatch.current = null;
      foodEntities.current = [];
      playersRef.current = [];
      setAllFood([]);
      setFoodListLen([]);
    }
  };

  useEffect(() => {
    if (gameEnded != 0) {
      gameEndedRef.current = true;
    }
    endGame();
  }, [gameEnded]);

  useEffect(() => {
    if (currentPlayer && allFood) {
      const visibleFood = allFood.map((foodList) => {
        return foodList.reduce<Food[]>((innerAcc, foodItem) => {
          const diffX = foodItem.x - currentPlayer.x;
          const diffY = foodItem.y - currentPlayer.y;
          if (Math.abs(diffX) <= screenSize.width / 2 + 100 && Math.abs(diffY) <= screenSize.height / 2 + 100) {
            innerAcc.push({
              x: foodItem.x,
              y: foodItem.y,
              food_value: foodItem.food_value,
            });
          }
          return innerAcc;
        }, []);
      });
      setVisibleFood(visibleFood);
    }
  }, [currentPlayer, allFood]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const handleSpaceDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      currentIsSpaceDownRef.current = false;
      if (!gameEnded && soundEnabled) {
        playBoostSound();
      }
    };

    const handleSpaceUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      currentIsSpaceDownRef.current = true;
    };

    const handleResize = () => {
      const gameDiv = document.querySelector(".game");
      if (gameDiv) {
        const { width, height } = gameDiv.getBoundingClientRect();
        setScreenSize({ width: width, height: height });
      } else {
        setScreenSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };

    console.log("Set mouse listeners");
    window.addEventListener("keydown", handleSpaceDown);
    window.addEventListener("keyup", handleSpaceUp);
    window.addEventListener("mousemove", handleMouseMove);
    //window.addEventListener("resize", handleResize);

    return () => {
      console.log("Remove mouse listeners");
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrame.current);
      window.removeEventListener("keydown", handleSpaceDown);
      window.removeEventListener("keyup", handleSpaceUp);
      //window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const smoothUpdate = () => {
      const dx = (lastMousePosition.current.x - currentMousePositionRef.current.x) * 0.03;
      const dy = (lastMousePosition.current.y - currentMousePositionRef.current.y) * 0.03;

      const newMousePosition = {
        x: currentMousePositionRef.current.x + dx,
        y: currentMousePositionRef.current.y + dy,
      };

      currentMousePositionRef.current = newMousePosition;

      animationFrame.current = requestAnimationFrame(smoothUpdate);
    };

    animationFrame.current = requestAnimationFrame(smoothUpdate);

    return () => cancelAnimationFrame(animationFrame.current);
  }, []);

  useEffect(() => {
    if (currentPlayer && !gameEndedRef.current) {
      const playersWithAuthority = allplayersRef.current.filter(
        (player) => player.authority !== null && player.circles.length > 0,
      );
      const sortedPlayers = playersWithAuthority.sort((a, b) => b.score - a.score);
      setCurrentRank(
        sortedPlayers.findIndex((player) => player.authority?.toString() === currentPlayer.authority?.toString()) + 1,
      );
      updateLeaderboard(playersWithAuthority, setLeaderboard);
      const newVisiblePlayers: Blob[] = playersWithAuthority.reduce((accumulator: Blob[], playerx) => {
        if (currentPlayer && playerx.authority && currentPlayer.authority) {
          if (currentPlayer.authority.toString() != playerx.authority.toString()) {
            const halfWidth = screenSize.width / 2 + 100;
            const halfHeight = screenSize.height / 2 + 100;
            const diffX = playerx.x - currentPlayer.x;
            const diffY = playerx.y - currentPlayer.y;
            if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
              accumulator.push({
                name: playerx.name,
                authority: playerx.authority,
                score: playerx.score,
                join: playerx.join,
                removal: playerx.removal,
                x: playerx.x,
                y: playerx.y,
                target_x: playerx.target_x,
                target_y: playerx.target_y,
                circles: playerx.circles,
                timestamp: performance.now(),
              });
            }
          }
        }
        return accumulator;
      }, []);
      playersRef.current = newVisiblePlayers;
    }
  }, [currentPlayer]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!gameEndedRef.current) {
        processNewFoodTransaction();
      }
    }, 50);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (
        currentPlayerEntity.current &&
        currentPlayerRef.current &&
        entityMatch.current &&
        foodEntities.current &&
        playerEntities.current &&
        allplayersRef.current &&
        foodListLen &&
        !gameEndedRef.current
      ) {
        gameSystemMove(
          engine,
          gameInfo,
          currentPlayerEntity.current,
          currentPlayerRef.current,
          entityMatch.current,
          foodEntities.current,
          playerEntities.current,
          allplayersRef.current,
          playersRef.current,
          foodListLen,
          currentMousePositionRef.current.x,
          currentMousePositionRef.current.y,
          currentIsSpaceDownRef.current,
          { width: currentGameSizeRef.current, height: currentGameSizeRef.current },
          screenSize,
        );
        const newX = Math.max(
          0,
          Math.min(
            currentGameSizeRef.current,
            Math.floor(currentPlayerRef.current.x + currentMousePositionRef.current.x - screenSize.width / 2),
          ),
        );
        const newY = Math.max(
          0,
          Math.min(
            currentGameSizeRef.current,
            Math.floor(currentPlayerRef.current.y + currentMousePositionRef.current.y - screenSize.height / 2),
          ),
        );
        currentIsSpaceDownRef.current = false;
        setTarget({ x: newX, y: newY, boost: currentIsSpaceDownRef.current });
      }
    }, 30); //testing 30-50

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="game-screen">
      <GameLeaderboard gameInfo={gameInfo} leaderboard={leaderboard} currentPlayer={currentPlayer} />

      <div className="game-hud top-center">
        {gameEnded === 0 && (
          <div
            className="cash-out-panel"
            onClick={handleExitClick}
            onMouseEnter={() => {
              exitHovered.current = true;
            }}
            onMouseLeave={() => {
              exitHovered.current = false;
            }}
          >
            <div className="cash-out-border" />
            <div className="cash-out-content">
              <span className="cash-out-label">Cash out {gameInfo.token}</span>
              <span className="cash-out-value">
                {currentPlayer
                  ? formatBuyIn(Math.round((currentPlayer.score / 10 ** gameInfo.decimals) * 100) / 100)
                  : "--"}
              </span>
            </div>
          </div>
        )}
        <div className="game-alerts">
          {playerExiting && countdown.current > 0 && (
            <div className="alert-text is-disconnecting">
              Disconnecting in {(countdown.current / 100).toFixed(2)} seconds
            </div>
          )}
          {currentPlayer && (currentPlayer.score * 2500) / gameInfo.buy_in > 240000 && (
            <div className="alert-text is-warning">Approaching max size!</div>
          )}
        </div>
      </div>

      <div className="game-hud top-right">
        <div className="profit-tracker">
          <div className="profit-pill">
            <div className="coin-icon">
              <img src="/slime.png" alt="game token" />
            </div>
            <span className="profit-value">
              {currentPlayer
                ? formatBuyIn(
                    Math.round(
                      ((currentPlayer.score - (isFree ? 0 : gameInfo.buy_in)) / 10 ** gameInfo.decimals) * 1000,
                    ) / 1000,
                  )
                : "--"}
            </span>
          </div>
          <div className="mass-to-token-ratio">
            1 mass = {gameInfo.buy_in / 2500 / 10 ** gameInfo.decimals} {gameInfo.token}
          </div>
        </div>
      </div>

      <div className="game-hud bottom-center">
        <div className="game-stats">
          <span>Rank: {currentRank}</span>
          <span>Players: {currentActivePlayers}</span>
          {gameEndedRef.current ? (
            <span>
              Duration:{" "}
              {currentPlayer?.join && currentPlayer.removal
                ? (currentPlayer.removal.toNumber() - currentPlayer.join.toNumber() + 5).toFixed(0)
                : "0"}
              s
            </span>
          ) : (
            <span>
              Duration: {currentPlayer?.join ? (Date.now() / 1000 - currentPlayer.join.toNumber()).toFixed(0) : "0"}s
            </span>
          )}
          <span>
            Mass Eaten:{" "}
            {currentPlayer
              ? ((currentPlayer.score - (isFree ? 0 : gameInfo.buy_in)) / (gameInfo.buy_in / 2500)).toFixed(0)
              : "0"}
          </span>
        </div>
      </div>

      <div className="game-canvas-container">
        <GameComponent
          players={playersRef.current}
          visibleFood={visibleFood.flat()}
          currentPlayer={currentPlayer}
          screenSize={screenSize}
          newTarget={target}
          gameSize={currentGameSizeRef.current}
          buyIn={gameInfo.buy_in}
          gameEnded={gameEnded}
        />
      </div>

      {gameEnded !== 0 && (
        <div className="game-over-backdrop">
          {gameEnded === 1 && (
            <div className="game-over-panel is-loss">
              <h2 className="panel-title">Game Over</h2>
              <p className="panel-subtitle">You got eaten!</p>
              <button className="btn-return-home" onClick={() => (window.location.href = "/home")}>
                Return Home
              </button>
            </div>
          )}

          {gameEnded === 2 && (
            <div className="game-over-panel is-win">
              <span className="panel-label">Payout</span>
              <h2 className="panel-title payout-amount">
                {currentPlayer
                  ? formatBuyIn(Math.round((currentPlayer.score / 10 ** gameInfo.decimals) * 1000) / 1000)
                  : ""}
              </h2>
              <button className="btn-return-home" onClick={() => (window.location.href = "/home")}>
                Return Home
              </button>
            </div>
          )}

          {gameEnded === 3 && (
            <div className="game-over-panel is-error">
              <h2 className="panel-title">Error</h2>
              <p className="panel-subtitle">Error encountered during payout.</p>
              <p className="panel-info">If no transaction is received after a few minutes, contact support.</p>
              <button className="btn-return-home" onClick={() => navigate("/home")}>
                Return Home
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Game;
