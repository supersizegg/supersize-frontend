import { createTransferInstruction } from "@solana/spl-token";
import { createDelegateInstruction } from "@magicblock-labs/bolt-sdk";
import { AccountMeta, ComputeBudgetProgram } from "@solana/web3.js";
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

export async function calculateGameplayStats(engine: MagicBlockEngine, account: string) {
    const accountPubkey = new PublicKey(account);
    const signatures = await engine.getConnectionChain().getSignaturesForAddress(accountPubkey, { limit: 1000 });
    const supersizeOwner = "DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB";
    const transactionPromises = signatures.map(async (signatureInfo) => {
      const transactionDetails = await engine.getConnectionChain().getTransaction(signatureInfo.signature, {
        commitment: "confirmed",
      });
  
      let cashOut = 0;
      let buyIn = 0;
      let buyInCount = 0;
  
      if (transactionDetails) {
        const { meta } = transactionDetails;
        if (meta && meta.preTokenBalances && meta.postTokenBalances) {
          const tokenPreAccountIndex = meta.preTokenBalances.findIndex(
            (token) => token.owner === supersizeOwner
          );
          const tokenPostAccountIndex = meta.postTokenBalances.findIndex(
            (token) => token.owner === supersizeOwner
          );
  
          if (tokenPreAccountIndex !== -1 && tokenPostAccountIndex !== -1) {
            const preBalance = meta.preTokenBalances[tokenPreAccountIndex]?.uiTokenAmount.uiAmount || 0;
            const postBalance = meta.postTokenBalances[tokenPostAccountIndex]?.uiTokenAmount.uiAmount || 0;
            const balanceChange = postBalance - preBalance;
            if (balanceChange > 0 && meta.preTokenBalances.length > 2) {
              cashOut += balanceChange;
            }
          } else {
            const preBalance = meta.preTokenBalances[0]?.uiTokenAmount.uiAmount || 0;
            const postBalance = meta.postTokenBalances[0]?.uiTokenAmount.uiAmount || 0;
            const balanceChange = postBalance - preBalance;
            buyIn += Math.abs(balanceChange);
            buyInCount++;
          }
        }
      }
      return { cashOut, buyIn, buyInCount };
    });
  
    const transactionResults = await Promise.all(transactionPromises);
    const totals = transactionResults.reduce(
      (acc, result) => {
        acc.cashOutSum += result.cashOut;
        acc.buyInSum += result.buyIn;
        acc.buyInCount += result.buyInCount;
        return acc;
      },
      { cashOutSum: 0, buyInSum: 0, buyInCount: 0 }
    );
  
    return totals;
}  
  
export const deposit = async (
    engine: MagicBlockEngine,
    amount: number,
    gameWallet: PublicKey,
    mint_of_token_being_sent: PublicKey,
    decimals: number,
  ) => {
    if (amount <= 0) {
      console.error("Deposit amount must be greater than zero.");
      return;
    }
    try {
      const transaction = new anchor.web3.Transaction();
      let usertokenAccountInfo = await getAssociatedTokenAddress(
        new PublicKey(mint_of_token_being_sent),
        engine.getWalletPayer(),
      );
      const transferIx = createTransferInstruction(
        usertokenAccountInfo,
        gameWallet,
        engine.getWalletPayer(),
        amount * 10 ** decimals,
        [],
        TOKEN_PROGRAM_ID,
      );
      transaction.add(transferIx);
      const desposittx = await engine.processWalletTransaction("deposit", transaction);
      console.log("Deposit successful, transaction signature:", desposittx);
    } catch (error) {
      console.error("Error during deposit:", error);
    }
};