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
import { getRegion, getValidatorKeyForEndpoint } from "../utils/helper";

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
  profileExists: boolean;
  isProfileDelegated: boolean;
  sessionKeyMismatch: boolean;
}

export type DelegationFixResult = {
  ok: boolean;
  changed?: boolean;
  reason?: string;
  details?: AccountSyncState;
};

export class SupersizeVaultClient {
  private readonly engine: any;
  public readonly program: Program<SupersizeVault>;
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

  userProfilePda(user = this.wallet) {
    if (!user) throw new Error("Wallet not connected to get User Profile PDA");
    return PublicKey.findProgramAddressSync([Buffer.from("player-profile"), user.toBuffer()], this.program.programId)[0];
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
    const playerProfilePda = this.userProfilePda();
    const profileAcc = await this.program.account.playerProfile.fetchNullable(playerProfilePda);
    return profileAcc?.sessionAuthority;
  }

  async isProfileDelegated(): Promise<boolean> {
    if (!this.wallet) return false;
    const profilePda = this.userProfilePda();
    const profileInfo = await this.mainChainConnection.getAccountInfo(profilePda);
    return profileInfo?.owner.equals(DELEGATION_PROGRAM_ID) ?? false;
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
    //const ephemIdentity = getValidatorKeyForEndpoint("america");
    //if (!ephemIdentity) throw new Error("No validator found.");
    const targetValidator = new PublicKey(ephemIdentity);
    const primaryMint = new PublicKey(
      NETWORK === "mainnet" ? Object.keys(cachedTokenMetadata)[0] : Object.keys(cachedTokenMetadata)[1],
    );

    const syncState = await this.getSyncState();

    const transaction = new Transaction();
    let requiresSessionSign = false;

    if (!syncState.profileExists || syncState.sessionKeyMismatch) {
      console.log("Creating/resetting game wallet PDA");
      if (syncState.isProfileDelegated) {
        console.log("Undelegating game wallet before reset...");
        await this.undelegateProfile();
      }

      transaction.add(
        await this.program.methods
          .newUserBalance(new BN(0))
          .accounts({ sessionAuthority: this.engine.getSessionPayer(), user: this.wallet, signer: this.wallet })
          .instruction(),
      );
      requiresSessionSign = true;
    }

    if (!syncState.isProfileDelegated || syncState.sessionKeyMismatch) {
      console.log("Delegating Game Wallet");
      transaction.add(
        await this.program.methods.delegatePlayerProfile(targetValidator).accounts({ payer: this.wallet }).instruction(),
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
      await this.syncEphemeralBalance();
    } catch (err) {
      console.log("Ephemeral syncBalTx after resync failed:", err);
    }
  }

  async getSyncState(): Promise<AccountSyncState> {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const profilePda = this.userProfilePda();

    const [profileAccountInfo, profileDelegationRes, storedSessionKey] =
      await Promise.all([
        this.mainChainConnection.getAccountInfo(profilePda),
        axios.post<RouterResponse>(this.routerUrl, {
          jsonrpc: "2.0",
          id: 1,
          method: "getDelegationStatus",
          params: [profilePda.toBase58()],
        }),
        this.getGameWallet(),
      ]);

    const state: AccountSyncState = {
      status: "uninitialized",
      issues: [],
      profileExists: !!profileAccountInfo,
      isProfileDelegated: false,
      sessionKeyMismatch: false,
    };

    if (!state.profileExists) {
      state.issues.push("Vault has not been activated.");
      return state;
    }

    const currentSessionKey = this.engine.getSessionPayer();
    if (storedSessionKey?.toString() !== currentSessionKey.toString()) {
      state.sessionKeyMismatch = true;
      state.issues.push("Session key is out of sync.");
    }

    const profileDelegation = profileDelegationRes.data.result;
    state.isProfileDelegated = profileDelegation.isDelegated;

    if (!state.isProfileDelegated) {
      if (state.profileExists) {
        state.issues.push("One or more accounts are not delegated.");
      }
    }

    if (state.issues.length > 0) {
      state.status = "needs_sync";
    } else if (!state.profileExists) {
      // edge case for new mints: GW exists and is delegated, but user has never deposited
      state.status = "needs_sync";
      state.issues.push("Balance account needs to be created and delegated.");
    } else {
      state.status = "ready_to_play";
    }

    return state;
  }

  public async ensureConsistentDelegationForJoin(mint: PublicKey): Promise<DelegationFixResult> {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const state = await this.getSyncState();

    const needsFix =
      !state.profileExists ||
      state.sessionKeyMismatch ||
      !state.isProfileDelegated;

    if (!needsFix) {
      return { ok: true, changed: false, reason: "Already consistent", details: state };
    }

    const why = "Accounts not fully delegated or out of sync. Fixing…";

    await this.resyncAndDelegateAll();

    await this.syncEphemeralBalance();

    return { ok: true, changed: true, reason: why, details: state };
  }

  /* // replaced by ensureConsistentDelegationForJoin
  
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
  */

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
    if (await this.isProfileDelegated()) {
      undelegateTx.add(await this.program.methods.undelegatePlayerProfile(this.wallet).accounts({}).instruction());
    }

    const signers = [this.engine.getSessionKey()];
    const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
    await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
  }

