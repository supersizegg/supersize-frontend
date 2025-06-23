import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_MAP_ID, SYSTEM_BUY_IN_ID } from "./gamePrograms";

import { ActiveGame } from "@utils/types";

export async function gameSystemJoin(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  newplayerEntityPda: PublicKey,
  mapEntityPda: PublicKey,
  playerName: string,
) {
  const applyJoinSystem = await ApplySystem({
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
    systemId: SYSTEM_BUY_IN_ID,
    args: {
      name: playerName,
    },
  });

  try {
    let joinSignature = await engine.processSessionEphemTransaction("join:" + playerName, applyJoinSystem.transaction);
    console.log(`join signature: ${joinSignature}`);
    return { success: true, transactionSignature: joinSignature };

  } catch (error) {
    console.log("Error buying in:", error);
    return { success: false, error: `Error buying in: ${(error as Error)?.message}`, message: "error" };
  }
}
