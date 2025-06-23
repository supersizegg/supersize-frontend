import { AccountInfo, PublicKey } from "@solana/web3.js";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { decodeFood, averageCircleCoordinates } from "@utils/helper";
import { Food, Blob } from "@utils/types";
import {
  COMPONENT_PLAYER_ID,
  COMPONENT_SECTION_ID,
  COMPONENT_MAP_ID, 
  getComponentPlayerOnEphem,
  getComponentSectionOnEphem,
  getComponentMapOnEphem,
} from "./gamePrograms";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";

export function updateFoodList(
  section: { food: [] },
  food_index: number,
  setAllFood: (callback: (prevAllFood: any[][]) => any[][]) => void,
  setFoodListLen: (callback: (prevFoodListLen: number[]) => number[]) => void,
) {
  const foodArray = section.food;
  const foodDataList: Food[] = [];
  foodArray.forEach((foodItem: { foodData: Uint8Array }) => {
    const foodDataArray = new Uint8Array(foodItem.foodData);
    const decodedFood = decodeFood(foodDataArray);
    foodDataList.push({
      x: decodedFood.x,
      y: decodedFood.y,
      food_value: decodedFood.food_value,
    });
  });
  if (foodDataList.length > 0) {
    setAllFood((prevAllFood) => {
      return prevAllFood.map((foodArray, index) => (food_index === index ? foodDataList : foodArray));
    });
    setFoodListLen((prevFoodListLen) => {
      const updatedFoodListLen = [...prevFoodListLen];
      updatedFoodListLen[food_index] = foodDataList.length;
      return updatedFoodListLen;
    });
  }
}

export function updateLeaderboard(
  players: any[],
  setLeaderboard: (leaderboard: any[]) => void,
) {
  const top10Players = players
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((player) => ({
      name: player.name,
      authority: player.authority,
      score: player.score,
      removal: player.removalTime,
      target_x: player.target_x,
      target_y: player.target_y,
      timestamp: performance.now(),
    }));
  setLeaderboard(top10Players);
}

export function updateMyPlayer(
  player: any,
  currentPlayer: Blob,
  setCurrentPlayer: (player: Blob) => void,
  setGameEnded: (gameEnded: number) => void,
) {
  //console.log('player', player)
  if(player.name != "exited") {
    if (player.circles.length == 0 && player.score == 0) {
      const startTime = player.joinTime.toNumber() * 1000;
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      if (elapsedTime >= 6000) {
        setGameEnded(1);
      }
    }
    const result = averageCircleCoordinates(player.circles);
    setCurrentPlayer({
      name: player.name,
      authority: player.authority,
      score: player.score,
      removal: player.removalTime,
      x: result.avgX,
      y: result.avgY,
      target_x: player.targetX,
      target_y: player.targetY,
      circles: player.circles,
      timestamp: performance.now(),
    } as Blob);
  }else{
    setGameEnded(2);
  }
}

export function updatePlayers(
  player: any,
  player_index: number,
  setAllPlayers: (callback: (prevAllPlayers: Blob[]) => Blob[]) => void,
) {
  if (player) {
    setAllPlayers((prevPlayers: Blob[]) => {
      const result = averageCircleCoordinates(player.circles);
      const newPlayer: Blob = {
        name: player.name,
        authority: player.authority,
        score: player.score,
        removal: player.removalTime,
        x: result.avgX,
        y: result.avgY,
        target_x: player.targetX,
        target_y: player.targetY,
        circles: player.circles,
        timestamp: performance.now(),
      };
      const updatedPlayers = [...prevPlayers];
      updatedPlayers[player_index] = newPlayer;
      return updatedPlayers as Blob[];
    });
  }
}

export function handlePlayersComponentChange(
  accountInfo: AccountInfo<Buffer>,
  index: number,
  engine: MagicBlockEngine,
  setAllPlayers: (callback: (prevAllPlayers: Blob[]) => Blob[]) => void,
) {
  const coder = getComponentPlayerOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("player", accountInfo.data);
  updatePlayers(parsedData, index, setAllPlayers);
}

export function handleFoodComponentChange(
  accountInfo: AccountInfo<Buffer>,
  index: number,
  engine: MagicBlockEngine,
  setAllFood: (callback: (prevAllFood: any[][]) => any[][]) => void,
  setFoodListLen: (callback: (prevFoodListLen: number[]) => number[]) => void,
) {
  const coder = getComponentSectionOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("section", accountInfo.data);
  updateFoodList(parsedData, index, setAllFood, setFoodListLen);
}

