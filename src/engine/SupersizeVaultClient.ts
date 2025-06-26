// import * as anchor from "@coral-xyz/anchor";
import { BN, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";

import supersizeVaultIdl from "../backend/target/idl/supersize_vault.json";
import { SupersizeVault } from "../backend/target/types/supersize_vault";

export class SupersizeVaultClient {
  private readonly engine: any;
  private readonly program: Program<SupersizeVault>;
  private readonly wallet: PublicKey;

  constructor(engine: any) {
    this.engine = engine;
    this.program = engine.getProgramOnChain(supersizeVaultIdl as Idl);
    this.wallet = engine.getWalletPayer();
  }

  gameWalletPda(user = this.wallet) {
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

  async preparePDAs(mint: PublicKey) {
    const conn = this.program.provider.connection;
    const gwPda = this.gameWalletPda();
    const balPda = this.userBalancePda(this.wallet, mint);

    const ix: TransactionInstruction[] = [];

    if (!(await conn.getAccountInfo(gwPda))) {
      ix.push(
        await this.program.methods
          .newGameWallet()
          .accounts({
            gameKey: this.wallet,
            user: this.wallet,
          })
          .instruction(),
      );
    }

    if (!(await conn.getAccountInfo(balPda))) {
      ix.push(
        await this.program.methods
          .newUserBalance()
          .accounts({
            mintOfToken: mint,
            user: this.wallet,
          })
          .instruction(),
      );
    }

    ix.push(
      await this.program.methods
        .delegateWallet()
        .accounts({
          payer: this.wallet,
        })
        .instruction(),
    );

    ix.push(
      await this.program.methods
        .delegateUser()
        .accounts({
          payer: this.wallet,
          mintOfToken: mint,
        })
        .instruction(),
    );

    if (ix.length) {
      const tx = new Transaction();
      ix.forEach((i) => tx.add(i));
      await this.engine.processWalletTransaction("PreparePDAs", tx);
    }
  }

  async deposit({ mint, uiAmount }: { mint: PublicKey; uiAmount: number }) {
    if (!this.wallet) throw new Error("Wallet not connected");

    // BUG: This musts be a helper with additional checks
    // await this.preparePDAs(mint);

    const conn = this.program.provider.connection;
    const mintInfo = await getMint(conn, mint);
    const factor = 10 ** mintInfo.decimals;
    const lamports = BigInt(Math.round(uiAmount * factor));

    const gwPda = this.gameWalletPda();
    const balPda = this.userBalancePda(this.wallet, mint);
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet);
    const vaultAta = this.vaultTokenAta(mint);
    const tokenOwnerPda = this.tokenOwnerPda();

    const tx = new Transaction()
      .add(
        await this.program.methods
          .undelegateWallet()
          .accounts({
            payer: this.wallet,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .undelegateUser()
          .accounts({
            payer: this.wallet,
            mintOfToken: mint,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .deposit(new BN(lamports.toString()))
          .accounts({
            mintOfToken: mint,
            senderTokenAccount: userAta,
            payer: this.wallet,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .delegateWallet()
          .accounts({
            payer: this.wallet,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .delegateUser()
          .accounts({
            payer: this.wallet,
            mintOfToken: mint,
          })
          .instruction(),
      );

    await this.engine.processWalletTransaction("Deposit", tx);
  }

  async withdraw({ mint, uiAmount }: { mint: PublicKey; uiAmount: number }) {
    if (!this.wallet) throw new Error("Wallet not connected");

    const conn = this.program.provider.connection;
    const mintInfo = await getMint(conn, mint);
    const factor = 10 ** mintInfo.decimals;
    const lamports = BigInt(Math.round(uiAmount * factor));

    const gwPda = this.gameWalletPda();
    const balPda = this.userBalancePda(this.wallet, mint);
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet);
    const vaultAta = this.vaultTokenAta(mint);
    const tokenOwnerPda = this.tokenOwnerPda();

    const userAtaInfo = await conn.getAccountInfo(userAta);
    // const createUserAtaIx = userAtaInfo ? [] : [ixCreateATA(this.wallet, userAta, this.wallet, mint)];

    const tx = new Transaction()
      // .add(...createUserAtaIx)
      .add(
        await this.program.methods
          .undelegateWallet()
          .accounts({
            payer: this.wallet,
          })
          .instruction(),
        await this.program.methods
          .undelegateUser()
          .accounts({
            payer: this.wallet,
            mintOfToken: mint,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .withdraw(new BN(lamports.toString()))
          .accounts({
            mintOfToken: mint,
            senderTokenAccount: userAta,
            payer: this.wallet,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .delegateWallet()
          .accounts({
            payer: this.wallet,
          })
          .instruction(),
        await this.program.methods
          .delegateUser()
          .accounts({
            payer: this.wallet,
            mintOfToken: mint,
          })
          .instruction(),
      );

    await this.engine.processWalletTransaction("Withdraw", tx);
  }

  async getVaultBalance(mint: PublicKey): Promise<number> {
    const balPda = this.userBalancePda(this.wallet, mint);
    const acc = await this.program.account.balance.fetchNullable(balPda);
    if (!acc) return 0;

    const conn = this.program.provider.connection;
    const { decimals } = await getMint(conn, mint);
    return Number(acc.balance) / 10 ** decimals;
  }

  async endSession(mint: PublicKey) {
    const balPda = this.userBalancePda(this.wallet, mint);
    const gwPda = this.gameWalletPda();
    const undelegTx = new Transaction()
      .add(
        await this.program.methods
          .undelegateWallet()
          .accounts({
            payer: this.wallet,
          })
          .instruction(),
      )
      .add(
        await this.program.methods
          .undelegateUser()
          .accounts({
            payer: this.wallet,
            mintOfToken: mint,
          })
          .instruction(),
      );
    await this.engine.processWalletTransaction("Undelegate", undelegTx);
  }

  async checkBalance(mint: PublicKey, minUi: number) {
    const balPda = this.userBalancePda(this.wallet, mint);
    const acc = await this.program.account.balance.fetchNullable(balPda);
    if (!acc) return false;
    const conn = this.program.provider.connection;
    const { decimals } = await getMint(conn, mint);
    const uiVal = Number(acc.balance) / 10 ** decimals;
    return uiVal >= minUi;
  }
}
