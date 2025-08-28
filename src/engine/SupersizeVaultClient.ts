import { BN, Idl, Program } from "@coral-xyz/anchor";
import axios from "axios";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import supersizeVaultIdl from "../backend/target/idl/supersize_vault.json";
import { SupersizeVault } from "../backend/target/types/supersize_vault";
import { VALIDATOR_MAP, NETWORK, cachedTokenMetadata } from "../utils/constants";
import { getRegion } from "../utils/helper";

const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

interface DelegationStatusResult {
  isDelegated: boolean;
  delegationRecord?: {
    authority: string;
    owner: string;
    delegationSlot: number;
    lamports: number;
  };
}

interface RouterResponse {
  jsonrpc: "2.0";
  id: number;
  result: DelegationStatusResult;
}

export interface AccountSyncState {
  status: "uninitialized" | "needs_sync" | "ready_to_play";
  issues: string[];
  gameWalletExists: boolean;
  balancePdaExists: boolean;
  isGwDelegated: boolean;
  isBalanceDelegated: boolean;
  delegationMismatch: boolean;
  sessionKeyMismatch: boolean;
}

export class SupersizeVaultClient {
  private readonly engine: any;
  private readonly program: Program<SupersizeVault>;
  private readonly programEphem: Program<SupersizeVault>;
  private readonly wallet: PublicKey | null;
  private readonly mainChainConnection: Connection;
  private readonly ephemConnection: Connection;
  private readonly routerUrl: string;

