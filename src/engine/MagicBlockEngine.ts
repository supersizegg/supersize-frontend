import { Idl, Program, AnchorProvider } from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { AccountInfo, Commitment, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { WalletName } from "@solana/wallet-adapter-base";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import * as anchor from "@coral-xyz/anchor";
import { NETWORK, RPC_CONNECTION } from "@utils/constants";
import { log, warn } from "../utils/logger";
import {
  createAssociatedTokenAccountInstruction as ixCreateATA,
  createTransferInstruction as ixTokenTransfer,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";

const ENDPOINT_CHAIN_RPC = RPC_CONNECTION[NETWORK];
const ENDPOINT_CHAIN_WS = ENDPOINT_CHAIN_RPC.replace("http", "ws");
const connectionChain = new Connection(ENDPOINT_CHAIN_RPC, {
  wsEndpoint: ENDPOINT_CHAIN_WS,
});

const ENDPOINT_CHAIN_RPC_DEVNET = RPC_CONNECTION["devnet"];
const ENDPOINT_CHAIN_WS_DEVNET = ENDPOINT_CHAIN_RPC_DEVNET.replace("http", "ws");
const connectionChainDevnet = new Connection(ENDPOINT_CHAIN_RPC_DEVNET, {
  wsEndpoint: ENDPOINT_CHAIN_WS_DEVNET,
});

interface SessionConfig {
  minLamports: number;
  maxLamports: number;
}

interface WalletAdapter {
  name: string;
  icon: string;
}

export class MagicBlockEngine {
  private walletContext: WalletContextState;
  private walletType: string;
  private sessionKey: Keypair;
  private sessionConfig: SessionConfig;
  private endpointEphemRpc: string;
  private connectionEphem: Connection;
  private provider: AnchorProvider;
  private providerEphemeralRollup: AnchorProvider;

  constructor(
    walletContext: WalletContextState,
    sessionKey: Keypair,
    sessionConfig: SessionConfig,
    walletType = "external",
    endpointEphemRpc: string,
  ) {
    this.walletContext = walletContext;
    this.walletType = walletType;
    this.sessionKey = sessionKey;
    this.sessionConfig = sessionConfig;
    this.endpointEphemRpc = endpointEphemRpc;
    this.connectionEphem = new Connection(this.endpointEphemRpc, {
      wsEndpoint: this.endpointEphemRpc.replace("http", "ws"),
    });
    this.provider = new AnchorProvider(connectionChain, new NodeWallet(this.sessionKey), {
      preflightCommitment: "processed",
    });

    anchor.setProvider(this.provider);

    this.providerEphemeralRollup = new AnchorProvider(this.connectionEphem, new NodeWallet(this.sessionKey), {
      preflightCommitment: "processed",
    });
  }

  public setChain(network: string): void {
    let NEW_ENDPOINT_CHAIN_RPC: string = RPC_CONNECTION[NETWORK];
    if (network == "mainnet" || network == "devnet") {
      NEW_ENDPOINT_CHAIN_RPC = RPC_CONNECTION[network];
    }
    const newConnectionChain = new Connection(NEW_ENDPOINT_CHAIN_RPC, {
      wsEndpoint: NEW_ENDPOINT_CHAIN_RPC.replace("http", "ws"),
    });
    this.provider = new AnchorProvider(newConnectionChain, new NodeWallet(this.sessionKey), {
      preflightCommitment: "processed",
    });
  }

  public setTempEndpointEphemRpc(endpoint: string): void {
    console.log("setEndpointEphemRpc", endpoint);
    this.endpointEphemRpc = endpoint;
    this.connectionEphem = new Connection(endpoint, {
      wsEndpoint: endpoint.replace("http", "ws"),
    });
    this.providerEphemeralRollup = new AnchorProvider(this.connectionEphem, new NodeWallet(this.sessionKey), {
      preflightCommitment: "processed",
    });
  }

  public getEndpointEphemRpc(): string {
    return this.endpointEphemRpc;
  }

  getProgramOnChain<T extends Idl>(idl: object): Program<T> {
    return new Program<T>(idl as T, this.provider);
  }
  getProgramOnSpecificChain<T extends Idl>(idl: object, thisNework: string): Program<T> {
    let NEW_ENDPOINT_CHAIN_RPC: string = RPC_CONNECTION[NETWORK];
    if (thisNework == "mainnet" || thisNework == "devnet") {
      NEW_ENDPOINT_CHAIN_RPC = RPC_CONNECTION[thisNework];
    }
    const thisConnection = new Connection(NEW_ENDPOINT_CHAIN_RPC, {
      wsEndpoint: NEW_ENDPOINT_CHAIN_RPC.replace("http", "ws"),
    });
    const thisProvider = new AnchorProvider(thisConnection, new NodeWallet(this.sessionKey), {
      preflightCommitment: "processed",
    });
    return new Program<T>(idl as T, thisProvider);
  }
  getProgramOnEphem<T extends Idl>(idl: object): Program<T> {
    return new Program<T>(idl as T, this.providerEphemeralRollup);
  }
  getProgramOnSpecificEphem<T extends Idl>(idl: object, endpoint: string): Program<T> {
    let thisConnection: Connection = this.connectionEphem;
    try {
      thisConnection = new Connection(endpoint, {
        wsEndpoint: endpoint.replace("http", "ws"),
      });
    } catch (error) {
      console.error("Error getting program on specific ephem", error);
    }
    const thisProvider = new AnchorProvider(thisConnection, new NodeWallet(this.sessionKey), {
      preflightCommitment: "processed",
    });
    return new Program<T>(idl as T, thisProvider);
  }

  getConnectionChain(): Connection {
    return connectionChain;
  }
  getConnectionChainDevnet(): Connection {
    return connectionChainDevnet;
  }
  getConnectionEphem(): Connection {
    return this.connectionEphem;
  }

  getWalletConnected() {
    return this.walletContext.connected;
  }
  getWalletConnecting() {
    return this.walletContext.connecting;
  }

  getWalletType(): string {
    return this.walletType;
  }

  getWalletPayer(): PublicKey {
    if (!this.walletContext.publicKey) {
      throw new Error("Wallet public key is not available");
    }
    return this.walletContext.publicKey;
  }

  getSessionPayer(): PublicKey {
    return this.sessionKey.publicKey;
  }

  getSessionKey(): Keypair {
    return this.sessionKey;
  }

  getProviderEphemeralRollup(): AnchorProvider {
    return this.providerEphemeralRollup;
  }

  async processWalletTransaction(name: string, transaction: Transaction): Promise<string> {
    console.log(name, "sending");
    const signature = await this.walletContext.sendTransaction(transaction, this.provider.connection);
    console.log("signature", signature);
    await this.waitSignatureConfirmation(name, signature, this.provider.connection, "confirmed");
    return signature;
  }

  async processWalletEphemTransaction(name: string, transaction: Transaction): Promise<string> {
    log(name, "sending");
    const signature = await this.walletContext.sendTransaction(transaction, this.connectionEphem);
    await this.waitSignatureConfirmation(name, signature, this.connectionEphem, "confirmed");
    return signature;
  }

  async processSessionChainTransaction(name: string, transaction: Transaction): Promise<string> {
    log(name, "sending");
    const signature = await this.provider.connection.sendTransaction(transaction, [this.sessionKey], {
      skipPreflight: true,
    });
    console.log("signature", signature);
    await this.waitSignatureConfirmation(name, signature, this.provider.connection, "confirmed");
    return signature;
  }

  async processSessionEphemTransaction(name: string, transaction: Transaction): Promise<string> {
    // transaction.compileMessage;
    const signature = await this.connectionEphem.sendTransaction(transaction, [this.sessionKey], {
      skipPreflight: true,
    });
    //console.log("signature", signature);
    await this.waitSignatureConfirmation(name, signature, this.connectionEphem, "confirmed", 1000);
    return signature;
  }

  async processSessionEphemTransactionNoConfirm(name: string, transaction: Transaction): Promise<string> {
    // transaction.compileMessage;
    const signature = await this.connectionEphem.sendTransaction(transaction, [this.sessionKey], {
      skipPreflight: true,
    });
    //console.log("signature", signature);
    return signature;
  }

  async processSessionEphemTransactionHard(
    name: string,
    transaction: Transaction,
    connection: Connection,
  ): Promise<string> {
    //log(name, "sending");
    // transaction.compileMessage;
    const signature = await connection.sendTransaction(transaction, [this.sessionKey], {
      skipPreflight: true,
      preflightCommitment: "processed",
    });
    await this.waitSignatureConfirmation(name, signature, connection, "confirmed", 1000, true);
    return signature;
  }

  async waitSignatureConfirmation(
    name: string,
    signature: string,
    connection: Connection,
    commitment: Commitment,
    timeoutMs = 60000,
    doFallbackCheck: boolean = false,
  ): Promise<void> {
    //log(name, "sent", signature);

    return new Promise((resolve, reject) => {
      let timeoutHandle: ReturnType<typeof setTimeout>;
      let done = false;

      if (!signature) {
        reject(new Error("No signature provided"));
        return;
      }

      // const origWarn = console.warn;
      // Override to no-op or filter
      console.warn = () => {};

      const subscriptionId = connection.onSignature(
        signature,
        (result) => {
          if (done) return;
          done = true;
          clearTimeout(timeoutHandle);
          try {
            connection.removeSignatureListener(subscriptionId);
          } catch (error) {
            //
          }
          //log(name, commitment, signature, result.err);
          if (result.err) {
            //this.debugError(name, signature, connection);
            reject(new Error(JSON.stringify(result.err)));
          } else {
            resolve();
          }
        },
        commitment,
      );

      timeoutHandle = setTimeout(() => {
        if (done) return;
        done = true;
        try {
          connection.removeSignatureListener(subscriptionId);
        } catch (error) {
          //
        }
        if (doFallbackCheck) {
          doSingleFallbackCheck();
        } else {
          reject(new Error(`Timeout waiting for transaction ${signature} confirmation`));
        }
      }, timeoutMs);

      const doSingleFallbackCheck = async () => {
        try {
          const resp = await connection.getSignatureStatuses([signature]);
          const statusInfo = resp && resp.value && resp.value[0];
          if (statusInfo) {
            const { confirmationStatus, err } = statusInfo;
            log(name, `fallback check: confirmationStatus=${confirmationStatus}`, `err=${err}`);
            if (err) {
              this.debugError(name, signature, connection);
              reject(new Error(`Transaction ${signature} failed on-chain: ${JSON.stringify(err)}`));
              return;
            }
            log(name, `fallback: found status with err null, resolving without checking exact confirmation level`);
            resolve();
            return;
          } else {
            log(name, `fallback check: no status info found`);
            reject(new Error(`Transaction ${signature} not found on-chain in fallback check`));
            return;
          }
        } catch (pollErr) {
          console.warn(`${name}: error during fallback getSignatureStatuses`, pollErr);
          reject(new Error(`Error during fallback status check for ${signature}: ${pollErr}`));
        }
      };
    });
  }

  async debugError(name: string, signature: string, connection: Connection) {
    const transaction = await connection.getParsedTransaction(signature);
    log("debugError", name, signature, transaction);
  }

  async getSessionFundingMissingLamports() {
    const accountInfo = await this.provider.connection.getAccountInfo(this.getSessionPayer());
    const currentLamports = accountInfo?.lamports ?? 0;
    if (currentLamports < this.sessionConfig.minLamports) {
      return this.sessionConfig.maxLamports - currentLamports;
    }
    return 0;
  }

  async fundSessionFromAirdrop() {
    const missingLamports = await this.getSessionFundingMissingLamports();
    if (missingLamports > 0) {
      await this.provider.connection.requestAirdrop(this.sessionKey.publicKey, missingLamports);
    }
  }

  async fundSessionTokenFromWallet(mint: PublicKey, uiAmount: number) {
    const conn = this.provider.connection;
    const payer = this.getWalletPayer();
    const toAuth = this.getSessionPayer();

    const mintInfo = await getMint(conn, mint);
    const factor = 10 ** mintInfo.decimals;
    const lamports = BigInt(Math.round(uiAmount * factor));

    const fromAta = getAssociatedTokenAddressSync(mint, payer);
    const toAta = getAssociatedTokenAddressSync(mint, toAuth, true);

    const ixCreate = (await conn.getAccountInfo(toAta)) ? null : ixCreateATA(payer, toAta, toAuth, mint);

    const tx = new Transaction().add(...(ixCreate ? [ixCreate] : []), ixTokenTransfer(fromAta, toAta, payer, lamports));
    await this.processWalletTransaction("FundSessionToken", tx);
  }

  async defundSessionTokenBackToWallet(
    mint: PublicKey,
    uiAmount: number,
    recipient: PublicKey = this.getWalletPayer(),
  ) {
    const conn = this.provider.connection;
    const fromAuth = this.getSessionPayer();

    const mintInfo = await getMint(conn, mint);
    const factor = 10 ** mintInfo.decimals;
    const lamports = BigInt(Math.round(uiAmount * factor));

    const fromAta = getAssociatedTokenAddressSync(mint, fromAuth, true);
    const toAta = getAssociatedTokenAddressSync(mint, recipient);

    const ixCreate = (await conn.getAccountInfo(toAta)) ? null : ixCreateATA(fromAuth, toAta, recipient, mint);

    const tx = new Transaction().add(
      ...(ixCreate ? [ixCreate] : []),
      ixTokenTransfer(fromAta, toAta, fromAuth, lamports),
    );
    await this.processSessionChainTransaction("DefundSessionToken", tx);
  }

  getChainAccountInfo(address: PublicKey) {
    //return connectionChain.getAccountInfo(address);
    return this.provider.connection.getAccountInfo(address);
  }

  getChainAccountInfoProcessed(address: PublicKey, thisNework: string) {
    let NEW_ENDPOINT_CHAIN_RPC: string = RPC_CONNECTION[NETWORK];
    if (thisNework == "mainnet" || thisNework == "devnet") {
      NEW_ENDPOINT_CHAIN_RPC = RPC_CONNECTION[thisNework];
    }
    const thisConnection = new Connection(NEW_ENDPOINT_CHAIN_RPC, {
      wsEndpoint: NEW_ENDPOINT_CHAIN_RPC.replace("http", "ws"),
    });
    return thisConnection.getAccountInfo(address, "processed");
  }

  getEphemAccountInfo(address: PublicKey) {
    return this.connectionEphem.getAccountInfo(address);
  }

  subscribeToChainAccountInfo(address: PublicKey, onAccountChange: (accountInfo?: AccountInfo<Buffer>) => void) {
    return this.subscribeToAccountInfo(this.provider.connection, address, onAccountChange);
  }

  subscribeToEphemAccountInfo(address: PublicKey, onAccountChange: (accountInfo?: AccountInfo<Buffer>) => void) {
    return this.subscribeToAccountInfo(this.connectionEphem, address, onAccountChange);
  }

  subscribeToAccountInfo(
    connection: Connection,
    address: PublicKey,
    onAccountChange: (accountInfo?: AccountInfo<Buffer>) => void,
  ) {
    let ignoreFetch = false;
    connection.getAccountInfo(address).then(
      (accountInfo) => {
        if (ignoreFetch) {
          return;
        }
        if (!accountInfo) {
          warn("Account info is null");
          onAccountChange(undefined);
          return;
        }
        onAccountChange(accountInfo);
      },
      (error) => {
        log("Error fetching accountInfo", error);
        onAccountChange(undefined);
      },
    );
    const subscription = connection.onAccountChange(address, (accountInfo) => {
      ignoreFetch = true;
      onAccountChange(accountInfo);
    });
    return () => {
      ignoreFetch = true;
      connection.removeAccountChangeListener(subscription);
    };
  }

  listWalletAdapters(): WalletAdapter[] {
    return this.walletContext.wallets.map((wallet) => {
      return {
        name: wallet.adapter.name,
        icon: wallet.adapter.icon,
      };
    });
  }

  selectWalletAdapter(wallet: WalletAdapter | null) {
    if (wallet) {
      return this.walletContext.select(wallet.name as WalletName);
    } else {
      return this.walletContext.disconnect();
    }
  }

  getSessionMinLamports(): number {
    return this.sessionConfig.minLamports;
  }

  getSessionMaximalLamports(): number {
    return this.sessionConfig.maxLamports;
  }
}
