import { createTransferInstruction } from "@solana/spl-token";
import { createDelegateInstruction } from "@magicblock-labs/bolt-sdk";
import { AccountMeta, ComputeBudgetProgram, ParsedTransactionWithMeta, Transaction } from "@solana/web3.js";
import { COMPONENT_SECTION_ID } from "./gamePrograms";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { COMPONENT_PLAYER_ID } from "./gamePrograms";
import { getMaxPlayers, stringToUint8Array } from "@utils/helper";
import { anchor, ApplySystem, createUndelegateInstruction, DestroyComponent, FindComponentPda } from "@magicblock-labs/bolt-sdk";
import { FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { ActiveGame } from "@utils/types";
import { COMPONENT_MAP_ID } from "./gamePrograms";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import { gameSystemInitSection } from "./gameSystemInitSection";
import { SupersizeVaultClient } from "../engine/SupersizeVaultClient";
import NotificationService from "@components/notification/NotificationService";
import { getRegion, getValidatorKeyForEndpoint } from "../utils/helper";
import { SYSTEM_INIT_MAP_ID } from "./gamePrograms";
import { gameSystemInitPlayer } from "./gameSystemInitPlayer";

const undelegateMap = async (engine: MagicBlockEngine, mapComponentPda: PublicKey) => {
  const undelegateIx = createUndelegateInstruction({
    payer: engine.getSessionPayer(),
    delegatedAccount: mapComponentPda,
    componentPda: COMPONENT_MAP_ID,
  });
  const tx = new anchor.web3.Transaction().add(undelegateIx);
  tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
  tx.feePayer = engine.getSessionPayer();
  try {
    const undelsignature = await engine.processSessionEphemTransaction(
      "undelmap:" + mapComponentPda.toString(),
      tx,
    );
    console.log("undelegate", undelsignature);
  } catch (error) {
    console.log("Error undelegating:", error);
  }
}

const delegateMap = async (engine: MagicBlockEngine, mapComponentPda: PublicKey, mapEntityPda: PublicKey) => {
  const delegateIx = createDelegateInstruction({
    entity: mapEntityPda,
    account: mapComponentPda,
    ownerProgram: COMPONENT_MAP_ID,
    payer: engine.getSessionPayer(),
  });
  const tx = new anchor.web3.Transaction().add(delegateIx);
  tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
  tx.feePayer = engine.getSessionPayer();
  try {
    const delsignature = await engine.processSessionChainTransaction(
      "delmap:" + mapComponentPda.toString(),
      tx,
    );
    console.log("delegate", delsignature);
  } catch (error) {
    console.log("Error delegating:", error);
  }
}

export const handleUndelegatePlayer = async (
    engine: MagicBlockEngine,
    playerData: {
    playersComponentPda: PublicKey;
  }) => {
    const undelegateIx = createUndelegateInstruction({
      payer: engine.getSessionPayer(),
      delegatedAccount: playerData.playersComponentPda,
      componentPda: COMPONENT_PLAYER_ID,
    });
    const tx = new anchor.web3.Transaction().add(undelegateIx);
    tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
    tx.feePayer = engine.getSessionPayer();
    const alertId = NotificationService.addAlert({
      type: "success",
      message: "submitting undelegation...",
      shouldExit: false,
    });
    try {
      const playerundelsignature = await engine.processSessionEphemTransaction(
        "undelPlayer:" + playerData.playersComponentPda.toString(),
        tx,
      );
      console.log("undelegate", playerundelsignature);
    } catch (error) {
      console.log("Error undelegating:", error);
      const exitAlertId = NotificationService.addAlert({
        type: "error",
        message: "undelegation failed",
        shouldExit: false,
      });
      setTimeout(() => {
        NotificationService.updateAlert(exitAlertId, { shouldExit: true });
      }, 3000);
    } finally {
      NotificationService.updateAlert(alertId, { shouldExit: true });
    }
};

export const handleDelegatePlayer = async (
    engine: MagicBlockEngine,
    playerData: {
    seed: string;
    playersComponentPda: PublicKey;
    playerEntityPda: PublicKey;
}) => {
    const alertId = NotificationService.addAlert({
      type: "success",
      message: "submitting delegation...",
      shouldExit: false,
    });
    try {
      const playerdelegateIx = createDelegateInstruction({
        entity: playerData.playerEntityPda,
        account: playerData.playersComponentPda,
        ownerProgram: COMPONENT_PLAYER_ID,
        payer: engine.getWalletPayer(),
      });
      const deltx = new anchor.web3.Transaction().add(playerdelegateIx);
      const playerdelsignature = await engine.processWalletTransaction("playerdelegate", deltx);
      console.log(`delegation signature: ${playerdelsignature}`);
    } catch (error) {
      console.log("Error delegating:", error);
      const exitAlertId = NotificationService.addAlert({
        type: "error",
        message: "delegation failed",
        shouldExit: false,
      });
      setTimeout(() => {
        NotificationService.updateAlert(exitAlertId, { shouldExit: true });
      }, 3000);
    } finally {
      NotificationService.updateAlert(alertId, { shouldExit: true });
    }
};

export const handleResetMapInfo= async (engine: MagicBlockEngine, gameInfo: ActiveGame, newTokenMint: string = "", newBuyIn: number = 0, newName: string = "", activePlayers: number = 0) => {
    console.log("reset", gameInfo.worldId.toString(), newTokenMint, newBuyIn);
    const region = getRegion(gameInfo.endpoint);
    const validatorKey = getValidatorKeyForEndpoint(region);
    if (!validatorKey) {
      throw new Error("Invalid endpoint.");
    }
    //get the validator where the game is stored, like we do for wallets
    //include validator in createDelegateInstruction when creating a game
    console.log("validatorKey", validatorKey, region, gameInfo);
    
    const mapEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });

    const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
    });
    await undelegateMap(engine, mapComponentPda);

    let decimals = gameInfo.decimals;

    let new_token_mint = gameInfo.tokenMint;
    if (newTokenMint !== "") {
      new_token_mint = new PublicKey(newTokenMint);
      const mintInfo = await engine.getConnectionChain().getParsedAccountInfo(new PublicKey(newTokenMint));
      if (mintInfo.value && "parsed" in mintInfo.value.data) {
        decimals = mintInfo.value.data.parsed.info.decimals;
      } else {
        throw new Error("Invalid token mint info.");
      }
    }

    if (!new_token_mint) {
      throw new Error("Invalid token mint.");
    }

    let new_buy_in = gameInfo.buy_in / 10 ** gameInfo.decimals;
    if (newBuyIn) {
      new_buy_in = newBuyIn * 10 ** decimals;
    }else{
      new_buy_in = new_buy_in * 10 ** decimals;
    }

    let new_name = gameInfo.name;
    if (newName !== "") {
      new_name = newName;
    }
    console.log("new_buy_in", new_buy_in , decimals, new_name, activePlayers);
    const initGame = await ApplySystem({
      authority: engine.getSessionPayer(),
      world: gameInfo.worldPda,
      entities: [
        {
          entity: mapEntityPda,
          components: [{ componentId: COMPONENT_MAP_ID }],
        },
      ],
      systemId: SYSTEM_INIT_MAP_ID,
      args: {
        name: new_name,
        buy_in: new_buy_in,
        token_string: new_token_mint.toString(),
        game_type: "blob",
        active_players: activePlayers,
      },
    });

    await engine.processSessionChainTransaction("initmap:" + mapEntityPda, initGame.transaction);

    if(newTokenMint !== ""){
      const vaultClient = new SupersizeVaultClient(engine);
      await vaultClient.setupGameWallet(mapComponentPda, new PublicKey(newTokenMint), new PublicKey(validatorKey));
    }
    await delegateMap(engine, mapComponentPda, mapEntityPda);
}