export function handleMyPlayerComponentChange(
  accountInfo: AccountInfo<Buffer>,
  engine: MagicBlockEngine,
  currentPlayer: Blob,
  setCurrentPlayer: (player: Blob) => void,
  setGameEnded: (gameEnded: number) => void,
) {
  const coder = getComponentPlayerOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("player", accountInfo.data);
  updateMyPlayer(parsedData, currentPlayer, setCurrentPlayer, setGameEnded);
}

export function handleMapComponentChange(
  accountInfo: AccountInfo<Buffer>,
  engine: MagicBlockEngine,
  setCurrentGameSize: (gameSize: number) => void,
) {
  const coder = getComponentMapOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("map", accountInfo.data);
  setCurrentGameSize(parsedData.size);
}

// Subscribe to the game state
export function subscribeToGame(
  engine: MagicBlockEngine,
  foodEntities: PublicKey[],
  playerEntities: PublicKey[],
  entityMatch: PublicKey,
  currentPlayerEntity: PublicKey,
  currentPlayer: Blob,
  foodComponentSubscriptionId: any,
  playersComponentSubscriptionId: any,
  myplayerComponentSubscriptionId: any,
  mapComponentSubscriptionId: any,
  setAllPlayers: (callback: (prevAllPlayers: Blob[]) => Blob[]) => void,
  setCurrentPlayer: (player: Blob) => void,
  setGameEnded: (gameEnded: number) => void,
  setAllFood: (callback: (prevAllFood: any[][]) => any[][]) => void,
  setFoodListLen: (callback: (prevFoodListLen: number[]) => number[]) => void,
  setCurrentGameSize: (gameSize: number) => void,
) {
  for (let i = 0; i < foodEntities.length; i++) {
    const foodComponenti = FindComponentPda({
      componentId: COMPONENT_SECTION_ID,
      entity: foodEntities[i],
    });
    if (foodComponentSubscriptionId.current === null) {
      foodComponentSubscriptionId.current = [
        engine.subscribeToEphemAccountInfo(foodComponenti, (accountInfo) => {
          if (!accountInfo) {
            return;
          }
          handleFoodComponentChange(accountInfo, i, engine, setAllFood, setFoodListLen);
        }),
      ];
    } else {
      foodComponentSubscriptionId.current = [
        ...foodComponentSubscriptionId.current,
        engine.subscribeToEphemAccountInfo(foodComponenti, (accountInfo) => {
          if (!accountInfo) {
            return;
          }
          handleFoodComponentChange(accountInfo, i, engine, setAllFood, setFoodListLen);
        }),
      ];
    }
  }
  for (let i = 0; i < playerEntities.length; i++) {
    const playersComponenti = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: playerEntities[i],
    });
    if (playersComponentSubscriptionId.current === null) {
      playersComponentSubscriptionId.current = [
        engine.subscribeToEphemAccountInfo(playersComponenti, (accountInfo) => {
          if (!accountInfo) {
            return;
          }
          handlePlayersComponentChange(accountInfo, i, engine, setAllPlayers);
        }),
      ];
    } else {
      playersComponentSubscriptionId.current = [
        ...playersComponentSubscriptionId.current,
        engine.subscribeToEphemAccountInfo(playersComponenti, (accountInfo) => {
          if (!accountInfo) {
            return;
          }
          handlePlayersComponentChange(accountInfo, i, engine, setAllPlayers);
        }),
      ];
    }
  }

  const myplayerComponent = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: currentPlayerEntity,
  });
  myplayerComponentSubscriptionId.current = engine.subscribeToEphemAccountInfo(myplayerComponent, (accountInfo) => {
    if (!accountInfo) {
      return;
    }
    handleMyPlayerComponentChange(accountInfo, engine, currentPlayer, setCurrentPlayer, setGameEnded);
  });

  const mapComponent = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: entityMatch,
  });
  mapComponentSubscriptionId.current = engine.subscribeToEphemAccountInfo(mapComponent, (accountInfo) => {
    if (!accountInfo) {
      return;
    }
    handleMapComponentChange(accountInfo, engine, setCurrentGameSize);
  });
}