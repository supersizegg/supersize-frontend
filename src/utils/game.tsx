import { FetchedGame } from "./types";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export function createUnloadedGame(
  worldId: anchor.BN,
  worldPda: PublicKey,
  endpoint: string,
  permissionless: boolean = false,
): FetchedGame {
  return {
    activeGame: {
      isLoaded: false,
      worldId,
      worldPda: worldPda,
      name: "loading",
      active_players: 0,
      max_players: 0,
      size: 0,
      image: `${process.env.PUBLIC_URL}/token.png`,
      token: "LOADING",
      base_buyin: 0,
      min_buyin: 0,
      max_buyin: 0,
      endpoint,
      ping: 0,
      permissionless,
    },
    playerInfo: {
      playerStatus: "new_player",
      need_to_delegate: false,
      need_to_undelegate: false,
      newplayerEntityPda: new PublicKey(0),
    },
  };
}