export const handleDeleteGame = async (engine: MagicBlockEngine, gameInfo: ActiveGame) => {
    console.log("delete game", gameInfo.worldId.toString());
    let maxplayer = 10;
    let foodcomponents = 32;

    const anteEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("ante"),
    });

    const mapEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });
    
    const mapComponentPda = FindComponentPda({
      componentId: COMPONENT_MAP_ID,
      entity: mapEntityPda,
    });

    const undelegateIx = createUndelegateInstruction({
      payer: engine.getSessionPayer(),
      delegatedAccount: mapComponentPda,
      componentPda: COMPONENT_MAP_ID,
    });
    const tx = new anchor.web3.Transaction().add(undelegateIx);
    tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
    tx.feePayer = engine.getSessionPayer();
    try {
      const undelsignature = await engine.processSessionEphemTransaction(
        "undelmap:" + mapComponentPda.toString(),
        tx,
      );
      console.log("undelegate", undelsignature);
    } catch (error) {
        console.log("Error undelegating:", error);
    }
    let destroyMapComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: mapEntityPda, componentId: COMPONENT_MAP_ID, receiver: engine.getSessionPayer(), seed: "origin"});
    let destroyMapComponentTx = await engine.processSessionChainTransaction("destroy:origin", destroyMapComponentSig.transaction).catch((error) => {
      console.log("Error destroying:", error);
    });
    console.log("destroyMapComponentTx", destroyMapComponentTx);

    if (gameInfo.size == 4000) {
      maxplayer = 10;
      foodcomponents = 16 * 2;
    } else if (gameInfo.size == 6000) {
      maxplayer = 20;
      foodcomponents = 36 * 2;
    } else if (gameInfo.size == 8000) {
      maxplayer = 40;
      foodcomponents = 64 * 2;
    }

    for (let i = 1; i < foodcomponents + 1; i++) {
      const foodseed = "food" + i.toString();
      const foodEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(foodseed),
      });
      const foodComponenti = FindComponentPda({
        componentId: COMPONENT_SECTION_ID,
        entity: foodEntityPda,
      });

      const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: foodComponenti,
        componentPda: COMPONENT_SECTION_ID,
      });
      const tx = new anchor.web3.Transaction().add(undelegateIx);
      tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
      tx.feePayer = engine.getSessionPayer();
      try {
        const undelsignature = await engine.processSessionEphemTransaction(
          "undelfood:" + foodComponenti.toString(),
          tx,
        );
        console.log("undelegate", undelsignature);
      } catch (error) {
          console.log("Error undelegating:", error);
      }

      let destroyFoodComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: foodEntityPda, componentId: COMPONENT_SECTION_ID, receiver: engine.getSessionPayer(), seed: foodseed});
      let destroyFoodComponentTx = await engine.processSessionChainTransaction("destroy:" + foodseed, destroyFoodComponentSig.transaction).catch((error) => {
        console.log("Error destroying:", error);
      });
      console.log("destroyFoodComponentTx", destroyFoodComponentTx);
    }

    for (let i = 1; i < maxplayer + 1; i++) {
      const playerentityseed = "player" + i.toString();
      const playerEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(playerentityseed),
      });
      const playersComponentPda = FindComponentPda({
        componentId: COMPONENT_PLAYER_ID,
        entity: playerEntityPda,
      });

      const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: playersComponentPda,
        componentPda: COMPONENT_PLAYER_ID,
      });
      const tx = new anchor.web3.Transaction().add(undelegateIx);
      tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
      tx.feePayer = engine.getSessionPayer();
      try {
        const undelsignature = await engine.processSessionEphemTransaction(
          "undelPlayer:" + playersComponentPda.toString(),
          tx,
        );
        console.log("undelegate", undelsignature);
      } catch (error) {
          console.log("Error undelegating:", error);
      }

      let destroyPlayerComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: playerEntityPda, componentId: COMPONENT_PLAYER_ID, receiver: engine.getSessionPayer(), seed: playerentityseed});
      let destroyPlayerComponentTx = await engine.processSessionChainTransaction("destroy:" + playerentityseed, destroyPlayerComponentSig.transaction).catch((error) => {
        console.log("Error destroying:", error);
      });
      console.log("destroyPlayerComponentTx", destroyPlayerComponentTx);
    }
};


