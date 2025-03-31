import React from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
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
  stepCreateAnteroom,
  stepInitMapComponent,
  stepInitFoodComponents,
  stepInitPlayerComponents,
  stepInitAnteroomComponent,
  stepSetupVault,
  stepInitializeGame,
  stepInitPlayers,
  stepInitAnteroom,
  stepDelegateMap,
  stepDelegateFood,
  stepInitFoodPositions,
  stepReclaimSOL,
} from "./gameSteps";

export async function gameExecuteNewGame(
  engine: MagicBlockEngine,
  game_size: number,
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
  const gameParams = {
    4000: { maxplayer: 10, foodcomponents: 32, cost: 0.4 },
    6000: { maxplayer: 20, foodcomponents: 72, cost: 1.0 },
    8000: { maxplayer: 40, foodcomponents: 128, cost: 1.6 },
  }[game_size];
  if (!gameParams) throw new Error("Invalid game size.");
  const gameOwnerWallet = new PublicKey(game_owner_wallet_string);
  const mint_of_token = new PublicKey(game_token_string);
  const owner_token_account = await getAssociatedTokenAddress(mint_of_token, gameOwnerWallet);
  let decimals = 9;
  const connection = new Connection(RPC_CONNECTION[NETWORK]);
  const mintInfo = await connection.getParsedAccountInfo(mint_of_token);
  if (mintInfo.value && "parsed" in mintInfo.value.data) {
    decimals = mintInfo.value.data.parsed.info.decimals;
  } else {
    throw new Error("Invalid token mint info.");
  }

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
    gameParams,
    buy_in,
  };

  await stepTransferSOL(context, gameParams.cost, setTransactions, showPrompt);
  await stepInitWorld(context, setTransactions, setNewGameId, showPrompt);
  await stepCreateMap(context, setTransactions, showPrompt);
  await stepCreateFoodEntities(context, setTransactions, showPrompt);
  await stepCreatePlayerEntities(context, gameParams.maxplayer, setTransactions, showPrompt);
  await stepCreateAnteroom(context, setTransactions, showPrompt);
  await stepInitMapComponent(context, setTransactions, showPrompt);
  await stepInitFoodComponents(context, setTransactions, showPrompt);
  await stepInitPlayerComponents(context, setTransactions, showPrompt);
  await stepInitAnteroomComponent(context, setTransactions, showPrompt);
  await stepSetupVault(context, mint_of_token, gameOwnerWallet, setTransactions, showPrompt);
  await stepInitializeGame(context, game_name, game_size, buy_in, mint_of_token.toString(), decimals, setTransactions, showPrompt);
  await stepInitPlayers(context, setTransactions, showPrompt);

  // Compute tokenVault (needed for initializing the anteroom).
  const mapComponentPda = await (async () => {
    return FindComponentPda({
      componentId: COMPONENT_MAP_ID,
      entity: context.mapEntityPda,
    });
  })();
  const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
    new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr"),
  );
  const tokenVault = await getAssociatedTokenAddress(mint_of_token, tokenAccountOwnerPda, true);

  await stepInitAnteroom(
    context,
    tokenVault,
    owner_token_account,
    setTransactions,
    showPrompt,
  );
  await stepDelegateMap(context, setTransactions, showPrompt);
  await stepDelegateFood(context, setTransactions, showPrompt);
  await stepInitFoodPositions(context, game_size, setTransactions, showPrompt);
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
      max_players: gameParams.maxplayer,
      size: game_size,
      image: tokenMetadata.image || `${process.env.PUBLIC_URL}/default.png`,
      token: tokenMetadata.name || "TOKEN",
      buy_in: buy_in,
      endpoint: engine.getEndpointEphemRpc(),
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
