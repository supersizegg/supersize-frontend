import { FetchedGame } from "./types";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export function createUnloadedGame(
  worldId: anchor.BN,
  worldPda: PublicKey,
  endpoint: string,
  is_slime: boolean = false,
  slime_buy_in: number = 0,
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
      buy_in: 0,
      is_free: is_slime,
      slime_buy_in: slime_buy_in,
      decimals: 0,
      endpoint,
      permissionless,
    },
    playerInfo: {
      playerStatus: "new_player",
      newplayerEntityPda: new PublicKey(0),
    },
  };
}
