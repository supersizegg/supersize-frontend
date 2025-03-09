import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { ApplySystem, createDelegateInstruction, FindComponentPda } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, SYSTEM_BUY_IN_ID, COMPONENT_ANTEROOM_ID } from "./gamePrograms";

import { ActiveGame } from "@utils/types";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { anteroomFetchOnChain } from "./gameFetch";

type GameExecuteBuyInResult = {
  success: boolean;
  message?: string;
  transactionSignature?: string;
  error?: string;
};

export async function gameSystemBuyIn(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  newplayerEntityPda: PublicKey,
  anteEntityPda: PublicKey,
  buyIn: number,
  playerName: string,
): Promise<GameExecuteBuyInResult> {
  const playerComponentPda = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: newplayerEntityPda,
  });

  const anteComponentPda = FindComponentPda({
    componentId: COMPONENT_ANTEROOM_ID,
    entity: anteEntityPda,
  });

  const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);

  let vault_token_account = new PublicKey(0);
  let mint_of_token_being_sent = new PublicKey(0);
  let payout_token_account = new PublicKey(0);
  const combinedTx = new Transaction();
  console.log("anteParsedData", anteParsedData);
  if (anteParsedData && anteParsedData.vaultTokenAccount && anteParsedData.token) {
    vault_token_account = anteParsedData.vaultTokenAccount;
    mint_of_token_being_sent = anteParsedData.token;
    const usertokenAccountInfo = await getAssociatedTokenAddress(mint_of_token_being_sent, engine.getWalletPayer());
    payout_token_account = usertokenAccountInfo;
  }
  const extraAccounts = [
    {
      pubkey: vault_token_account,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: engine.getSessionPayer(),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: payout_token_account,
      isWritable: true,
      isSigner: false,
    },

    {
      pubkey: engine.getWalletPayer(),
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
  ];

  const applyBuyInSystem = await ApplySystem({
    authority: engine.getWalletPayer(),
    world: gameInfo.worldPda,
    entities: [
      {
        entity: newplayerEntityPda,
        components: [{ componentId: COMPONENT_PLAYER_ID }],
      },
      {
        entity: anteEntityPda,
        components: [{ componentId: COMPONENT_ANTEROOM_ID }],
      },
    ],
    systemId: SYSTEM_BUY_IN_ID,
    extraAccounts: extraAccounts,
    args: {
      name: playerName,
    },
  });
  combinedTx.add(applyBuyInSystem.transaction);

  try {
    const playerdelegateIx = createDelegateInstruction({
      entity: newplayerEntityPda,
      account: playerComponentPda,
      ownerProgram: COMPONENT_PLAYER_ID,
      payer: engine.getWalletPayer(),
    });
    combinedTx.add(playerdelegateIx);
    const playerdelsignature = await engine.processWalletTransaction("playerdelegate", combinedTx);
    console.log(`buy in signature: ${playerdelsignature}`);
    return { success: true, transactionSignature: playerdelsignature };
  } catch (error) {
    console.log("Error buying in:", error);
    return { success: false, error: `Error buying in: ${(error as Error)?.message}`, message: "error" };
  }
}
