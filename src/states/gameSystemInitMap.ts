import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_MAP_ID, SYSTEM_INIT_MAP_ID } from "./gamePrograms";

export async function gameSystemInitMap(
  engine: MagicBlockEngine,
  worldPda: PublicKey,
  newmapentityPda: PublicKey,
  game_name: string,
  game_size: number,
  buy_in: number,
  token_string: string,
  decimals: number,
) {
  const initGame = await ApplySystem({
    authority: engine.getSessionPayer(),
    world: worldPda,
    entities: [
      {
        entity: newmapentityPda,
        components: [{ componentId: COMPONENT_MAP_ID }],
      },
    ],
    systemId: SYSTEM_INIT_MAP_ID,
    args: {
      name: game_name,
      size: game_size,
      buy_in: buy_in,
      token_string: token_string,
      token_decimals: decimals,
    },
  });

  return await engine.processSessionChainTransaction("initmap:" + newmapentityPda, initGame.transaction);
}