export const handleReinitializePlayerClick = async (engine: MagicBlockEngine, gameInfo: ActiveGame, playerEntityPda: PublicKey): Promise<void> => {
      const mapEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });

      const alertId = NotificationService.addAlert({
        type: "success",
        message: "reinitializing player...",
        shouldExit: false,
      });

      try {
        console.log("initPlayerSig", playerEntityPda.toString(), mapComponentPda.toString(), engine.getConnectionEphem());
        const initPlayerSig = await gameSystemInitPlayer(
          engine,
          engine.getConnectionEphem(),
          gameInfo.worldPda,
          playerEntityPda,
          mapEntityPda,
        );
        console.log("initPlayerSig", initPlayerSig);
      } catch (e) {
        // @ts-ignore
        if (e.message.includes("ExternalAccountLamportSpend")) {
          console.log(e);
        } else {
          console.log("Error reinitializing food:", e);
          const exitAlertId = NotificationService.addAlert({
            type: "error",
            message: "reinitialize failed",
            shouldExit: false,
          });
          setTimeout(() => {
            NotificationService.updateAlert(exitAlertId, { shouldExit: true });
          }, 3000);
          throw e;
        }
      } finally {
        NotificationService.updateAlert(alertId, { shouldExit: true });
      }
};

export const handleReinitializeClick = async (engine: MagicBlockEngine, gameInfo: ActiveGame, foodEntityPda: PublicKey, 
  foodComponentPda: PublicKey, x: number, y: number, seed: string): Promise<void> => {
    const mapEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });
      console.log("init food", foodEntityPda.toString(), x, y);
      const tx = new anchor.web3.Transaction();
      const delegateInstruction = createDelegateInstruction({
        entity: foodEntityPda,
        account: foodComponentPda,
        ownerProgram: COMPONENT_SECTION_ID,
        payer: engine.getSessionPayer(),
      });
      tx.add(delegateInstruction);
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      const alertId = NotificationService.addAlert({
        type: "success",
        message: "reinitializing food...",
        shouldExit: false,
      });
      try {
        try{
          const delSig = await engine.processSessionChainTransaction("redelegate", tx);
          console.log(`Delegated food batch: ${delSig}`);
        } catch (e) {
          console.log("Error reinitializing food:", e);
        }
        const initFoodSig = await gameSystemInitSection(
          engine,
          engine.getConnectionEphem(),
          gameInfo.worldPda,
          foodEntityPda,
          mapEntityPda,
          x,
          y,
        );
        console.log("initFoodSig", initFoodSig);
      } catch (e) {
        // @ts-ignore
        if (e.message.includes("ExternalAccountLamportSpend")) {
          console.log(e);
        } else {
          console.log("Error reinitializing food:", e);
          const exitAlertId = NotificationService.addAlert({
            type: "error",
            message: "reinitialize failed",
            shouldExit: false,
          });
          setTimeout(() => {
            NotificationService.updateAlert(exitAlertId, { shouldExit: true });
          }, 3000);
          throw e;
        }
      } finally {
        NotificationService.updateAlert(alertId, { shouldExit: true });
      }
};

