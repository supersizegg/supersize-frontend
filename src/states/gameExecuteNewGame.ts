import React from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { FetchedGame, PlayerInfo, ActiveGame } from "@utils/types";
import { fetchTokenMetadata } from "@utils/helper";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_MAP_ID } from "./gamePrograms";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";
import { RPC_CONNECTION, NETWORK } from "@utils/constants";
import {
  GameContext,
  stepTransferSOL,
  stepInitWorld,
  stepCreateMap,
  stepCreateFoodEntities,
  stepCreatePlayerEntities,
  stepInitMapComponent,
  stepInitFoodComponents,
  stepInitPlayerComponents,
  stepSetupVault,
  stepInitializeGame,
  stepInitPlayers,
  stepDelegateMap,
  stepDelegateFood,
  stepInitFoodPositions,
  stepReclaimSOL,
  stepDelegatePlayers,
} from "./gameSteps";
import { SupersizeVaultClient } from "../engine/SupersizeVaultClient";
import { endpoints } from "../utils/constants";
import { getRegion, getValidatorKeyForEndpoint } from "../utils/helper";

export async function gameExecuteNewGame(
  engine: MagicBlockEngine,
  selectedServer: string,
  buy_in: number,
  game_owner_wallet_string: string,
  game_token_string: string,
  game_name: string,
  activeGamesLoaded: FetchedGame[],
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
  setNewGameId: React.Dispatch<React.SetStateAction<string>>,
  setGameCreated: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const gameOwnerWallet = new PublicKey(game_owner_wallet_string);
  const mint_of_token = new PublicKey(game_token_string);
  const owner_token_account = await getAssociatedTokenAddress(mint_of_token, gameOwnerWallet, true, TOKEN_2022_PROGRAM_ID);
  let decimals = 9;
  const connection = new Connection(RPC_CONNECTION[NETWORK]);
  const mintInfo = await connection.getParsedAccountInfo(mint_of_token);
  if (mintInfo.value && "parsed" in mintInfo.value.data) {
    decimals = mintInfo.value.data.parsed.info.decimals;
  } else {
    throw new Error("Invalid token mint info.");
  }

  const region = getRegion(selectedServer);
  const validator = getValidatorKeyForEndpoint(region);
  if(!validator)throw new Error("Invalid validator key.");

  const launchConnectionEphem = new Connection(selectedServer, {
    wsEndpoint: selectedServer.replace("http", "ws"),
  });

  const context: GameContext = {
    engine,
    connection,
    world: null,
    // FIXME
    // @ts-ignore
    mapEntityPda: null,
    foodEntityPdas: [],
    playerEntityPdas: [],
    // @ts-ignore
    anteroomEntityPda: null,
    foodComponentPdas: [],
    buy_in,
    gameParams: { maxplayer: 100, foodcomponents: 100, cost: 2.0 },
  };

  await stepTransferSOL(context, context.gameParams.cost, setTransactions, showPrompt);
  await stepInitWorld(context, setTransactions, setNewGameId, showPrompt);
  await stepCreateMap(context, setTransactions, showPrompt);
  await stepCreateFoodEntities(context, setTransactions, showPrompt);
  await stepCreatePlayerEntities(context, context.gameParams.maxplayer, setTransactions, showPrompt);
  await stepInitMapComponent(context, setTransactions, showPrompt);
  await stepInitFoodComponents(context, setTransactions, showPrompt);
  await stepInitPlayerComponents(context, setTransactions, showPrompt);
  //await stepSetupVault(context, mint_of_token, gameOwnerWallet, setTransactions, showPrompt);
  await stepInitializeGame(context, game_name, buy_in, mint_of_token.toString(), decimals, setTransactions, showPrompt);

  const mapComponentPda = await (async () => {
    return FindComponentPda({
      componentId: COMPONENT_MAP_ID,
      entity: context.mapEntityPda,
    });
  })();

  const vaultClient = new SupersizeVaultClient(context.engine);

  /* validator identities are different on Devnet and Mainnet */
  //const ephemIdentity = await context.engine.getConnectionEphem().getSlotLeader();
  //const validatorKey = new PublicKey(ephemIdentity);
  const validatorKey = new PublicKey(validator);
  console.log("validator", validatorKey.toString());
  console.log("ephem rpc", context.engine.getEndpointEphemRpc());

  await vaultClient.setupGameWallet(mapComponentPda, mint_of_token, validatorKey);

  await stepDelegateMap(context, validatorKey ,setTransactions, showPrompt);
  await stepDelegateFood(0, 10, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(10, 20, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(20, 30, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(30, 40, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(40, 50, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(50, 60, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(60, 70, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(70, 80, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(80, 90, context, validatorKey, setTransactions, showPrompt);
  await stepDelegateFood(90, 100, context, validatorKey, setTransactions, showPrompt);

  await stepDelegatePlayers(0, 10, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(10, 20, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(20, 30, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(30, 40, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(40, 50, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(50, 60, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(60, 70, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(70, 80, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(80, 90, context, validatorKey, setTransactions, showPrompt);
  await stepDelegatePlayers(90, 100, context, validatorKey, setTransactions, showPrompt);

  await stepInitPlayers(context, launchConnectionEphem, setTransactions, showPrompt);
  await stepInitFoodPositions(context, launchConnectionEphem, 10000, setTransactions, showPrompt);
  await stepReclaimSOL(context, gameOwnerWallet, setTransactions, showPrompt);

  // Finalize: update active games.
  const tokenMetadata = await fetchTokenMetadata(mint_of_token.toString(), NETWORK);
  const newGame: FetchedGame = {
    activeGame: {
      isLoaded: true,
      worldId: context.world.worldId,
      worldPda: context.world.worldPda,
      name: game_name,
      active_players: 0,
      max_players: 100,
      size: 10000,
      image: tokenMetadata.image || `${process.env.PUBLIC_URL}/default.png`,
      token: tokenMetadata.name || "TOKEN",
      buy_in: buy_in,
      endpoint: selectedServer,//engine.getEndpointEphemRpc(),
    } as ActiveGame,
    playerInfo: {
      playerStatus: "new_player",
      need_to_delegate: false,
      need_to_undelegate: false,
      newplayerEntityPda: new PublicKey(0),
    } as PlayerInfo,
  };
  setActiveGamesLoaded([...activeGamesLoaded, newGame]);
  console.log("Active games updated:", activeGamesLoaded, newGame);
  setGameCreated(true);
}