  constructor(engine: any) {
    this.engine = engine;
    this.program = engine.getProgramOnChain(supersizeVaultIdl as Idl);
    this.programEphem = engine.getProgramOnEphem(supersizeVaultIdl as Idl);
    this.wallet = engine.getWalletPayer();
    this.mainChainConnection = engine.getConnectionChain();
    this.ephemConnection = engine.getConnectionEphem();
    this.routerUrl = NETWORK === "mainnet" ? "https://router.magicblock.app" : "https://devnet-router.magicblock.app";
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

  async getGameWallet(): Promise<PublicKey | undefined> {
    const walletPda = this.gameWalletPda();
    const walletAcc = await this.program.account.gameWallet.fetchNullable(walletPda);
    return walletAcc?.wallet;
  }

  async isBalanceDelegated(mint: PublicKey): Promise<boolean> {
    if (!this.wallet) return false;
    const balancePda = this.userBalancePda(this.wallet, mint);
    const accountInfo = await this.mainChainConnection.getAccountInfo(balancePda);
    return accountInfo?.owner.equals(DELEGATION_PROGRAM_ID) ?? false;
  }

  async isWalletDelegated(): Promise<boolean> {
    if (!this.wallet) return false;
    const gwPda = this.gameWalletPda(this.wallet);
    const gwInfo = await this.mainChainConnection.getAccountInfo(gwPda);
    return gwInfo?.owner.equals(DELEGATION_PROGRAM_ID) ?? false;
  }

  async initializeVault(mint: PublicKey) {
    if (!this.wallet) throw new Error("Wallet not connected to initialize vault.");

    const initializeTx = new Transaction();
    initializeTx.add(
      await this.program.methods
        .initialize()
        .accounts({ mintOfToken: mint, signer: this.wallet, tokenProgram: TOKEN_2022_PROGRAM_ID })
        .instruction(),
    );
    await this.engine.processWalletTransaction("InitializeVault", initializeTx);
  }

  async resyncAndDelegateAll() {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
    const targetValidator = new PublicKey(ephemIdentity);
    const primaryMint = new PublicKey(
      NETWORK === "mainnet" ? Object.keys(cachedTokenMetadata)[0] : Object.keys(cachedTokenMetadata)[1],
    );

    const syncState = await this.getSyncState();

    const transaction = new Transaction();
    let requiresSessionSign = false;

    if (!syncState.gameWalletExists || syncState.sessionKeyMismatch) {
      console.log("Creating/resetting game wallet PDA");
      if (syncState.isGwDelegated) {
        console.log("Undelegating game wallet before reset...");
        await this.undelegateWallet();
      }

      transaction.add(
        await this.program.methods
          .newGameWallet()
          .accounts({ user: this.wallet, gameKey: this.engine.getSessionPayer() })
          .instruction(),
      );
      requiresSessionSign = true;
    }

    if (!syncState.isGwDelegated || syncState.delegationMismatch || syncState.sessionKeyMismatch) {
      console.log("Delegating Game Wallet");
      transaction.add(
        await this.program.methods.delegateWallet(targetValidator).accounts({ payer: this.wallet }).instruction(),
      );
    }

    if (!syncState.balancePdaExists) {
      console.log("Creating and delegating new Balance PDA");
      transaction.add(
        await this.program.methods
          .newUserBalance()
          .accounts({ user: this.wallet, mintOfToken: primaryMint })
          .instruction(),
      );
      transaction.add(
        await this.program.methods
          .delegateUser(targetValidator)
          .accounts({ payer: this.wallet, mintOfToken: primaryMint })
          .instruction(),
      );
    } else if (!syncState.isBalanceDelegated || syncState.delegationMismatch) {
      console.log("Synchronizing balance PDA delegation");
      if (syncState.isBalanceDelegated) {
        await this.undelegateBalance(primaryMint);
      }
      transaction.add(
        await this.program.methods
          .delegateUser(targetValidator)
          .accounts({ payer: this.wallet, mintOfToken: primaryMint })
          .instruction(),
      );
    }

    if (transaction.instructions.length === 0) {
      console.log("No vault synchronization needed");
      return;
    }

    if (requiresSessionSign) {
      console.log("Transaction requires session key signature");
      transaction.feePayer = this.engine.getWalletPayer();
      transaction.recentBlockhash = (await this.mainChainConnection.getLatestBlockhash()).blockhash;
      transaction.partialSign(this.engine.getSessionKey());
    }

    console.log("Sending final synchronization transaction...");
    await this.engine.processWalletTransaction("SynchronizeVault", transaction);

    try {
      await this.syncEphemeralBalance(primaryMint);
    } catch (err) {
      console.log("Ephemeral syncBalTx after resync failed:", err);
    }
  }

  async getSyncState(): Promise<AccountSyncState> {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const gwPda = this.gameWalletPda();
    const primaryMint = new PublicKey(
      NETWORK === "mainnet" ? Object.keys(cachedTokenMetadata)[0] : Object.keys(cachedTokenMetadata)[1],
    );
    const balancePda = this.userBalancePda(this.wallet, primaryMint);

    const [gwAccountInfo, balanceAccountInfo, gwDelegationRes, balanceDelegationRes, storedSessionKey] =
      await Promise.all([
        this.mainChainConnection.getAccountInfo(gwPda),
        this.mainChainConnection.getAccountInfo(balancePda),
        axios.post<RouterResponse>(this.routerUrl, {
          jsonrpc: "2.0",
          id: 1,
          method: "getDelegationStatus",
          params: [gwPda.toBase58()],
        }),
        axios.post<RouterResponse>(this.routerUrl, {
          jsonrpc: "2.0",
          id: 1,
          method: "getDelegationStatus",
          params: [balancePda.toBase58()],
        }),
        this.getGameWallet(),
      ]);

    const state: AccountSyncState = {
      status: "uninitialized",
      issues: [],
      gameWalletExists: !!gwAccountInfo,
      balancePdaExists: !!balanceAccountInfo,
      isGwDelegated: false,
      isBalanceDelegated: false,
      delegationMismatch: false,
      sessionKeyMismatch: false,
    };

    if (!state.gameWalletExists) {
      state.issues.push("Vault has not been activated.");
      return state;
    }

    const currentSessionKey = this.engine.getSessionPayer();
    if (storedSessionKey?.toString() !== currentSessionKey.toString()) {
      state.sessionKeyMismatch = true;
      state.issues.push("Session key is out of sync.");
    }

    const gwDelegation = gwDelegationRes.data.result;
    const balanceDelegation = balanceDelegationRes.data.result;
    state.isGwDelegated = gwDelegation.isDelegated;
    state.isBalanceDelegated = balanceDelegation.isDelegated;

    if (state.isGwDelegated && state.isBalanceDelegated) {
      if (gwDelegation.delegationRecord?.authority !== balanceDelegation.delegationRecord?.authority) {
        state.delegationMismatch = true;
        state.issues.push("Accounts are delegated to different servers.");
      }
    } else if (!state.isGwDelegated || !state.isBalanceDelegated) {
      if (state.balancePdaExists) {
        state.issues.push("One or more accounts are not delegated.");
      }
    }

    if (state.issues.length > 0) {
      state.status = "needs_sync";
    } else if (!state.balancePdaExists) {
      // edge case for new mints: GW exists and is delegated, but user has never deposited
      state.status = "needs_sync";
      state.issues.push("Balance account needs to be created and delegated.");
    } else {
      state.status = "ready_to_play";
    }

    return state;
  }

  async ensureDelegatedForJoin(mint: PublicKey): Promise<void> {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const [walletDelegated, userDelegated] = await Promise.all([
      this.isWalletDelegated(),
      this.isBalanceDelegated(mint),
    ]);
    if (!walletDelegated || !userDelegated) {
      const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
      const validator = new PublicKey(ephemIdentity);

      const tx = new Transaction();

      if (!walletDelegated) {
        console.log("Delegating GameWallet PDA...");
        tx.add(await this.program.methods.delegateWallet(validator).accounts({ payer: this.wallet }).instruction());
      }
      if (!userDelegated) {
        console.log("Delegating Balance PDA...");
        tx.add(
          await this.program.methods
            .delegateUser(validator)
            .accounts({ payer: this.wallet, mintOfToken: mint })
            .instruction(),
        );
      }

      if (tx.instructions.length > 0) {
        await this.engine.processWalletTransaction("DelegateAccounts", tx);
      }
    }
  }

  async gameTranfer(mint: PublicKey, uiAmount: number, mapComponentPda: PublicKey, deposit: boolean = true) {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const mintInfo = await getMint(this.mainChainConnection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    const decimals = mintInfo.decimals;
    const tokens = new BN(Math.round(uiAmount * 10 ** decimals));
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet, true, TOKEN_2022_PROGRAM_ID);
    console.log(uiAmount, tokens, decimals);
    let transferIx: TransactionInstruction | null = null;
    if (deposit) {
      transferIx = await this.program.methods
        .depositToGame(tokens)
        .accounts({
          mintOfToken: mint,
          senderTokenAccount: userAta,
          map: mapComponentPda,
          payer: this.wallet,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();
    } else {
      transferIx = await this.program.methods
        .withdrawFromGame(tokens)
        .accounts({
          mintOfToken: mint,
          senderTokenAccount: userAta,
          map: mapComponentPda,
          payer: this.wallet,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();
    }

    if (!transferIx) {
      throw new Error("Transfer instruction not found.");
    }

    const balancePda = this.mapBalancePda(mapComponentPda, mint);
    const accountInfo = await this.mainChainConnection.getAccountInfo(balancePda);
    const currentlyDelegated = accountInfo?.owner.equals(DELEGATION_PROGRAM_ID) ?? false;

    if (currentlyDelegated) {
      try {
        const undelegateTx = new Transaction();
        undelegateTx.add(
          await this.program.methods
            .undelegateGame()
            .accounts({ payer: this.engine.getSessionPayer(), mintOfToken: mint, map: mapComponentPda })
            .instruction(),
        );

        const signers = [this.engine.getSessionKey()];
        const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
        await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
      } catch (error) {
        console.log("Error in undelegateGame:", error);
      }
      console.log("undelegateGame");

      const transaction = new Transaction();
      const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
      const validator = new PublicKey(ephemIdentity);
      const delegateGameIx = await this.program.methods
        .delegateGame(validator)
        .accounts({
          payer: this.wallet,
          mintOfToken: mint,
          map: mapComponentPda,
        })
        .instruction();
      console.log("delegateGame");
      return await this.engine.processWalletTransaction("Deposit", transaction.add(transferIx).add(delegateGameIx));
    } else {
      const ephemIdentity = await this.ephemConnection.getSlotLeader();
      const validator = new PublicKey(ephemIdentity);
      const delegateGameIx = await this.program.methods
        .delegateGame(validator)
        .accounts({
          payer: this.wallet,
          mintOfToken: mint,
          map: mapComponentPda,
        })
        .instruction();
      console.log("delegateGame");
      return await this.engine.processWalletTransaction(
        "Deposit",
        new Transaction().add(transferIx).add(delegateGameIx),
      );
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

    if (await this.isWalletDelegated()) {
      undelegateTx.add(await this.program.methods.undelegateWallet(this.wallet).accounts({}).instruction());
    }

    const signers = [this.engine.getSessionKey()];
    const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
    await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
  }

  private async undelegateWallet() {
    if (!this.wallet) throw new Error("Wallet not connected.");
    const undelegateTx = new Transaction();

    if (await this.isWalletDelegated()) {
      undelegateTx.add(await this.program.methods.undelegateWallet(this.wallet).accounts({}).instruction());
    }

    const signers = [this.engine.getSessionKey()];
    const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
    await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
  }

  private async undelegateBalance(mint: PublicKey) {
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

  public async executeDeposit(mint: PublicKey, uiAmount: number) {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const { lamports } = await this.uiAmountToLamports(mint, uiAmount);
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet, true, TOKEN_2022_PROGRAM_ID);

    const isDelegated = await this.isBalanceDelegated(mint);
    if (isDelegated) {
      console.log("Deposit requires undelegation of Balance PDA. Preparing account...");
      await this.undelegateBalance(mint);
    }

    const transaction = new Transaction().add(
      await this.program.methods
        .deposit(lamports)
        .accounts({
          mintOfToken: mint,
          senderTokenAccount: userAta,
          payer: this.wallet,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction(),
    );

    const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
    const validator = new PublicKey(ephemIdentity);
    transaction.add(
      await this.program.methods
        .delegateUser(validator)
        .accounts({ payer: this.wallet, mintOfToken: mint })
        .instruction(),
    );

    await this.engine.processWalletTransaction("Deposit", transaction);

    try {
      await this.syncEphemeralBalance(mint);
    } catch (err) {
      console.log("Ephemeral syncBalTx failed:", err);
    }
  }

  public async executeWithdraw(mint: PublicKey, uiAmount: number, payoutWallet: PublicKey | null = null) {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const recipient = payoutWallet || this.wallet;
    if (!recipient) {
      throw new Error("Withdrawal recipient could not be determined.");
    }

    const userAta = getAssociatedTokenAddressSync(mint, recipient, true, TOKEN_2022_PROGRAM_ID);
    const userAtaInfo = await this.mainChainConnection.getAccountInfo(userAta);
    const ataExists = userAtaInfo !== null;

    const isDelegated = await this.isBalanceDelegated(mint);

    if (isDelegated) {
      console.log("Withdrawal requires undelegation of Balance PDA. Preparing account...");
      await this.undelegateBalance(mint);
    }

    const { lamports } = await this.uiAmountToLamports(mint, uiAmount);

    const withdrawTx = new Transaction();

    if (!ataExists) {
      console.log(`Destination ATA ${userAta.toBase58()} does not exist. Adding creation instruction.`);

      withdrawTx.add(
        createAssociatedTokenAccountInstruction(this.wallet, userAta, recipient, mint, TOKEN_2022_PROGRAM_ID),
      );
    }

    withdrawTx.add(
      await this.program.methods
        .withdraw(lamports)
        .accounts({
          // @ts-expect-error - todo: need to table check types
          balance: this.userBalancePda(this.wallet, mint),
          mintOfToken: mint,
          senderTokenAccount: userAta,
          payer: this.wallet,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction(),
    );

    console.log("Adding re-delegation instruction to the transaction.");
    const ephemIdentity = await this.engine.getConnectionEphem().getSlotLeader();
    const validator = new PublicKey(ephemIdentity);
    withdrawTx.add(
      await this.program.methods
        .delegateUser(validator)
        .accounts({ payer: this.wallet, mintOfToken: mint })
        .instruction(),
    );

    await this.engine.processWalletTransaction("Withdraw", withdrawTx);

    try {
      await this.syncEphemeralBalance(mint);
    } catch (err) {
      console.log("Ephemeral syncBalTx after withdraw failed:", err);
    }
  }

  async setupGameWallet(mapComponentPda: PublicKey, mint: PublicKey, validator: PublicKey) {
    if (!this.wallet) {
      throw new Error("Wallet not connected. Cannot set up a new game wallet.");
    }

    const balancePda = this.mapBalancePda(mapComponentPda, mint);
    console.log(`Checking game setup for balance PDA: ${balancePda.toBase58()}`);

    const balanceInfo = await this.mainChainConnection.getAccountInfo(balancePda);
    const setupTx = new Transaction();

    if (!balanceInfo) {
      console.log("Game balance account not found. Creating and delegating...");

      const newGameIx = await this.program.methods
        .newGame()
        .accounts({
          map: mapComponentPda,
          mintOfToken: mint,
          user: this.engine.getSessionPayer(),
        })
        .instruction();
      setupTx.add(newGameIx);

      //const ephemIdentity = await this.ephemConnection.getSlotLeader();
      //const validator = new PublicKey(ephemIdentity);
      const delegateGameIx = await this.program.methods
        .delegateGame(validator)
        .accounts({
          payer: this.engine.getSessionPayer(),
          mintOfToken: mint,
          map: mapComponentPda,
        })
        .instruction();
      setupTx.add(delegateGameIx);
    } else if (!balanceInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
      console.log("Game balance account found but not delegated. Delegating now...");

      //const ephemIdentity = await this.ephemConnection.getSlotLeader();
      //const validator = new PublicKey(ephemIdentity);
      const delegateGameIx = await this.program.methods
        .delegateGame(validator)
        .accounts({
          payer: this.engine.getSessionPayer(),
          mintOfToken: mint,
          map: mapComponentPda,
        })
        .instruction();
      setupTx.add(delegateGameIx);
    } else {
      console.log("Game is already set up and delegated.");
      return;
    }

    if (setupTx.instructions.length > 0) {
      await this.engine.processSessionChainTransaction("SetupGameWallet", setupTx);
      console.log("Game setup transaction successful.");
    }
  }

  private async syncEphemeralBalance(mint: PublicKey) {
    if (!this.wallet) return;
    const checkBalancePda = this.userBalancePda(this.wallet, mint);
    const checkTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.engine.getSessionPayer(),
        toPubkey: checkBalancePda,
        lamports: 0,
      }),
    );
    try {
      await this.engine.processSessionEphemTransaction("SyncBalance", checkTx);
    } catch (err) {
      console.log("Ephemeral balance sync transaction failed:", err);
    }
  }

  async getGameBalance(mapComponentPda: PublicKey, mint: PublicKey): Promise<number | "wrong_server"> {
    if (!this.wallet) return 0;

    const balPda = this.mapBalancePda(mapComponentPda, mint);
    console.log("Fetching balance for PDA:", balPda.toBase58());
    const currentProgramEphem = this.engine.getProgramOnSpecificEphem(
      supersizeVaultIdl as Idl,
      this.engine.getEndpointEphemRpc(),
    );
    const acc = await this.program.account.balance.fetchNullable(balPda);
    if (!acc) return 0;
    const balanceAcc = await currentProgramEphem.account.balance.fetchNullable(balPda);
    if (!balanceAcc) return "wrong_server";
    const conn = this.program.provider.connection;
    const { decimals } = await getMint(conn, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    let finalnum = Number(balanceAcc.balance) / 10 ** decimals;
    console.log("finalnum", mint.toString(), finalnum);
    return finalnum; //Number(acc.balance) / 10 ** decimals;
  }

  public async getVaultBalance(mint: PublicKey): Promise<number> {
    if (!this.wallet) return 0;

    const balPda = this.userBalancePda(this.wallet, mint);
    let balanceAcc: { balance: BN } | null = null;

    try {
      const response = await axios.post<RouterResponse>(this.routerUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "getDelegationStatus",
        params: [balPda.toBase58()],
      });

      const delegationStatus = response.data.result;

      if (delegationStatus.isDelegated && delegationStatus.delegationRecord) {
        const validator = delegationStatus.delegationRecord.authority;
        // @ts-expect-error - TODO: fix indexing issue
        const correctEndpoint = VALIDATOR_MAP[NETWORK][validator];

        if (correctEndpoint) {
          const ephemProgram = this.engine.getProgramOnSpecificEphem(supersizeVaultIdl as Idl, correctEndpoint);
          balanceAcc = await ephemProgram.account.balance.fetchNullable(balPda);
        } else {
          console.error(`Balance PDA is delegated to an unknown validator: ${validator}`);
          return 0;
        }
      } else {
        // Fetch on solana mainnet if not delegated
        balanceAcc = await this.program.account.balance.fetchNullable(balPda);
      }
    } catch (error) {
      console.error("Router query for balance failed, falling back to mainnet check:", error);
      balanceAcc = await this.program.account.balance.fetchNullable(balPda);
    }

    if (!balanceAcc) {
      return 0;
    }

    const { decimals } = await getMint(this.mainChainConnection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    return Number(balanceAcc.balance) / 10 ** decimals;
  }

  async findMyEphemEndpoint(
    setEndpointEphemRpc: (endpoint: string) => void,
    setPreferredRegion: (region: string) => void,
  ): Promise<void> {
    if (!this.wallet) {
      console.log("Wallet not connected, cannot find ephemeral endpoint");
      return;
    }

    const gwPda = this.gameWalletPda();
    console.log(`Querying router for delegation status of: ${gwPda.toBase58()}`);

    try {
      const response = await axios.post<RouterResponse>(this.routerUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "getDelegationStatus",
        params: [gwPda.toBase58()],
      });

      const { result } = response.data;

      if (result.isDelegated && result.delegationRecord) {
        const validatorAuthority = result.delegationRecord.authority;
        // @ts-expect-error - TODO: fix indexing issue
        const correctEndpoint = VALIDATOR_MAP[NETWORK][validatorAuthority];

        if (correctEndpoint) {
          console.log(`Found delegation to validator ${validatorAuthority}. Correct endpoint is ${correctEndpoint}`);
          const region = getRegion(correctEndpoint);
          setPreferredRegion(region);
          setEndpointEphemRpc(correctEndpoint);
        } else {
          console.warn(`Account is delegated to an unknown validator: ${validatorAuthority}`);
        }
      } else {
        console.log("Account is not delegated to any rollup");
      }
    } catch (error) {
      console.error("Failed to query Magic Block Router for delegation status:", error);
    }
  }

  private async uiAmountToLamports(mint: PublicKey, uiAmount: number) {
    const mintInfo = await getMint(this.mainChainConnection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    const factor = 10 ** mintInfo.decimals;
    const lamports = new BN(Math.round(uiAmount * factor));
    return { lamports, factor };
  }
}