export async function countMatchingTransactions(
  engine: MagicBlockEngine,
  targetPubkey: PublicKey,
  programId: PublicKey = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp"),
  daysToScan: number = 30
): Promise<number> {
  const now = Date.now() / 1000;
  const thirtyDaysAgo = now - daysToScan * 24 * 60 * 60;

  let signatures = await engine.getConnectionEphem().getSignaturesForAddress(programId, {
    limit: 1000,
  });

  signatures = signatures.filter(
    (sig) => (sig.blockTime ?? now) > thirtyDaysAgo
  );

  const txPromises = signatures.map((sigInfo) =>
    engine.getConnectionEphem().getParsedTransaction(sigInfo.signature, 'confirmed')
  );

  const transactions = (await Promise.all(txPromises)).filter(
    (tx): tx is ParsedTransactionWithMeta => tx !== null
  );

  const matchingTxs = transactions.filter((tx) =>
    tx.transaction.message.accountKeys.some(
      (account) => account.pubkey.equals(targetPubkey)
    )
  );

  return matchingTxs.length;
}

export async function countTransactionsByDay(
  engine: MagicBlockEngine,
  targetPubkey: PublicKey,
  programId: PublicKey = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp"),
  days: number = 7,
): Promise<number[]> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startTime = startOfToday.getTime() / 1000 - days * 24 * 60 * 60;

  let signatures = await engine
    .getConnectionEphem()
    .getSignaturesForAddress(programId, { limit: 1000 });

  signatures = signatures.filter((sig) => (sig.blockTime ?? 0) > startTime);

  const txPromises = signatures.map((sigInfo) =>
    engine
      .getConnectionEphem()
      .getParsedTransaction(sigInfo.signature, "confirmed"),
  );

  const transactions = (await Promise.all(txPromises)).filter(
    (tx): tx is ParsedTransactionWithMeta => tx !== null,
  );

  const counts = Array(days + 1).fill(0);
  for (const tx of transactions) {
    if (
      tx.transaction.message.accountKeys.some((account) =>
        account.pubkey.equals(targetPubkey),
      )
    ) {
      const blockTime = tx.blockTime ?? startTime;
      const dayIndex = Math.floor((blockTime - startTime) / (24 * 60 * 60));
      if (dayIndex >= 0 && dayIndex <= days) {
        counts[dayIndex]++;
      }
    }
  }
  return counts;
}
  
