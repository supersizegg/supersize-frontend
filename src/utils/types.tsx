import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface Food {
  x: number;
  y: number;
  food_value: number;
  food_multiple: number;
}

export interface Blob {
  name: string;
  authority: PublicKey | null;
  x: number;
  y: number;
  radius: number;
  mass: number;
  score: number;
  payoutTokenAccount: PublicKey | null;
  speed: number;
  removal: BN;
  target_x: number;
  target_y: number;
  timestamp: number;
}

export type ActiveGame = {
  isLoaded: boolean;
  permissionless: boolean;
  worldPda: PublicKey;
  worldId: BN;
  name: string;
  active_players: number;
  max_players: number;
  size: number;
  image: string;
  token: string;
  tokenMint?: PublicKey;
  buy_in: number;
  decimals: number;
  endpoint: string;
};

export type Anteroom = {
  buyIn: number;
  token: PublicKey;
  tokenDecimals: number;
  vaultTokenAccount: PublicKey;
  gamemasterTokenAccount: PublicKey;
  totalActiveBuyins: number;
}

export type PlayerInfo = {
  playerStatus: string;
  need_to_delegate: boolean;
  need_to_undelegate: boolean;
  newplayerEntityPda: PublicKey;
};
export type FetchedGame = {
  activeGame: ActiveGame;
  playerInfo: PlayerInfo;
};
