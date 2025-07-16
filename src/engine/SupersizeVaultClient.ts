import { BN, Idl, Program } from "@coral-xyz/anchor";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";

import supersizeVaultIdl from "../backend/target/idl/supersize_vault.json";
import { SupersizeVault } from "../backend/target/types/supersize_vault";
import { endpoints, NETWORK } from "../utils/constants";
import { getRegion } from "../utils/helper";

const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

export class SupersizeVaultClient {
  private readonly engine: any;
  private readonly program: Program<SupersizeVault>;
  private readonly programEphem: Program<SupersizeVault>;
  private readonly wallet: PublicKey | null;
  private readonly mainChainConnection: Connection;
  private readonly ephemConnection: Connection;

  constructor(engine: any) {
    this.engine = engine;
    this.program = engine.getProgramOnChain(supersizeVaultIdl as Idl);
    this.programEphem = engine.getProgramOnEphem(supersizeVaultIdl as Idl);
    this.wallet = engine.getWalletPayer();
    this.mainChainConnection = engine.getConnectionChain();
    this.ephemConnection = engine.getConnectionEphem();
  }

  gameWalletPda(user = this.wallet) {
    if (!user) throw new Error("Wallet not connected to get GameWallet PDA");
    return PublicKey.findProgramAddressSync([Buffer.from("game-wallet"), user.toBuffer()], this.program.programId)[0];
  }

  userBalancePda(user: PublicKey, mint: PublicKey) {
    return PublicKey.findProgramAddressSync([user.toBuffer(), mint.toBuffer()], this.program.programId)[0];
  }

  mapBalancePda(map: PublicKey, mint: PublicKey) {
    return PublicKey.findProgramAddressSync([map.toBuffer(), mint.toBuffer()], this.program.programId)[0];
  }

  tokenOwnerPda() {
    return PublicKey.findProgramAddressSync([Buffer.from("token_account_owner_pda")], this.program.programId)[0];
  }

