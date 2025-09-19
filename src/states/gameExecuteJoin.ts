import { PublicKey } from "@solana/web3.js";
import { ApplySystem, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { ActiveGame } from "@utils/types";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { gameSystemJoin } from "./gameSystemJoin";
import { COMPONENT_PLAYER_ID, COMPONENT_MAP_ID, SYSTEM_MOVE_BLOB_ID } from "./gamePrograms";
import * as anchor from "@coral-xyz/anchor";
import { stringToUint8Array } from "@utils/helper";

type GameExecuteJoinResult = {
  success: boolean;
  message?: string;
  transactionSignature?: string;
  error?: string;
};

type PlayerInfo = {
  playerStatus: string;
  newplayerEntityPda: PublicKey;
};

export async function gameExecuteJoin(
  preferredRegion: string,
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

  let newplayerEntityPda = selectedGamePlayerInfo.newplayerEntityPda;

  if (!newplayerEntityPda) {
    return { success: false, error: "No available player slots in this game", message: "error" };
  }

  try {
    let buyInResult = await gameSystemJoin(
      preferredRegion,
      engine,
      selectGameId,
      newplayerEntityPda,
      mapEntityPda,
      playerName,
      buyIn,
    );
    if (!buyInResult.success) {
      return { success: false, error: buyInResult.error, message: "buyin_failed" };
    }
  } catch (buyInError) {
    console.error("Buy-in error:", buyInError);
    return {
      success: false,
      error: `${(buyInError as Error)?.message}`,
      message: "buyin_failed",
    };
  }
  try {
    const makeMove = await ApplySystem({
      authority: engine.getSessionPayer(),
      world: gameInfo.worldPda,
      entities: [
        {
          entity: newplayerEntityPda,
          components: [{ componentId: COMPONENT_PLAYER_ID }],
        },
        {
          entity: mapEntityPda,
          components: [{ componentId: COMPONENT_MAP_ID }],
        },
      ],
      systemId: SYSTEM_MOVE_BLOB_ID,
      args: {
        x: 0,
        y: 0,
        timestamp: performance.now(),
      },
    });

    const alltransaction = new anchor.web3.Transaction();
    alltransaction.add(makeMove.transaction);

    let moveSig = await engine
      .processSessionEphemTransactionNoConfirm("txn:" + performance.now(), alltransaction)
      .catch((error) => {
        console.log(error);
      });
    if (moveSig) {
      setMyPlayerEntityPda(newplayerEntityPda);
      return { success: true, transactionSignature: moveSig };
    } else {
      return { success: false, error: `Error joining the game, please refresh and try again`, message: "join_failed" };
    }
  } catch (error) {
    console.log("error", error);
    return {
      success: false,
      error: `Error joining the game: ${(error as Error)?.message}, please refresh and try again`,
      message: "join_failed",
    };
  }
}
