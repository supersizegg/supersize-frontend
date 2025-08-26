import { Connection, PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_MAP_ID, SYSTEM_INIT_SECTION_ID, COMPONENT_SECTION_ID } from "./gamePrograms";

export async function gameSystemInitSection(
  engine: MagicBlockEngine,
  connectionEphem: Connection,
  worldPda: PublicKey,
  newsectionPda: PublicKey,
  newmapentityPda: PublicKey,
  x: number,
  y: number,
) {
  const initSection = await ApplySystem({
    authority: engine.getSessionPayer(),
    world: worldPda,
    entities: [
      {
        entity: newsectionPda,
        components: [{ componentId: COMPONENT_SECTION_ID }],
      },
      {
        entity: newmapentityPda,
        components: [{ componentId: COMPONENT_MAP_ID }],
      },
    ],
    systemId: SYSTEM_INIT_SECTION_ID,
    args: {
      top_left_x: x,
      top_left_y: y,
    },
  });

  return await engine.processSessionEphemTransactionHard("initsection:" + newsectionPda, initSection.transaction, connectionEphem);
}
