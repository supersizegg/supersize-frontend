import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";
import axios from "axios";
import nacl from "tweetnacl";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_MAP_ID, SYSTEM_BUY_IN_ID, SUPERSIZE_VAULT_PROGRAM_ID } from "./gamePrograms";
import { ActiveGame } from "@utils/types";
// import { SupersizeVaultClient } from "../engine/SupersizeVaultClient";
import { getRegion } from "../utils/helper";
import { API_URL } from "../utils/constants";

const FREE_GAME_AUTHORITY = new PublicKey("4ZYVCAEVhZQKcdvzrKfsc4UyiuncNXefTif9VQdvhABe");

export async function gameSystemJoin(
  preferredRegion: string,
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  newplayerEntityPda: PublicKey,
  mapEntityPda: PublicKey,
  playerName: string,
  buyIn: number,
) {
  const isGuest = preferredRegion == undefined || preferredRegion == "" || !engine.getWalletConnected();
  let guestWallet = new PublicKey("G5USW6osjZviU6QEyWaZNtj4TUFeKAwCa4nRoCU2Yheo");
  if (getRegion(engine.getConnectionEphem().rpcEndpoint) == "america") {
    guestWallet = new PublicKey("G5USW6osjZviU6QEyWaZNtj4TUFeKAwCa4nRoCU2Yheo");
  } else if (getRegion(engine.getConnectionEphem().rpcEndpoint) == "asia") {
    guestWallet = new PublicKey("DRFSeRYK35NcGStkcbaD3TpH1F9BVzm8FbW9cNnEf9RR");
  } else if (getRegion(engine.getConnectionEphem().rpcEndpoint) == "europe") {
    guestWallet = new PublicKey("7j4M4tpFeLTcKNz6XVkam1Ny7i7PZWpKRohk34yQfToY");
  }
  const parentKey = isGuest ? guestWallet : engine.getWalletPayer();
  console.log("parentKey", parentKey.toString(), "preferredRegion", preferredRegion, engine.getConnectionEphem());

  if (isGuest && !gameInfo.is_free) {
    throw new Error("Guest players cannot join paid games.");
  }

  const sessionWallet = engine.getSessionPayer();
  const isFreeGame = Boolean(gameInfo.is_free);
  const authority = isFreeGame ? FREE_GAME_AUTHORITY : sessionWallet;
  const mintOfToken = gameInfo.tokenMint!;
  const endpoint = engine.getEndpointEphemRpc();

  // if (!isGuest) {
  //   const vault = new SupersizeVaultClient(engine);
  //   await vault.ensureDelegatedForJoin(mintOfToken);
  // }

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

  console.log("preferredRegion", preferredRegion);
  console.log("gameWalletPda", gameWalletPda.toString());
  console.log("userBalancePda", userBalancePda.toString());
  console.log("gameBalancePda", gameBalancePda.toString());
  console.log("sessionWallet", sessionWallet.toString());

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
      name: playerName ? playerName : engine.getSessionPayer().toBase58().substring(0, 6),
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
        pubkey: FREE_GAME_AUTHORITY, // sessionWallet,
        isSigner: true, // !isFreeGame,
        isWritable: true,
      },
    ],
  });

  const transaction = applyJoinSystem.transaction;

  if (!transaction.recentBlockhash) {
    const { blockhash } = await engine.getConnectionEphem().getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
  }

  if (!transaction.feePayer) {
    transaction.feePayer = authority;
  }

  if (isFreeGame) {
    try {
      const payload = {
        sessionWallet: sessionWallet.toBase58(),
        parentWallet: parentKey.toBase58(),
        authority: sessionWallet.toBase58(), // authority.toBase58(),
        worldId: gameInfo.worldId.toString(),
        buyIn,
        endpoint,
        playerName,
        timestamp: new Date().toISOString(),
        nonce: `${Date.now()}-${Math.random()}`,
      };

      const payloadJson = JSON.stringify(payload);
      const payloadBytes = new TextEncoder().encode(payloadJson);
      const payloadSignature = Buffer.from(nacl.sign.detached(payloadBytes, engine.getSessionKey().secretKey)).toString(
        "base64",
      );
      // partial sign with session key
      transaction.partialSign(engine.getSessionKey());

      const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
      const transactionBase64 = Buffer.from(serializedTransaction).toString("base64");

      const { data } = await axios.post(`${API_URL}api/v1/join-free-game`, {
        transaction: transactionBase64,
        payload: payloadJson,
        payload_signature: payloadSignature,
        endpoint,
      });

      const txSignature = data?.signature || data?.txSignature || null;
      return {
        success: true,
        transactionSignature: txSignature,
        response: data,
      };
    } catch (error) {
      console.error("Error submitting free game join request:", error);
      let message = "Unable to join free game right now.";
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error ?? error.message;
        if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
          message = errorMessage;
        }
      }
      return { success: false, error: message, message: "error" };
    }
  }

  try {
    const joinSignature = await engine.processSessionEphemTransaction("join:" + playerName, transaction);
    console.log(`join signature: ${joinSignature}`);
    return { success: true, transactionSignature: joinSignature };
  } catch (error) {
    console.log("Error buying in:", error);
    return { success: false, error: `Error buying in: ${(error as Error)?.message}`, message: "error" };
  }
}
