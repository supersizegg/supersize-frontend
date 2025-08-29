import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_MAP_ID, SYSTEM_EXIT_GAME_ID, SUPERSIZE_VAULT_PROGRAM_ID } from "./gamePrograms";

import { ActiveGame } from "@utils/types";

export async function gameSystemExit(
  preferredRegion: string,
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  currentPlayerEntity: PublicKey,
  entityMatch: PublicKey,
) {
  const isGuest = (preferredRegion == undefined || preferredRegion == "" || !engine.getWalletConnected());
  let guestWallet = new PublicKey("G5USW6osjZviU6QEyWaZNtj4TUFeKAwCa4nRoCU2Yheo");
  if (preferredRegion == "ameria") {
    guestWallet = new PublicKey("G5USW6osjZviU6QEyWaZNtj4TUFeKAwCa4nRoCU2Yheo");
  } else if (preferredRegion == "asia") {
    guestWallet = new PublicKey("DRFSeRYK35NcGStkcbaD3TpH1F9BVzm8FbW9cNnEf9RR");
  } else if (preferredRegion == "europe") {
    guestWallet = new PublicKey("7j4M4tpFeLTcKNz6XVkam1Ny7i7PZWpKRohk34yQfToY");
  }
  const parentKey = isGuest ? guestWallet : engine.getWalletPayer();

  if (!parentKey) {
    throw new Error("User wallet is not connected.");
  }
  const mintOfToken = gameInfo.tokenMint!;

  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: entityMatch,
  });
  const playerComponentPda = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: currentPlayerEntity,
  });

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

  const [exitAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("exit_auth"), mapComponentPda.toBuffer(), playerComponentPda.toBuffer()],
    SYSTEM_EXIT_GAME_ID,
  );

  console.log("preferredRegion", preferredRegion);
  console.log("isGuest", isGuest);
  console.log("do_payout", !isGuest);
  console.log("parentKey", parentKey.toBase58());
  console.log("gameWalletPda", gameWalletPda.toBase58());
  console.log("userBalancePda", userBalancePda.toBase58());

  const applySystem = await ApplySystem({
    authority: engine.getSessionPayer(),
    world: gameInfo.worldPda,
    entities: [
      {
        entity: currentPlayerEntity,
        components: [{ componentId: COMPONENT_PLAYER_ID }],
      },
      {
        entity: entityMatch,
        components: [{ componentId: COMPONENT_MAP_ID }],
      },
    ],
    systemId: SYSTEM_EXIT_GAME_ID,
    args: {
      do_payout: !isGuest,  
      timestamp: performance.now(),
    },
    extraAccounts: [
      { pubkey: SUPERSIZE_VAULT_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: gameWalletPda, isSigner: false, isWritable: true },
      { pubkey: userBalancePda, isSigner: false, isWritable: true },
      { pubkey: gameBalancePda, isSigner: false, isWritable: true },
      { pubkey: playerComponentPda, isSigner: false, isWritable: false },
      { pubkey: mapComponentPda, isSigner: false, isWritable: false },
      { pubkey: mintOfToken, isSigner: false, isWritable: false },
      { pubkey: parentKey, isSigner: false, isWritable: false },
      { pubkey: exitAuthorityPda, isSigner: false, isWritable: false },
      //{ pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
  });

  return await engine.processSessionEphemTransactionNoConfirm("exit:" + currentPlayerEntity, applySystem.transaction);
}