  private async undelegateProfile() {
    if (!this.wallet) throw new Error("Wallet not connected.");
    const undelegateTx = new Transaction();

    if (await this.isProfileDelegated()) {
      undelegateTx.add(await this.program.methods.undelegatePlayerProfile(this.wallet).accounts({}).instruction());
    }

    const signers = [this.engine.getSessionKey()];
    const signature = await this.engine.getConnectionEphem().sendTransaction(undelegateTx, signers);
    await this.engine.getConnectionEphem().confirmTransaction(signature, "confirmed");
  }

  public async executeDeposit(mint: PublicKey, uiAmount: number) {
    if (!this.wallet) throw new Error("Wallet not connected.");

    const { lamports } = await this.uiAmountToLamports(mint, uiAmount);
    const userAta = getAssociatedTokenAddressSync(mint, this.wallet, true, TOKEN_2022_PROGRAM_ID);

    const isDelegated = await this.isProfileDelegated();
    if (isDelegated) {
      console.log("Deposit requires undelegation of Balance PDA. Preparing account...");
      await this.undelegateProfile();
    }

    const transaction = new Transaction().add(
      await this.program.methods
        .deposit(lamports)
        .accounts({
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
        .delegatePlayerProfile(validator)
        .accounts({ payer: this.wallet })
        .instruction(),
    );

    await this.engine.processWalletTransaction("Deposit", transaction);

    try {
      await this.syncEphemeralBalance();
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

    const isDelegated = await this.isProfileDelegated();

    if (isDelegated) {
      console.log("Withdrawal requires undelegation of Balance PDA. Preparing account...");
      await this.undelegateProfile();
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
        .delegatePlayerProfile(validator)
        .accounts({ payer: this.wallet })
        .instruction(),
    );

    await this.engine.processWalletTransaction("Withdraw", withdrawTx);

    try {
      await this.syncEphemeralBalance();
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

  private async syncEphemeralBalance() {
    if (!this.wallet) return;
    const checkBalancePda = this.userProfilePda();
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

    const profilePda = this.userProfilePda();
    let profileAcc: { 
      slimecoinBalance: BN; 
      totalWagered: BN; 
      totalEarnedP2p: BN; 
      playtimeSecondsP2p: BN; 
      p2pJoins: BN; 
      p2pExits: BN; 
      lastResetSlot: BN; 
      seasonId: number; 
      version: number; 
    } | null = null;

    try {
      const response = await axios.post<RouterResponse>(this.routerUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "getDelegationStatus",
        params: [profilePda.toBase58()],
      });

      const delegationStatus = response.data.result;

      if (delegationStatus.isDelegated && delegationStatus.delegationRecord) {
        const validator = delegationStatus.delegationRecord.authority;
        // @ts-expect-error - TODO: fix indexing issue
        const correctEndpoint = VALIDATOR_MAP[NETWORK][validator];

        if (correctEndpoint) {
          const ephemProgram = this.engine.getProgramOnSpecificEphem(supersizeVaultIdl as Idl, correctEndpoint);
          profileAcc = await ephemProgram.account.PlayerProfile.fetchNullable(profilePda);
        } else {
          console.error(`Balance PDA is delegated to an unknown validator: ${validator}`);
          return 0;
        }
      } else {
        // Fetch on solana mainnet if not delegated
        profileAcc = await this.program.account.playerProfile.fetchNullable(profilePda);
      }
    } catch (error) {
      console.error("Router query for balance failed, falling back to mainnet check:", error);
      profileAcc = await this.program.account.playerProfile.fetchNullable(profilePda);
    }

    if (!profileAcc) {
      return 0;
    }

    const { decimals } = await getMint(this.mainChainConnection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    return Number(profileAcc.slimecoinBalance) / 10 ** decimals;
  }

  async findMyEphemEndpoint(
    setEndpointEphemRpc: (endpoint: string) => void,
    setPreferredRegion: (region: string) => void,
  ): Promise<void> {
    if (!this.wallet) {
      console.log("Wallet not connected, cannot find ephemeral endpoint");
      return;
    }

    const gwPda = this.userProfilePda();
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

  async findDelegatedEphemEndpoint(): Promise<{ endpoint: string; region: string } | null> {
    if (!this.wallet) {
      return null;
    }

    const gwPda = this.userProfilePda();

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
        // @ts-expect-error
        const correctEndpoint = VALIDATOR_MAP[NETWORK][validatorAuthority];

        if (correctEndpoint) {
          const region = getRegion(correctEndpoint);
          return { endpoint: correctEndpoint, region: region };
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to query Magic Block Router for delegation status:", error);
      return null;
    }
  }

  private async uiAmountToLamports(mint: PublicKey, uiAmount: number) {
    const mintInfo = await getMint(this.mainChainConnection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    const factor = 10 ** mintInfo.decimals;
    const lamports = new BN(Math.round(uiAmount * factor));
    return { lamports, factor };
  }
}
