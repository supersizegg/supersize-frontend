import { PublicKey } from "@solana/web3.js";
import { anchor, ApplySystem, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_MAP_ID, SYSTEM_SPAWN_FOOD_ID, COMPONENT_SECTION_ID, SUPERSIZE_VAULT_PROGRAM_ID } from "./gamePrograms";
import { ActiveGame } from "@utils/types";
import { getSectionIndex } from "@utils/helper";
import { stringToUint8Array } from "../utils/helper";

export async function gameSystemSpawnFood(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  foodX: number,
  foodY: number,
  foodListLen: number[],
  entityMatch: PublicKey,
  foodEntities: PublicKey[],
) {
  const mintOfToken = gameInfo.tokenMint!;

  const mapEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array("origin"),
  });
  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: mapEntityPda,
  });

  const [gameBalancePda] = PublicKey.findProgramAddressSync(
    [mapComponentPda.toBuffer(), mintOfToken.toBuffer()],
    SUPERSIZE_VAULT_PROGRAM_ID,
  );

  const currentSection = getSectionIndex(foodX, foodY, gameInfo.size, 1);
  const foodComponentPda = FindComponentPda({
    componentId: COMPONENT_SECTION_ID,
    entity:  foodEntities[currentSection],
  });
  const newFoodTx = await ApplySystem({
    authority: engine.getSessionPayer(),
    world: gameInfo.worldPda,
    entities: [
      {
        entity: entityMatch,
        components: [{ componentId: COMPONENT_MAP_ID }],
      },
      {
        entity: foodEntities[currentSection],
        components: [{ componentId: COMPONENT_SECTION_ID }],
      },
    ],
    systemId: SYSTEM_SPAWN_FOOD_ID,
    args: {
      timestamp: performance.now(),
    },
    extraAccounts: [
      {
        pubkey: gameBalancePda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: mintOfToken,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mapComponentPda,
        isSigner: false,
        isWritable: false,
      },
    ],
  });

  return await engine.processSessionEphemTransaction("new food@" + performance.now(), newFoodTx.transaction);
}
