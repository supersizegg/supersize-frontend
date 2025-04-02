import { PublicKey } from "@solana/web3.js";
import { ApplySystem, createUndelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { ActiveGame } from "@utils/types";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { gameSystemBuyIn } from "./gameSystemBuyIn";
import { COMPONENT_PLAYER_ID, COMPONENT_ANTEROOM_ID, SYSTEM_MOVEMENT_ID, COMPONENT_MAP_ID, COMPONENT_SECTION_ID } from "./gamePrograms";
import * as anchor from "@coral-xyz/anchor";
import { anteroomFetchOnChain } from "./gameFetch";
import { stringToUint8Array } from "@utils/helper";

type GameExecuteJoinResult = {
  success: boolean;
  message?: string;
  transactionSignature?: string;
  error?: string;
};

type PlayerInfo = {
  playerStatus: string;
  need_to_delegate: boolean;
  need_to_undelegate: boolean;
  newplayerEntityPda: PublicKey;
};

export async function gameExecuteJoin(
  engine: MagicBlockEngine,
  selectGameId: ActiveGame,
  buyIn: number,
  playerName: string,
  selectedGamePlayerInfo: PlayerInfo,
  useSessionWallet: boolean,
  setMyPlayerEntityPda: (pda: PublicKey | null) => void,
): Promise<GameExecuteJoinResult> {
  if (!selectGameId || selectGameId.name === "loading") {
    return { success: false, error: "Game not loaded or invalid game ID", message: "error" };
  }
  const gameInfo = selectGameId;

  const mapseed = "origin";
  const mapEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(mapseed),
  });
  const foodseed = "food1";
  const foodEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(foodseed),
  });

  let newplayerEntityPda = selectedGamePlayerInfo.newplayerEntityPda;
  let need_to_undelegate = selectedGamePlayerInfo.need_to_undelegate;

  if (!newplayerEntityPda) {
    return { success: false, error: "No available player slots in this game", message: "error" };
  }

  const playerComponentPda = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: newplayerEntityPda,
  });

  if (need_to_undelegate) {
    try {
      const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: playerComponentPda,
        componentPda: COMPONENT_PLAYER_ID,
      });
      const undeltx = new anchor.web3.Transaction().add(undelegateIx);
      undeltx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
      undeltx.feePayer = engine.getSessionPayer();
      const playerundelsignature = await engine.processSessionEphemTransaction(
        "undelPlayer:" + playerComponentPda.toString(),
        undeltx,
      );
      console.log("undelegate", playerundelsignature);
    } catch (error) {
      console.log("Error undelegating:", error);
    }
  }

  const anteseed = "ante";
  const anteEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(anteseed),
  });

  const anteComponentPda = FindComponentPda({
    componentId: COMPONENT_ANTEROOM_ID,
    entity: anteEntityPda,
  });

  const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);

  if (!anteParsedData || !anteParsedData.vaultTokenAccount || !anteParsedData.token) {
    return { success: false, error: "Missing or invalid ante data", message: "error" };
  }

  try {
    let buyInResult = await gameSystemBuyIn(engine, selectGameId, newplayerEntityPda, anteEntityPda, buyIn, playerName, useSessionWallet);
    if (!buyInResult.success) {
      return { success: false, error: buyInResult.error, message: "buyin_failed" };
    }
  } catch (buyInError) {
    console.error("Buy-in error:", buyInError);
    return {
      success: false,
      error: `Buy-in transaction failed: ${(buyInError as Error)?.message}`,
      message: "buyin_failed",
    };
  }
  try{
    const makeMove = await ApplySystem({
      authority: engine.getSessionPayer(),
      world: gameInfo.worldPda,
      entities: [
        {
          entity: newplayerEntityPda,
          components: [{ componentId: COMPONENT_PLAYER_ID }],
        },
        {
          entity: foodEntityPda,
          components: [{ componentId: COMPONENT_SECTION_ID }],
        },
        {
          entity: mapEntityPda,
          components: [{ componentId: COMPONENT_MAP_ID }],
        },
      ],
      systemId: SYSTEM_MOVEMENT_ID,
      args: {
        x: 0,
        y: 0,
        boost: false,
        timestamp: performance.now(),
      },
    });

    const alltransaction = new anchor.web3.Transaction();
    alltransaction.add(makeMove.transaction);

    let moveSig = await engine.processSessionEphemTransactionNoConfirm("txn:" + performance.now(), alltransaction).catch((error) => {
      console.log(error);
    });
    if (moveSig) {
      setMyPlayerEntityPda(newplayerEntityPda);
      return { success: true, transactionSignature: moveSig };
    } else {
      return { success: false, error: `Error joining the game, please refresh and try again`, message: "join_failed" };
    }
  }
  catch(error){
    console.log("error", error);
    return {
      success: false,
      error: `Error joining the game: ${(error as Error)?.message}, please refresh and try again`,
      message: "join_failed",
    };  
  }
}
