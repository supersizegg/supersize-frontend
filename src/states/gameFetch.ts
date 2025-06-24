import { PublicKey } from "@solana/web3.js";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
  getComponentMapOnChain,
  getComponentMapOnEphem,
  getComponentPlayerOnChain,
  getComponentPlayerOnEphem,
  getComponentSectionOnChain,
  getComponentSectionOnEphem,
  getComponentMapOnSpecificEphem,
  getComponentPlayerOnSpecificEphem,
  getComponentPlayerOnSpecificChain,
} from "./gamePrograms";

export async function mapFetchOnChain(engine: MagicBlockEngine, mapPda: PublicKey) {
  const componentMap = getComponentMapOnChain(engine);
  return componentMap.account.map.fetchNullable(mapPda, "processed");
}

export async function mapFetchOnEphem(engine: MagicBlockEngine, mapPda: PublicKey) {
  const componentMap = getComponentMapOnEphem(engine);
  return componentMap.account.map.fetchNullable(mapPda, "processed");
}
export async function mapFetchOnSpecificEphem(engine: MagicBlockEngine, mapPda: PublicKey, endpoint: string) {
  const componentMap = getComponentMapOnSpecificEphem(engine, endpoint);
  return componentMap.account.map.fetchNullable(mapPda, "processed");
}

export async function playerFetchOnChain(engine: MagicBlockEngine, playerPda: PublicKey) {
  const componentPlayer = getComponentPlayerOnChain(engine);
  return componentPlayer.account.player.fetchNullable(playerPda, "processed");
}
export async function playerFetchOnSpecificChain(engine: MagicBlockEngine, playerPda: PublicKey, thisNework: string) {
  const componentPlayer = getComponentPlayerOnSpecificChain(engine, thisNework);
  return componentPlayer.account.player.fetchNullable(playerPda, "processed");
}
export async function playerFetchOnEphem(engine: MagicBlockEngine, playerPda: PublicKey) {
  const componentPlayer = getComponentPlayerOnEphem(engine);
  return componentPlayer.account.player.fetchNullable(playerPda, "processed");
}
export async function playerFetchOnSpecificEphem(engine: MagicBlockEngine, playerPda: PublicKey, endpoint: string) {
  const componentPlayer = getComponentPlayerOnSpecificEphem(engine, endpoint);
  return componentPlayer.account.player.fetchNullable(playerPda, "processed");
}

export async function sectionFetchOnChain(engine: MagicBlockEngine, sectionPda: PublicKey) {
  const componentSection = getComponentSectionOnChain(engine);
  return componentSection.account.section.fetchNullable(sectionPda, "processed");
}
export async function sectionFetchOnEphem(engine: MagicBlockEngine, sectionPda: PublicKey) {
  const componentSection = getComponentSectionOnEphem(engine);
  return componentSection.account.section.fetchNullable(sectionPda, "processed");
}
