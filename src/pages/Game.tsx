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
import { averageCircleCoordinates } from "../utils/helper";

type gameProps = {
  gameInfo: ActiveGame;
  myPlayerEntityPda: PublicKey | null;
  sessionWalletInUse: boolean;
};

const Game = ({ gameInfo, myPlayerEntityPda, sessionWalletInUse }: gameProps) => {
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
    countdown.current = 5;
    const myplayerComponent = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: currentPlayerEntity.current,
    });

    try {
      gameSystemExit(engine, gameInfo, currentPlayerEntity.current, entityMatch.current).then(async () => {
        if (currentPlayerEntity.current && currentPlayer) {
          const playerData = await playerFetchOnEphem(engine, myplayerComponent);
          if (playerData) {
            updateMyPlayer(playerData, currentPlayer, setCurrentPlayer, setGameEnded);
          }
        }
      });
    } catch (error) {
      console.log("error", error);
    }

    //const interval = setInterval(() => {
    //  countdown.current = countdown.current - 1;
    //}, 1000);

    let startTime = Date.now();

    const checkRemovalTime = setInterval(() => {
      console.log("checkRemovalTime", playerRemovalTimeRef.current);
      if (playerRemovalTimeRef.current && !playerRemovalTimeRef.current.isZero()) {
        startTime = playerRemovalTimeRef.current.toNumber() * 1000;
        clearInterval(checkRemovalTime);
        const timeoutinterval = setInterval(() => {
          if (playerRemovalTimeRef.current) {
            startTime = playerRemovalTimeRef.current.toNumber() * 1000;
          }
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          //console.log("elapsedTime", elapsedTime);
          countdown.current = Math.max(0, Math.floor(500 - elapsedTime / 10));

          if (elapsedTime > 5000) {
            if (!currentPlayerEntity.current) {
              return;
            }
            if (!entityMatch.current) {
              return;
            }
            console.log("5 seconds have passed");
            try {
              gameSystemExit(engine, gameInfo, currentPlayerEntity.current, entityMatch.current).then((exitTx) => {
                setCashoutTx(exitTx);
              });
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
          } else {
            console.log("Waiting...", elapsedTime);
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
      setCurrentRank(sortedPlayers.findIndex((player) => player.authority?.toString() === currentPlayer.authority?.toString()) + 1);
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
    <div className="gameWrapper w-screen h-screen overflow-hidden">
      <GameLeaderboard gameInfo={gameInfo} leaderboard={leaderboard} currentPlayer={currentPlayer} />
      <div
        className="flex flex-col items-center fixed top-0 -translate-x-1/2 left-[50%] m-2.5 z-[9999] gap-2"
      >        
      {/*
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            onMouseEnter={() => {
              exitHovered.current = true;
            }}
            onMouseLeave={() => {
              exitHovered.current = false;
            }}
            className="soundToggleButton flex items-center justify-center mr-2"
            style={{
              border: "1px solid #fff",
              background: "rgba(255, 255, 255, 0.25)",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
            }}
          >
            {soundEnabled ? (
              <span role="img" aria-label="Sound On">
                🔊
              </span>
            ) : (
              <span role="img" aria-label="Sound Off">
                🔇
              </span>
            )}
          </button>
          */}
        <div
          className="exitgame-panel relative flex items-center justify-center cursor-pointer"
          style={{ width: "290px", height: "85px", borderRadius: "20px",
            display: gameEnded !== 0 ? "none" : "flex",
           }}
          onClick={handleExitClick}
          onMouseEnter={(e) => {
            exitHovered.current = true;
            e.currentTarget.style.boxShadow = "0px 0px 10px 10px #4FCF5A80";
          }}
          onMouseLeave={(e) => {
            exitHovered.current = false;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            className="overlay-panel"
            style={{ position: "absolute", borderRadius: "20px", width: "100%", height: "100%",
              border: "6px solid #4FCF5A", zIndex: "9999" }}
          />
          <div
            className="exitButton relative flex flex-col items-center justify-center gap-1 px-4"
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(180deg, #03AA12 0%, #055F0D 100%)",
              borderRadius: "20px",
              border: "none",
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "16px",
                lineHeight: "20px",
                fontWeight: 500,
                letterSpacing: "0.25px",
                color: "#FFFFFF",
              }}
            >
              Cash out {gameInfo.token}
            </span>

            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "32px",
                lineHeight: "40px",
                fontWeight: 700,
                letterSpacing: "0",
                color: "#FFFFFF",
              }}
            >
              {currentPlayer
                ? (currentPlayer.score / 10 ** gameInfo.decimals).toFixed(2)
                : "--"}{" "}
            </span>
          </div>
        </div>

        <div className="game-popup flex items-center">
          {playerExiting && countdown.current > 0 && (
            <div className="text-[#f07171] font-[Terminus] text-xl text-right ml-2.5">
              Disconnecting in {(countdown.current / 100).toFixed(2)} seconds
            </div>
          )}
          {currentPlayer &&
            (currentPlayer.score * 2500) / gameInfo.buy_in > 240000 && (
              <div className="text-[#ffa500] font-[Terminus] text-xl text-right ml-2.5 font-bold animate-pulse animate-glow">
                Approaching max size!!
              </div>
            )}
        </div>
      </div>
      
      <div style={{ position: "fixed", top: "1rem", right: "1rem", display: "flex",
        alignItems: "center", zIndex: "9999", flexDirection: "column", background: "linear-gradient(to bottom, #ffffff40, #6c6c6c10)",
        borderRadius: "20px", padding: "10px", backdropFilter: "blur(20px)", boxShadow: "0px 1px 24px -1px rgba(0, 0, 0, 0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
      <div className="coin-icon">
          <img src="/slime.png" alt="game token" className="coin-image" />
      </div>
      <div className="coin-pill" style={{ width: "120px", height: "42px", position: "relative" }}>
        <div className="overlay-panel" style={{ borderRadius: "10px", border: "3px solid transparent", position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
        <span style={{ position: "absolute", zIndex: "1", marginLeft: "8px" }}>
          {currentPlayer
                ? ((currentPlayer.score - gameInfo.buy_in) / 10 ** gameInfo.decimals).toFixed(2)
                : "--"}{" "}
        </span>
      </div>
      </div>
      <div style={{ color:"#FFFFFF80", fontSize: "12px", marginTop: "5px" }}>1 mass = {(gameInfo.buy_in / 2500) / 10 ** gameInfo.decimals} {gameInfo.token}</div>
      </div>

      <div className={`fixed bottom-0 left-[50%] -translate-x-1/2 z-[9999] text-white text-base font-[terminus] flex flex-col text-xl`}
      style={{
        opacity: "0.9",
        borderTopLeftRadius: "20px",
        borderTopRightRadius: "20px",
        padding: "10px",
        width: "700px",
        textAlign: "center",
        background: "linear-gradient(to bottom, #ffffff40, #6c6c6c10)",
        backdropFilter: "blur(20px)", boxShadow: "0px 1px 24px -1px rgba(0, 0, 0, 0.1)",
      }}>
        <div>
          <span className="opacity-70">rank: {currentRank} | </span>
          <span className="opacity-70">players: {currentActivePlayers}  | </span>
          { currentPlayer && gameEndedRef.current ?
          (<span className="opacity-70">duration: {currentPlayer && currentPlayer.join && currentPlayer.removal ? ((currentPlayer.removal.toNumber() - currentPlayer.join.toNumber() + 5).toFixed(0)) : "0"} seconds | </span>
          ) : 
          (<span className="opacity-70">duration: {currentPlayer && currentPlayer.join ? ((Date.now() / 1000) - currentPlayer.join.toNumber()).toFixed(0) : "0"} seconds | </span>
          )}
          <span className="opacity-70">mass eaten: {currentPlayer ? (currentPlayer.score - gameInfo.buy_in) / (gameInfo.buy_in / 2500) : "0"}</span>
        </div>
      </div>

      <div
        className="game"
        style={{
          display: "block",
          height: "100%",
          width: "100%",
        }}
      >
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

      <div className={`block w-screen h-screen`}>
        {gameEnded === 1 && (
          <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-[#00000080] z-[9999]">
            <div className="bg-black flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(to bottom, #ffffff40, #6c6c6c10)",
                borderRadius: "20px",
                padding: "20px",
                backdropFilter: "blur(20px)",
                boxShadow: "0px 1px 24px -1px rgba(0, 0, 0, 0.1)",
              }}>
              <p className=" p-0 m-1 text-center text-white text-xl inline">
                <b>Game over.</b> You got eaten!
              </p>
              <button id="returnButton" onClick={() => (window.location.href = "/home")}>
                Return home
              </button>
            </div>
          </div>
        )}

        {gameEnded === 2 && (
          <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-[#00000080] z-[9999]">
            <div className="flex flex-col items-center justify-center select-text"
            style={{
              background: "linear-gradient(to bottom, #ffffff40, #6c6c6c10)",
              borderRadius: "20px",
              padding: "20px",
              backdropFilter: "blur(20px)",
              boxShadow: "0px 1px 24px -1px rgba(0, 0, 0, 0.1)",
            }}>
              <p className=" p-0 m-1 text-center text-white inline">
                <b className="text-[50px]">
                  Payout: {currentPlayer ? currentPlayer.score / 10 ** gameInfo.decimals : ""}
                </b>
              </p>
              <div className="flex items-center justify-center" style={{ flexDirection: "column" }}>
                <pre style={{ margin: "20px 0" }}>
                  <>
                    ✅
                    <a
                      className=" p-0 m-1 text-center text-white text-xl inline"
                      href={`https://explorer.solana.com/tx/${cashoutTx}?cluster=custom&customUrl=${gameInfo.endpoint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "underline" }}
                    >
                      Cashout transaction
                    </a>
                  </>
                </pre>
              </div>
              <button id="returnButton" onClick={() => (window.location.href = "/home")}>
                Return home
              </button>
            </div>
          </div>
        )}

        {gameEnded === 3 && (
          <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-transparent z-[9999]">
            <div className="bg-black flex flex-col items-center justify-center select-text">
              <p className="font-[Terminus] text-red-600 text-center text-sm m-0 p-0">
                Error encountered during payout
              </p>
              <p className="font-[Terminus] text-white text-center text-sm m-0 p-[10px]">
                <>If no transaction is received after a few minutes, contact @cheapnumbers on X</>
                <br />
                <br />
                Txn Receipt:
              </p>
              <button id="returnButton" onClick={() => navigate("/home")}>
                Return home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
