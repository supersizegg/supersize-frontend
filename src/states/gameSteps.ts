import React from "react";
import {
  ComputeBudgetProgram,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createAddEntityInstruction,
  createDelegateInstruction,
  FindComponentPda,
  FindEntityPda,
  InitializeComponent,
  InitializeNewWorld,
} from "@magicblock-labs/bolt-sdk";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { stringToUint8Array, getTopLeftCorner } from "@utils/helper";
import { COMPONENT_ANTEROOM_ID, COMPONENT_MAP_ID, COMPONENT_PLAYER_ID, COMPONENT_SECTION_ID } from "./gamePrograms";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { executeStep } from "../utils/helper";
import { gameSystemInitSection } from "./gameSystemInitSection";
import { gameSystemInitMap } from "./gameSystemInitMap";
import { gameSystemInitPlayer } from "./gameSystemInitPlayer";
import { gameSystemInitAnteroom } from "./gameSystemInitAnteroom";

export const CONFIG = {
  computeUnitLimit: 200_000,
  computeUnitPrice: 1_000_002,
  reclaimLamportBuffer: 10_000,
  defaultBatchSize: 8,
};

// The shared Context for all steps
export interface GameContext {
  engine: MagicBlockEngine;
  connection: Connection;
  world: any;
  mapEntityPda: PublicKey;
  foodEntityPdas: PublicKey[];
  playerEntityPdas: PublicKey[];
  anteroomEntityPda: PublicKey;
  foodComponentPdas: PublicKey[];
  gameParams: { maxplayer: number; foodcomponents: number; cost: number };
  base_buyin: number;
  max_multiple: number;
  min_multiple: number;
}

// 1) Transfer SOL from the wallet to the session wallet
export async function stepTransferSOL(
  context: GameContext,
  cost: number,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const solTxnId = "transfer-sol";
  await executeStep(
    solTxnId,
    async () => {
      const solTransfer = SystemProgram.transfer({
        fromPubkey: context.engine.getWalletPayer(),
        toPubkey: context.engine.getSessionPayer(),
        lamports: cost * LAMPORTS_PER_SOL,
      });
      const solTx = new Transaction().add(solTransfer);
      await context.engine.processWalletTransaction(solTxnId, solTx);
    },
    setTransactions,
    showPrompt,
  );
}

// 2) Initialize the new world
export async function stepInitWorld(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  setNewGameId: React.Dispatch<React.SetStateAction<string>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const worldTxnId = "init-world";
  await executeStep(
    worldTxnId,
    async () => {
      const initNewWorld = await InitializeNewWorld({
        payer: context.engine.getSessionPayer(),
        connection: context.connection,
      });
      context.world = initNewWorld;
      setNewGameId(initNewWorld.worldId.toNumber().toString());

      const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit });
      initNewWorld.transaction.add(computeIx);

      const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 });
      initNewWorld.transaction.add(computePriceIx);

      await context.engine.processSessionChainTransaction(worldTxnId, initNewWorld.transaction);
    },
    setTransactions,
    showPrompt,
  );
}

