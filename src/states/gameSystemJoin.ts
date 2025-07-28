import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_MAP_ID, SYSTEM_BUY_IN_ID, SUPERSIZE_VAULT_PROGRAM_ID } from "./gamePrograms";
import { ActiveGame } from "@utils/types";

export async function gameSystemJoin(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  newplayerEntityPda: PublicKey,
  mapEntityPda: PublicKey,
  playerName: string,
) {
  const parentKey = engine.getWalletPayer();
  if (!parentKey) {
    throw new Error("User wallet is not connected.");
  }

  const sessionWallet = engine.getSessionPayer();

  const mintOfToken = gameInfo.tokenMint!;

  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: mapEntityPda,
  });
  console.log("Map Component PDA:", mapComponentPda.toBase58());

  const playerComponentPda = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: newplayerEntityPda,
  });
  console.log("Player Component PDA:", playerComponentPda.toBase58());

  const [gameWalletPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game-wallet"), parentKey.toBuffer()],
    SUPERSIZE_VAULT_PROGRAM_ID,
  );
  const [userBalancePda] = PublicKey.findProgramAddressSync(
    [parentKey.toBuffer(), mintOfToken.toBuffer()],
    SUPERSIZE_VAULT_PROGRAM_ID,
  );
  const [gameBalancePda] = PublicKey.findProgramAddressSync(
    [mapComponentPda.toBuffer(), mintOfToken.toBuffer()],
    SUPERSIZE_VAULT_PROGRAM_ID,
  );

  /*
  console.log([
      {
        pubkey: SUPERSIZE_VAULT_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: gameWalletPda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: userBalancePda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: gameBalancePda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: newplayerEntityPda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mapComponentPda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mintOfToken,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: parentKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: sessionWallet,
        isSigner: true,
        isWritable: true,
      },
    ]);
  */

  const applyJoinSystem = await ApplySystem({
    authority: sessionWallet,
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
    extraAccounts: [
      {
        pubkey: SUPERSIZE_VAULT_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: gameWalletPda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: userBalancePda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: gameBalancePda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: playerComponentPda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mapComponentPda,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mintOfToken,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: parentKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: sessionWallet,
        isSigner: true,
        isWritable: true,
      },
    ],
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