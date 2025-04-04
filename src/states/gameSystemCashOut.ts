import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { ApplySystem, createUndelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_ANTEROOM_ID, SYSTEM_CASH_OUT_ID, COMPONENT_MAP_ID } from "./gamePrograms";
import { ActiveGame } from "@utils/types";
import { createCloseAccountInstruction, getAssociatedTokenAddress, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { anteroomFetchOnChain } from "./gameFetch";

type GameExecuteCashOutResult = {
  success: boolean;
  message?: string;
  transactionSignature?: string;
  error?: string;
};

export async function gameSystemCashOut(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  anteroomEntity: PublicKey,
  currentPlayerEntity: PublicKey,
  isDevnet: boolean,
): Promise<GameExecuteCashOutResult> {
  const mapseed = "origin";
  const mapEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: Buffer.from(mapseed),
  });

  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: mapEntityPda,
  });

  const myplayerComponent = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: currentPlayerEntity,
  });

  const undelegateIx = createUndelegateInstruction({
    payer: engine.getSessionPayer(),
    delegatedAccount: myplayerComponent,
    componentPda: COMPONENT_PLAYER_ID,
  });

  try {
    const undeltx = new anchor.web3.Transaction().add(undelegateIx);
    undeltx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
    undeltx.feePayer = engine.getSessionPayer();
    await engine.processSessionEphemTransaction(
      "undelPlayer:" + myplayerComponent.toString(),
      undeltx,
    );
  } catch (error) {
    console.log("error", error);
  }

  const anteComponentPda = FindComponentPda({
    componentId: COMPONENT_ANTEROOM_ID,
    entity: anteroomEntity,
  });
  const anteAccount = await anteroomFetchOnChain(engine, anteComponentPda);

  if (anteAccount) {
    const vault_token_account = anteAccount.vaultTokenAccount;
    const mint_of_token_being_sent = anteAccount.token;
    const owner_token_account = anteAccount.gamemasterTokenAccount;
    if (!mint_of_token_being_sent || !owner_token_account || !vault_token_account) {
      throw new Error("Cash out failed");
    }
    const supersize_token_account = await getAssociatedTokenAddress(
      mint_of_token_being_sent,
      new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB"),
    );
       
    let payer = engine.getWalletPayer();
    if(!isDevnet){
      payer = engine.getWalletPayer();
    }else{
      payer = engine.getSessionPayer();
    }
    let usertokenAccountInfo = await getAssociatedTokenAddress(mint_of_token_being_sent, payer);
    console.log("usertokenAccountInfo", usertokenAccountInfo.toString() , payer.toString(), mint_of_token_being_sent.toString());
    let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
      vault_program_id,
    );

    const extraAccounts = [
      {
        pubkey: vault_token_account,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: usertokenAccountInfo,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: owner_token_account,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: supersize_token_account,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: tokenAccountOwnerPda,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: payer,
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

    const applyCashOutSystem = await ApplySystem({
      authority: payer,
      world: gameInfo.worldPda,
      entities: [
        {
          entity: currentPlayerEntity,
          components: [{ componentId: COMPONENT_PLAYER_ID }],
        },
        {
          entity: anteroomEntity,
          components: [{ componentId: COMPONENT_ANTEROOM_ID }],
        },
      ],
      systemId: SYSTEM_CASH_OUT_ID,
      args: {
        referred: false,
      },
      extraAccounts: extraAccounts,
    });

    const cashouttx = new anchor.web3.Transaction().add(applyCashOutSystem.transaction);
    
    if (mint_of_token_being_sent.equals(NATIVE_MINT)) {
      cashouttx.add(
        createCloseAccountInstruction(
          usertokenAccountInfo,
          payer,
          payer
        )
      )
    } 

    try {
      let cashoutsig = isDevnet ? await engine.processSessionChainTransaction("playercashout", cashouttx) : await engine.processWalletTransaction("playercashout", cashouttx);
      if (!cashoutsig) {
        return { success: false, error: `Error cashing out`, message: "error" };
      }else{
        return { success: true, transactionSignature: cashoutsig };
      }
    } catch (error) {
      console.log("Error cashing out:", error);
      return { success: false, error: `Error cashing out: ${(error as Error)?.message}`, message: "error" };
    }
  }else{
    return { success: false, error: `Error cashing out`, message: "error" };
  }
}
