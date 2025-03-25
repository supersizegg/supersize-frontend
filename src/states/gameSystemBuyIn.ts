import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { ApplySystem, createDelegateInstruction, FindComponentPda } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, SYSTEM_BUY_IN_ID, COMPONENT_ANTEROOM_ID } from "./gamePrograms";

import { ActiveGame } from "@utils/types";
import { createWrappedNativeAccount, getAssociatedTokenAddress, NATIVE_MINT, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createSyncNativeInstruction } from "@solana/spl-token";
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
  isDevnet: boolean
): Promise<GameExecuteBuyInResult> {
  let payer = engine.getWalletPayer();

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
    if(!isDevnet){
      payer = engine.getWalletPayer();
    }else{
      payer = engine.getSessionPayer();
    }
    let usertokenAccountInfo =  await getAssociatedTokenAddress(mint_of_token_being_sent, payer); 
    if (mint_of_token_being_sent.equals(NATIVE_MINT)) {
      const usertokenAccountData = await engine.getChainAccountInfo(usertokenAccountInfo);
      if(!usertokenAccountData) {
          combinedTx.add(
            createAssociatedTokenAccountInstruction(
                payer,
                usertokenAccountInfo,
                payer,
                NATIVE_MINT
          )
        );
      }
      combinedTx.add(
        SystemProgram.transfer({
            fromPubkey: payer,
            toPubkey: usertokenAccountInfo,
            lamports: buyIn,
        }),
        createSyncNativeInstruction(usertokenAccountInfo)
    );
    }
    payout_token_account = usertokenAccountInfo;
  }
  const extraAccounts = isDevnet ? [
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
      pubkey: engine.getSessionPayer(),
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
  ] : [
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
    authority: payer,
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
      payer: payer,
    });
    combinedTx.add(playerdelegateIx);
    const playerdelsignature = isDevnet ? await engine.processSessionChainTransaction("playerdelegate", combinedTx) : await engine.processWalletTransaction("playerdelegate", combinedTx);
    console.log(`buy in signature: ${playerdelsignature}`);
    return { success: true, transactionSignature: playerdelsignature };

  } catch (error) {
    console.log("Error buying in:", error);
    return { success: false, error: `Error buying in: ${(error as Error)?.message}`, message: "error" };
  }
}