  vaultTokenAta(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("super_token_vault"), mint.toBuffer()],
      this.program.programId,
    )[0];
  }

  async isDelegated(mint: PublicKey): Promise<boolean> {
    if (!this.wallet) return false;
    const balancePda = this.userBalancePda(this.wallet, mint);
    const accountInfo = await this.mainChainConnection.getAccountInfo(balancePda);
    return accountInfo?.owner.equals(DELEGATION_PROGRAM_ID) ?? false;
  }

  async setupUserAccounts(mint: PublicKey) {
    if (!this.wallet) throw new Error("Wallet not connected to set up accounts.");

    const setupTx = new Transaction();
    const gwPda = this.gameWalletPda();
    const balPda = this.userBalancePda(this.wallet, mint);

    const gwInfo = await this.mainChainConnection.getAccountInfo(gwPda);
    if (!gwInfo) {
      const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
      const validator = new PublicKey(ephemIdentity);

      console.log("Creating GameWallet PDA...");
      setupTx.add(
        await this.program.methods
          .newGameWallet()
          .accounts({ user: this.wallet, gameKey: this.engine.getSessionPayer() })
          .instruction(),
      );
      setupTx.add(await this.program.methods.delegateWallet(validator).accounts({ payer: this.wallet }).instruction());
    }

    const balInfo = await this.mainChainConnection.getAccountInfo(balPda);
    if (!balInfo) {
      console.log("Creating Balance PDA...");
      setupTx.add(
        await this.program.methods.newUserBalance().accounts({ user: this.wallet, mintOfToken: mint }).instruction(),
      );
    }

    if (setupTx.instructions.length > 0) {
      if (!gwInfo) {
        setupTx.feePayer = this.engine.getWalletPayer();
        setupTx.recentBlockhash = (await this.mainChainConnection.getLatestBlockhash()).blockhash;
        setupTx.partialSign(this.engine.getSessionKey());
      }
      await this.engine.processWalletTransaction("SetupUserAccounts", setupTx);
    } else {
      console.log("User accounts already exist.");
    }

    const checkTx = new Transaction();
    if(!gwInfo) {
      checkTx.add(
        SystemProgram.transfer({
          fromPubkey: this.engine.getSessionPayer(),
          toPubkey: gwPda,
          lamports: 0, // 1 SOL
        })
      )
    }
    if(!balInfo) {
      checkTx.add(
        SystemProgram.transfer({
          fromPubkey: this.engine.getSessionPayer(),
          toPubkey: balPda,
          lamports: 0, // 1 SOL
        })
      );
    }
    if(checkTx.instructions.length > 0) {
      await this.engine.processSessionEphemTransaction("testTx", checkTx);
    }
  }

  async delegateAll(mint: PublicKey) {
    if (!this.wallet) throw new Error("Wallet not connected to delegate.");

    const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
    const validator = new PublicKey(ephemIdentity);

    const tx = new Transaction()
      .add(await this.program.methods.delegateWallet(validator).accounts({ payer: this.wallet }).instruction())
      .add(
        await this.program.methods
          .delegateUser(validator)
          .accounts({ payer: this.wallet, mintOfToken: mint })
          .instruction(),
      );

    await this.engine.processWalletTransaction("DelegateAccounts", tx);
  }

  async deposit(mint: PublicKey, uiAmount: number) {
    if (!this.wallet) throw new Error("Wallet not connected.");

    await this.setupUserAccounts(mint);

    const { lamports } = await this.uiAmountToLamports(mint, uiAmount);
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet);
    const depositIx = await this.program.methods
      .deposit(lamports)
      .accounts({
        mintOfToken: mint,
        senderTokenAccount: userAta,
        payer: this.wallet,
      })
      .instruction();

    const currentlyDelegated = await this.isDelegated(mint);
    if (currentlyDelegated) {
      const transaction = new Transaction();
      await this.undelegateAll(mint);

      const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
      const validator = new PublicKey(ephemIdentity);

      const delegateIx = await this.program.methods
        .delegateUser(validator)
        .accounts({ payer: this.wallet, mintOfToken: mint })
        .instruction();

      await this.engine.processWalletTransaction("Deposit", transaction.add(depositIx).add(delegateIx));
    } else {
      const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
      const validator = new PublicKey(ephemIdentity);

      const delegateIx = await this.program.methods
        .delegateUser(validator)
        .accounts({ payer: this.wallet, mintOfToken: mint })
        .instruction();

      await this.engine.processWalletTransaction("Deposit", new Transaction().add(depositIx).add(delegateIx));
    }
  }

  private async undelegateAll(mint: PublicKey) {
    if (!this.wallet) throw new Error("Wallet not connected.");
    const undelegateTx = new Transaction();
    undelegateTx.add(
      await this.program.methods
        .undelegateUser(this.wallet)
        .accounts({ wallet: this.engine.getSessionPayer(), mintOfToken: mint })
        .instruction(),
    );

    const signers = [this.engine.getSessionKey()];
    const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
    await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
  }

  async withdraw(mint: PublicKey, uiAmount: number) {
    if (!this.wallet) throw new Error("Wallet not connected to withdraw.");

    const { lamports } = await this.uiAmountToLamports(mint, uiAmount);
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet);

    const currentlyDelegated = await this.isDelegated(mint);
    if (currentlyDelegated) {
      await this.undelegateAll(mint);
    }

    console.log("Signing withdrawal with main wallet...");
    const withdrawTx = new Transaction();
    // if (!userAtaInfo) {
    //   withdrawTx.add(ixCreateATA(this.wallet, userAta, this.wallet, mint));
    // }
    withdrawTx.add(
      await this.program.methods
        .withdraw(lamports)
        .accounts({
          // @ts-ignore
          balance: this.userBalancePda(this.wallet, mint),
          mintOfToken: mint,
          senderTokenAccount: userAta,
          payer: this.wallet,
        })
        .instruction(),
    );

    const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
    const validator = new PublicKey(ephemIdentity);

    withdrawTx.add(
      await this.program.methods
        .delegateUser(validator)
        .accounts({ payer: this.wallet, mintOfToken: mint })
        .instruction(),
    );

    await this.engine.processWalletTransaction("Withdraw", withdrawTx);
  }

  async getVaultBalance(mint: PublicKey): Promise<number | "wrong_server"> {
    if (!this.wallet) return 0;

    const balPda = this.userBalancePda(this.wallet, mint);
    console.log("Fetching balance for PDA:", balPda.toBase58());
    const acc = await this.program.account.balance.fetchNullable(balPda);
    if (!acc) return 0;
    const balanceAcc = await this.programEphem.account.balance.fetchNullable(
      balPda
    );
    if (!balanceAcc) return "wrong_server";
    const conn = this.program.provider.connection;
    const { decimals } = await getMint(conn, mint);
    let finalnum = Number(balanceAcc.balance) / 10 ** decimals;
    console.log("finalnum",finalnum);
    return Number(acc.balance) / 10 ** decimals;
  }

  async getGameWallet(): Promise<PublicKey | undefined> {
    const walletPda = this.gameWalletPda();
    const walletAcc = await this.program.account.gameWallet.fetchNullable(
      walletPda
    );
    return walletAcc?.wallet;
  }

  async getGameWalletEphem(endpoint: any): Promise<PublicKey | undefined> {
    const walletPda = this.gameWalletPda();
    const programSpecificEphem = this.engine.getProgramOnSpecificEphem(supersizeVaultIdl as Idl, endpoint);
    const walletAcc = await programSpecificEphem.account.gameWallet.fetchNullable(
      walletPda
    );
    return walletAcc?.wallet;
  }

  async findMyEphemEndpoint(setPreferredRegion: (region: string) => void) {
    await Promise.all(
      endpoints[NETWORK].map(async (endpoint) => {
        try {
          const gwPdaCheck = await this.getGameWalletEphem(endpoint);
          if (gwPdaCheck) {
            console.log("gwPdaCheck", gwPdaCheck.toString(), endpoint, getRegion(endpoint));
            setPreferredRegion(getRegion(endpoint));
            this.engine.setEndpointEphemRpc(endpoint);
          }
        } catch (error) {
          console.error("Error in findMyEphemEndpoint:", error);
        }
      })
    );
  }

  async newGameWallet() {
    if (!this.wallet) throw new Error("Wallet not connected to new game wallet.");
    
    const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
    const validator = new PublicKey(ephemIdentity);
    
    try {
      const undelegateTx = new Transaction()
      .add(await this.program.methods.undelegateWallet(this.wallet).accounts({}).instruction());
      const signers = [this.engine.getSessionKey()];
      const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
      await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
    } catch (error) {
      console.error("Error in newGameWallet:", error);
    }
    
    const tx = new Transaction();
    tx.add(
      await this.program.methods
        .newGameWallet()
        .accounts({ user: this.wallet, gameKey: this.engine.getSessionPayer() })
        .instruction(),
    );
    //await this.engine.processWalletTransaction("NewGameWallet", tx);

    //const redelegateTx = new Transaction();
    tx.add(await this.program.methods.delegateWallet(validator).accounts({ payer: this.wallet }).instruction());
    tx.feePayer = this.engine.getWalletPayer();
    tx.recentBlockhash = (await this.mainChainConnection.getLatestBlockhash()).blockhash;
    tx.partialSign(this.engine.getSessionKey());
    await this.engine.processWalletTransaction("DelegateAccounts", tx);

    const walletPda = this.gameWalletPda();
    const checkTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.engine.getSessionPayer(),
        toPubkey: walletPda,
        lamports: 0, // 1 SOL
      })
    );
    await this.engine.processSessionEphemTransaction("testTx", checkTx);
  }

  private async uiAmountToLamports(mint: PublicKey, uiAmount: number) {
    const mintInfo = await getMint(this.mainChainConnection, mint);
    const factor = 10 ** mintInfo.decimals;
    const lamports = new BN(Math.round(uiAmount * factor));
    return { lamports, factor };
  }
}