// 3) Create the map entity
export async function stepCreateMap(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const mapTxnId = "create-map";
  await executeStep(
    mapTxnId,
    async () => {
      const mapSeed = "origin";
      const mapEntityPda = FindEntityPda({
        worldId: context.world.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(mapSeed),
      });
      context.mapEntityPda = mapEntityPda;
      const mapAddIx = await createAddEntityInstruction(
        {
          payer: context.engine.getSessionPayer(),
          world: context.world.worldPda,
          entity: mapEntityPda,
        },
        { extraSeed: stringToUint8Array(mapSeed) },
      );
      const mapTx = new Transaction()
        .add(mapAddIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      await context.engine.processSessionChainTransaction(mapTxnId, mapTx);
    },
    setTransactions,
    showPrompt,
  );
}

// 4) Create the food entities
export async function stepCreateFoodEntities(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const foodTxnId = "create-food-entities";
  await executeStep(
    foodTxnId,
    async () => {
      context.foodEntityPdas = [];
      const chainConnection = context.engine.getConnectionChain();
      for (let i = 0; i < context.gameParams.foodcomponents; i += CONFIG.defaultBatchSize) {
        const batch: PublicKey[] = [];
        const tx = new Transaction();
        const addEntityPromises = [];
        for (let j = 0; j < CONFIG.defaultBatchSize && i + j < context.gameParams.foodcomponents; j++) {
          const index = i + j;
          const foodPda = FindEntityPda({
            worldId: context.world.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(`food${index + 1}`),
          });
          batch.push(foodPda);
          addEntityPromises.push(
            (async () => {
              const accountInfo = await chainConnection.getAccountInfo(foodPda);
              if (accountInfo && accountInfo.lamports > 0) {
                console.log(`Food account ${foodPda.toString()} exists. Skipping creation.`);
                return;
              }
              const addEntityIx = await createAddEntityInstruction(
                {
                  payer: context.engine.getSessionPayer(),
                  world: context.world.worldPda,
                  entity: foodPda,
                },
                { extraSeed: stringToUint8Array(`food${index + 1}`) },
              );
              tx.add(addEntityIx);
            })(),
          );
        }
        await Promise.all(addEntityPromises);
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
        await context.engine.processSessionChainTransaction(foodTxnId, tx);
        context.foodEntityPdas.push(...batch);
        console.log(`Food entities batch ${i / CONFIG.defaultBatchSize + 1} completed.`);
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 5) Create the player entities
export async function stepCreatePlayerEntities(
  context: GameContext,
  maxplayer: number,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const playerTxnId = "create-player-entities";
  await executeStep(
    playerTxnId,
    async () => {
      context.playerEntityPdas = [];
      for (let i = 0; i < maxplayer + 1; i += CONFIG.defaultBatchSize) {
        const batch: PublicKey[] = [];
        const tx = new Transaction();
        const addEntityPromises = [];
        for (let j = 0; j < CONFIG.defaultBatchSize && i + j < maxplayer + 1; j++) {
          const index = i + j;
          const playerPda = FindEntityPda({
            worldId: context.world.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(`player${index + 1}`),
          });
          batch.push(playerPda);
          addEntityPromises.push(
            (async () => {
              const addEntityIx = await createAddEntityInstruction(
                {
                  payer: context.engine.getSessionPayer(),
                  world: context.world.worldPda,
                  entity: playerPda,
                },
                { extraSeed: stringToUint8Array(`player${index + 1}`) },
              );
              tx.add(addEntityIx);
            })(),
          );
        }
        await Promise.all(addEntityPromises);
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
        await context.engine.processSessionChainTransaction(playerTxnId, tx);
        context.playerEntityPdas.push(...batch);
        console.log(`Player entities batch ${i / CONFIG.defaultBatchSize + 1} completed.`);
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 6) Create the anteroom entity
export async function stepCreateAnteroom(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const anteroomTxnId = "create-anteroom";
  await executeStep(
    anteroomTxnId,
    async () => {
      const anteroomSeed = "ante";
      const anteroomEntityPda = FindEntityPda({
        worldId: context.world.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(anteroomSeed),
      });
      context.anteroomEntityPda = anteroomEntityPda;
      const anteroomAddIx = await createAddEntityInstruction(
        {
          payer: context.engine.getSessionPayer(),
          world: context.world.worldPda,
          entity: anteroomEntityPda,
        },
        { extraSeed: stringToUint8Array(anteroomSeed) },
      );
      const anteroomTx = new Transaction()
        .add(anteroomAddIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      await context.engine.processSessionChainTransaction(anteroomTxnId, anteroomTx);
    },
    setTransactions,
    showPrompt,
  );
}

// 7) Initialize the map component
export async function stepInitMapComponent(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initMapComponentTxnId = "init-map-component";
  await executeStep(
    initMapComponentTxnId,
    async () => {
      const initMapIx = await InitializeComponent({
        payer: context.engine.getSessionPayer(),
        entity: context.mapEntityPda,
        componentId: COMPONENT_MAP_ID,
      });
      const initMapTx = new Transaction()
        .add(initMapIx.transaction)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      await context.engine.processSessionChainTransaction(initMapComponentTxnId, initMapTx);
      console.log(`Initialized map component.`);
    },
    setTransactions,
    showPrompt,
  );
}

// 8) Initialize food components
export async function stepInitFoodComponents(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initFoodComponentTxnId = "init-food-components";
  await executeStep(
    initFoodComponentTxnId,
    async () => {
      context.foodComponentPdas = [];
      for (let i = 0; i < context.foodEntityPdas.length; i += CONFIG.defaultBatchSize) {
        const batch = context.foodEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
        const tx = new Transaction();
        const initComponentPromises = batch.map(async (foodPda) => {
          const initComponent = await InitializeComponent({
            payer: context.engine.getSessionPayer(),
            entity: foodPda,
            componentId: COMPONENT_SECTION_ID,
          });
          tx.add(initComponent.transaction);
          context.foodComponentPdas.push(initComponent.componentPda);
        });
        await Promise.all(initComponentPromises);
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
        await context.engine.processSessionChainTransaction(initFoodComponentTxnId, tx);
        console.log(`Initialized food components batch.`);
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 9) Initialize player components
export async function stepInitPlayerComponents(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initPlayerComponentTxnId = "init-player-components";
  await executeStep(
    initPlayerComponentTxnId,
    async () => {
      for (let i = 0; i < context.playerEntityPdas.length; i += CONFIG.defaultBatchSize) {
        const batch = context.playerEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
        const tx = new Transaction();
        const initComponentPromises = batch.map(async (playerPda) => {
          const initPlayerComponent = await InitializeComponent({
            payer: context.engine.getSessionPayer(),
            entity: playerPda,
            componentId: COMPONENT_PLAYER_ID,
          });
          tx.add(initPlayerComponent.transaction);
        });
        await Promise.all(initComponentPromises);
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
        await context.engine.processSessionChainTransaction(initPlayerComponentTxnId, tx);
        console.log(`Initialized player components batch.`);
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 10) Initialize the anteroom component
export async function stepInitAnteroomComponent(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initAnteroomComponentTxnId = "init-anteroom-component";
  await executeStep(
    initAnteroomComponentTxnId,
    async () => {
      const initAnteIx = await InitializeComponent({
        payer: context.engine.getSessionPayer(),
        entity: context.anteroomEntityPda,
        componentId: COMPONENT_ANTEROOM_ID,
      });
      const initAnteTx = new Transaction()
        .add(initAnteIx.transaction)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      await context.engine.processSessionChainTransaction(initAnteroomComponentTxnId, initAnteTx);
      console.log(`Initialized anteroom component.`);
    },
    setTransactions,
    showPrompt,
  );
}

// 11) Setup the vault
export async function stepSetupVault(
  context: GameContext,
  mint_of_token: PublicKey,
  gameOwnerWallet: PublicKey,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const vaultTxnId = "setup-vault";
  await executeStep(
    vaultTxnId,
    async () => {
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: context.mapEntityPda,
      });
      const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
        new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr"),
      );
      const tokenVault = await getAssociatedTokenAddress(mint_of_token, tokenAccountOwnerPda, true);
      const vaultCreateIx = createAssociatedTokenAccountInstruction(
        context.engine.getSessionPayer(),
        tokenVault,
        tokenAccountOwnerPda,
        mint_of_token,
      );
      const vaultTx = new Transaction()
        .add(vaultCreateIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      await context.engine.processSessionChainTransaction(vaultTxnId, vaultTx);
      console.log("Vault setup complete.");
    },
    setTransactions,
    showPrompt,
  );
}

// 12) Initialize game state
export async function stepInitializeGame(
  context: GameContext,
  game_name: string,
  game_size: number,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initGameTxnId = "initialize-game";
  await executeStep(
    initGameTxnId,
    async () => {
      const initGameSig = await gameSystemInitMap(
        context.engine,
        context.world.worldPda,
        context.mapEntityPda,
        game_name,
        game_size,
        context.base_buyin,
        context.max_multiple,
        context.min_multiple,
      );
      console.log(`Game initialized with signature: ${initGameSig}`);
    },
    setTransactions,
    showPrompt,
  );
}

// 13) Initialize players
export async function stepInitPlayers(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initPlayersTxnId = "init-players";
  await executeStep(
    initPlayersTxnId,
    async () => {
      // For each player entity, call your game system init player.
      for (let i = 0; i < context.playerEntityPdas.length; i++) {
        const initPlayerSig = await gameSystemInitPlayer(
          context.engine,
          context.world.worldPda,
          context.playerEntityPdas[i],
          context.mapEntityPda,
        );
        console.log(`Initialized player with signature: ${initPlayerSig}`);
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 14) Initialize the anteroom
export async function stepInitAnteroom(
  context: GameContext,
  mint_of_token: PublicKey,
  tokenVault: PublicKey,
  decimals: number,
  owner_token_account: PublicKey,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initAnteroomTxnId = "init-anteroom";
  await executeStep(
    initAnteroomTxnId,
    async () => {
      const initAnteroomSig = await gameSystemInitAnteroom(
        context.engine,
        context.world.worldPda,
        context.anteroomEntityPda,
        context.mapEntityPda,
        mint_of_token,
        tokenVault,
        decimals,
        owner_token_account,
      );
      console.log(`Initialized anteroom with signature: ${initAnteroomSig}`);
    },
    setTransactions,
    showPrompt,
  );
}

// 15) Delegate the map component
export async function stepDelegateMap(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const delegateMapTxnId = "delegate-map";
  await executeStep(
    delegateMapTxnId,
    async () => {
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: context.mapEntityPda,
      });
      const mapdelegateIx = createDelegateInstruction({
        entity: context.mapEntityPda,
        account: mapComponentPda,
        ownerProgram: COMPONENT_MAP_ID,
        payer: context.engine.getSessionPayer(),
      });
      const maptx = new Transaction()
        .add(mapdelegateIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 80_000 }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      const delSig = await context.engine.processSessionChainTransaction(delegateMapTxnId, maptx);
      console.log(`Delegated map component: ${delSig}`);
    },
    setTransactions,
    showPrompt,
  );
}

// 16) Delegate food components
export async function stepDelegateFood(
  context: GameContext,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const delegateFoodTxnId = "delegate-food";
  await executeStep(
    delegateFoodTxnId,
    async () => {
      const delbatchSize = 1; //3
      for (let i = 0; i < context.foodEntityPdas.length; i += delbatchSize) {
        const tx = new Transaction();
        const batch = context.foodEntityPdas.slice(i, i + delbatchSize);
        const delegatePromises = batch.map(async (foodEntityPda, index) => {
          return createDelegateInstruction({
            entity: foodEntityPda,
            account: context.foodComponentPdas[i + index],
            ownerProgram: COMPONENT_SECTION_ID,
            payer: context.engine.getSessionPayer(),
          });
        });
        const instructions = await Promise.all(delegatePromises);
        instructions.forEach((instruction) => tx.add(instruction));
        tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
        tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
        try {
          const delSig = await context.engine.processSessionChainTransaction(delegateFoodTxnId, tx);
          console.log(`Delegated food batch: ${delSig}`);
        } catch (e) {
          // @ts-ignore
          if (e.message.includes("ExternalAccountLamportSpend")) {
            console.log(e);
          } else {
            throw e;
          }
        }
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 17) Initialize food positions
export async function stepInitFoodPositions(
  context: GameContext,
  game_size: number,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const initFoodTxnId = "init-food";
  await executeStep(
    initFoodTxnId,
    async () => {
      let overallIndex = 0;
      const initFoodBatchSize = 1;
      for (let i = 0; i < context.foodEntityPdas.length; i += initFoodBatchSize) {
        const batch = context.foodEntityPdas.slice(i, i + initFoodBatchSize);
        const initFoodPromises = batch.map(async (foodPda) => {
          const { x, y } = getTopLeftCorner(overallIndex, game_size);
          const initFoodSig = await gameSystemInitSection(
            context.engine,
            context.world.worldPda,
            foodPda,
            context.mapEntityPda,
            x,
            y,
          );
          overallIndex++;
          console.log(`Initialized food position with signature: ${initFoodSig}`);
        });
        await Promise.all(initFoodPromises);
      }
    },
    setTransactions,
    showPrompt,
  );
}

// 18) Reclaim leftover SOL
export async function stepReclaimSOL(
  context: GameContext,
  gameOwnerWallet: PublicKey,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  const reclaimSolTxnId = "reclaim-sol";
  await executeStep(
    reclaimSolTxnId,
    async () => {
      const reclaimSolTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: context.engine.getSessionPayer(),
          toPubkey: gameOwnerWallet,
          lamports: CONFIG.reclaimLamportBuffer,
        }),
      );
      await context.engine.processSessionChainTransaction(reclaimSolTxnId, reclaimSolTx);
      console.log("Reclaimed leftover SOL.");
    },
    setTransactions,
    showPrompt,
  );
}
