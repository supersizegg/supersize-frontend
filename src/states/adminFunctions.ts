import { createTransferInstruction } from "@solana/spl-token";
import { createDelegateInstruction } from "@magicblock-labs/bolt-sdk";
import { AccountMeta, ComputeBudgetProgram, ParsedTransactionWithMeta } from "@solana/web3.js";
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
    try {
      const playerundelsignature = await engine.processSessionEphemTransaction(
        "undelPlayer:" + playerData.playersComponentPda.toString(),
        tx,
      );
      console.log("undelegate", playerundelsignature);
    } catch (error) {
      console.log("Error undelegating:", error);
    }
};

export const handleDelegatePlayer = async (
    engine: MagicBlockEngine,
    playerData: {
    seed: string;
    playersComponentPda: PublicKey;
    playerEntityPda: PublicKey;
}) => {
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
    }
};

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

export const handleReinitializeClick = async (engine: MagicBlockEngine, gameInfo: ActiveGame, foodEntityPda: PublicKey, foodComponentPda: PublicKey, x: number, y: number, seed: string): Promise<void> => {
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
      try {
        const delSig = await engine.processSessionChainTransaction("redelegate", tx);
        console.log(`Delegated food batch: ${delSig}`);
      } catch (e) {
        // @ts-ignore
        if (e.message.includes("ExternalAccountLamportSpend")) {
          console.log(e);
        } else {
          throw e;
        }
      } 
      
      const initFoodSig = await gameSystemInitSection(
        engine,
        gameInfo.worldPda,
        foodEntityPda,
        mapEntityPda,
        x,
        y,
      );
      console.log("initFoodSig", initFoodSig);
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
  
export const gameTransfer = async (
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
    try {
      const desposittx = vaultClient.gameTranfer(mint_of_token_being_sent, amount, mapComponentPda, deposit);
      console.log("Deposit successful, transaction signature:", desposittx);
    } catch (error) {
      console.error("Error during deposit:", error);
    }
};