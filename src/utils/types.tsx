import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface Food {
  x: number;
  y: number;
  food_value: number;
}

export interface Circle {
  x: number;
  y: number;
  size: number;
  radius: number;
  speed: number;
}

export interface Blob {
  name: string;
  authority: PublicKey | null;
  score: number;
  removal: BN;
  x: number;
  y: number;
  target_x: number;
  target_y: number;
  timestamp: number;
  circles: Circle[];
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
  newplayerEntityPda: PublicKey;
};
export type FetchedGame = {
  activeGame: ActiveGame;
  playerInfo: PlayerInfo;
};
