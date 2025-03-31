import { PublicKey } from "@solana/web3.js";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
  getComponentAnteroomOnEphem,
  getComponentAnteroomOnChain,
  getComponentMapOnChain,
  getComponentMapOnEphem,
  getComponentPlayerOnChain,
  getComponentPlayerOnEphem,
  getComponentSectionOnChain,
  getComponentSectionOnEphem,
  getComponentMapOnSpecificEphem,
  getComponentPlayerOnSpecificEphem,
} from "./gamePrograms";

export async function anteroomFetchOnChain(engine: MagicBlockEngine, antePda: PublicKey) {
  const componentAnteroom = getComponentAnteroomOnChain(engine);
  return componentAnteroom.account.anteroom.fetchNullable(antePda);
}

export async function anteroomFetchOnEphem(engine: MagicBlockEngine, antePda: PublicKey) {
  const componentAnteroom = getComponentAnteroomOnEphem(engine);
  return componentAnteroom.account.anteroom.fetchNullable(antePda);
}

export async function mapFetchOnChain(engine: MagicBlockEngine, mapPda: PublicKey) {
  const componentMap = getComponentMapOnChain(engine);
  return componentMap.account.map.fetchNullable(mapPda);
}

export async function mapFetchOnEphem(engine: MagicBlockEngine, mapPda: PublicKey) {
  const componentMap = getComponentMapOnEphem(engine);
  return componentMap.account.map.fetchNullable(mapPda);
}
export async function mapFetchOnSpecificEphem(engine: MagicBlockEngine, mapPda: PublicKey, endpoint: string) {
  const componentMap = getComponentMapOnSpecificEphem(engine, endpoint);
  return componentMap.account.map.fetchNullable(mapPda);
}

export async function playerFetchOnChain(engine: MagicBlockEngine, playerPda: PublicKey) {
  const componentPlayer = getComponentPlayerOnChain(engine);
  return componentPlayer.account.player.fetchNullable(playerPda);
}
export async function playerFetchOnChainProcessed(engine: MagicBlockEngine, playerPda: PublicKey) {
  const componentPlayer = getComponentPlayerOnChain(engine);
  return componentPlayer.account.player.fetchNullable(playerPda, "processed");
}
export async function playerFetchOnEphem(engine: MagicBlockEngine, playerPda: PublicKey) {
  const componentPlayer = getComponentPlayerOnEphem(engine);
  return componentPlayer.account.player.fetchNullable(playerPda);
}
export async function playerFetchOnSpecificEphem(engine: MagicBlockEngine, playerPda: PublicKey, endpoint: string) {
  const componentPlayer = getComponentPlayerOnSpecificEphem(engine, endpoint);
  return componentPlayer.account.player.fetchNullable(playerPda);
}
export async function playerFetchOnSpecificEphemProcessed(engine: MagicBlockEngine, playerPda: PublicKey, endpoint: string) {
  const componentPlayer = getComponentPlayerOnSpecificEphem(engine, endpoint);
  return componentPlayer.account.player.fetchNullable(playerPda, "processed");
}

export async function sectionFetchOnChain(engine: MagicBlockEngine, sectionPda: PublicKey) {
  const componentSection = getComponentSectionOnChain(engine);
  return componentSection.account.section.fetchNullable(sectionPda);
}

export async function sectionFetchOnEphem(engine: MagicBlockEngine, sectionPda: PublicKey) {
  const componentSection = getComponentSectionOnEphem(engine);
  return componentSection.account.section.fetchNullable(sectionPda);
}