export const gameTransfer = async (
    engine: MagicBlockEngine,
    vaultClient: SupersizeVaultClient,
    amount: number,
    mapComponentPda: PublicKey,
    mint_of_token_being_sent: PublicKey,
    deposit: boolean = true,
  ) => {
    if (amount <= 0) {
      console.error("Deposit amount must be greater than zero.");
      return;
    }
    const action = deposit ? "deposit" : "withdraw";
    const alertId = NotificationService.addAlert({
      type: "success",
      message: `submitting ${action}...`,
      shouldExit: false,
    });
    try {
      const desposittx = await vaultClient.gameTranfer(
        mint_of_token_being_sent,
        amount,
        mapComponentPda,
        deposit,
      );
      const successAlertId = NotificationService.addAlert({
        type: "success",
        message: `${action} successful`,
        shouldExit: false,
      });
      setTimeout(() => {
        NotificationService.updateAlert(successAlertId, { shouldExit: true });
      }, 3000);
      const checkBalancePda = vaultClient.mapBalancePda(mapComponentPda, mint_of_token_being_sent);
      const checkTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: engine.getSessionPayer(),
          toPubkey: checkBalancePda,
          lamports: 0, 
        }),
      );
      await engine.processSessionEphemTransaction("testTx", checkTx);
      console.log(`${action} successful, transaction signature:`, desposittx);
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      const exitAlertId = NotificationService.addAlert({
        type: "error",
        message: `${action} failed`,
        shouldExit: false,
      });
      setTimeout(() => {
        NotificationService.updateAlert(exitAlertId, { shouldExit: true });
      }, 3000);
    } finally {
      NotificationService.updateAlert(alertId, { shouldExit: true });
    }
  };