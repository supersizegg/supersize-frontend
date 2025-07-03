import { PublicKey } from "@solana/web3.js";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";

import { Snake } from "../backend/target/types/snake";
import { Map } from "../backend/target/types/map";
import { Player } from "../backend/target/types/player";
import { Section } from "../backend/target/types/section";

import { BuyIn } from "../backend/target/types/buy_in";
import { MoveSnake } from "../backend/target/types/move_snake";
import { EatFood } from "../backend/target/types/eat_food";
import { EatBlob } from "../backend/target/types/eat_blob";
import { ExitGame } from "../backend/target/types/exit_game";
import { InitSnake } from "../backend/target/types/init_snake";
import { InitMap } from "../backend/target/types/init_map";
import { InitPlayer } from "../backend/target/types/init_player";
import { InitSection } from "../backend/target/types/init_section";
import { MoveBlob } from "../backend/target/types/move_blob";
import { SpawnFood } from "../backend/target/types/spawn_food";
import { SplitBlob } from "../backend/target/types/split_blob";
// import { KillSnake } from "../backend/target/types/kill_snake";
// import * as JoinTemp from "../backend/target/types/buy_in";
// import * as ExitTemp from "../backend/target/types/exit_game";

import * as SnakeIdl from "../backend/target/idl/snake.json";
import * as MapIdl from "../backend/target/idl/map.json";
import * as PlayerIdl from "../backend/target/idl/player.json";
import * as SectionIdl from "../backend/target/idl/section.json";

import * as BuyInIdl from "../backend/target/idl/buy_in.json";
import * as MoveSnakeIdl from "../backend/target/idl/move_snake.json";
import * as EatFoodIdl from "../backend/target/idl/eat_food.json";
import * as EatBlobIdl from "../backend/target/idl/eat_blob.json";
import * as ExitGameIdl from "../backend/target/idl/exit_game.json";
import * as InitSnakeIdl from "../backend/target/idl/init_snake.json";
import * as InitMapIdl from "../backend/target/idl/init_map.json";
import * as InitPlayerIdl from "../backend/target/idl/init_player.json";
import * as InitSectionIdl from "../backend/target/idl/init_section.json";
import * as MoveBlobIdl from "../backend/target/idl/move_blob.json";
import * as SpawnFoodIdl from "../backend/target/idl/spawn_food.json";
import * as SplitBlobIdl from "../backend/target/idl/split_blob.json";
// import * as KillSnakeIdl from "../backend/target/idl/kill_snake.json";
import * as JoinTempIdl from "../backend/target/idl/buy_in.json";
import * as ExitTempIdl from "../backend/target/idl/exit_game.json";

const componentSnake = SnakeIdl as Snake;
const componentMap = MapIdl as Map;
const componentPlayer = PlayerIdl as Player;
const componentSection = SectionIdl as Section;

const systemBuyIn = BuyInIdl as BuyIn;
const systemMoveSnake = MoveSnakeIdl as MoveSnake;
const systemEatFood = EatFoodIdl as EatFood;
const systemEatBlob = EatBlobIdl as EatBlob;
const systemExitGame = ExitGameIdl as ExitGame;
const systemInitSnake = InitSnakeIdl as InitSnake;
const systemInitMap = InitMapIdl as InitMap;
const systemInitPlayer = InitPlayerIdl as InitPlayer;
const systemInitSection = InitSectionIdl as InitSection;
const systemMoveBlob = MoveBlobIdl as MoveBlob;
const systemSpawnFood = SpawnFoodIdl as SpawnFood;
const systemSplitBlob = SplitBlobIdl as SplitBlob;
const systemJoinTemp = JoinTempIdl as BuyIn;
const systemExitTemp = ExitTempIdl as ExitGame;

export const COMPONENT_SNAKE_ID = new PublicKey(componentSnake.address);
export const COMPONENT_MAP_ID = new PublicKey(componentMap.address);
export const COMPONENT_PLAYER_ID = new PublicKey(componentPlayer.address);
export const COMPONENT_SECTION_ID = new PublicKey(componentSection.address);

export const SYSTEM_BUY_IN_ID = new PublicKey(systemBuyIn.address);
export const SYSTEM_MOVE_SNAKE_ID = new PublicKey(systemMoveSnake.address);
export const SYSTEM_EAT_FOOD_ID = new PublicKey(systemEatFood.address);
export const SYSTEM_EAT_BLOB_ID = new PublicKey(systemEatBlob.address);
export const SYSTEM_EXIT_GAME_ID = new PublicKey(systemExitGame.address);
export const SYSTEM_INIT_SNAKE_ID = new PublicKey(systemInitSnake.address);
export const SYSTEM_INIT_MAP_ID = new PublicKey(systemInitMap.address);
export const SYSTEM_INIT_PLAYER_ID = new PublicKey(systemInitPlayer.address);
export const SYSTEM_INIT_SECTION_ID = new PublicKey(systemInitSection.address);
export const SYSTEM_MOVE_BLOB_ID = new PublicKey(systemMoveBlob.address);
export const SYSTEM_SPAWN_FOOD_ID = new PublicKey(systemSpawnFood.address);
export const SYSTEM_SPLIT_BLOB_ID = new PublicKey(systemSplitBlob.address);
export const SYSTEM_JOIN_TEMP_ID = new PublicKey(systemJoinTemp.address);
export const SYSTEM_EXIT_TEMP_ID = new PublicKey(systemExitTemp.address);

export function getComponentSnakeOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Snake>(componentSnake);
}

export function getComponentSnakeOnSpecificChain(engine: MagicBlockEngine, thisNework: string) {
  return engine.getProgramOnSpecificChain<Snake>(componentSnake, thisNework);
}

export function getComponentSnakeOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Snake>(componentSnake);
}

export function getComponentMapOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Map>(componentMap);
}

export function getComponentMapOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Map>(componentMap);
}

export function getComponentMapOnSpecificEphem(engine: MagicBlockEngine, endpoint: string) {
  return engine.getProgramOnSpecificEphem<Map>(componentMap, endpoint);
}

export function getComponentPlayerOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Player>(componentPlayer);
}

export function getComponentPlayerOnSpecificChain(engine: MagicBlockEngine, thisNework: string) {
  return engine.getProgramOnSpecificChain<Player>(componentPlayer, thisNework);
}

export function getComponentPlayerOnSpecificEphem(engine: MagicBlockEngine, endpoint: string) {
  return engine.getProgramOnSpecificEphem<Player>(componentPlayer, endpoint);
}

export function getComponentPlayerOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Player>(componentPlayer);
}
export function getComponentSectionOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Section>(componentSection);
}

export function getComponentSectionOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Section>(componentSection);
}
