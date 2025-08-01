import * as React from "react";
import { Keypair, PublicKey, Transaction, Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { usePrivy, useUser, WalletWithMetadata } from "@privy-io/react-auth";
import { useSolanaWallets, useSendTransaction } from "@privy-io/react-auth/solana";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { deriveKeypairFromPublicKey } from "@utils/helper";
import { useMemo } from "react";
import { endpoints, NETWORK } from "@utils/constants";
const SESSION_LOCAL_STORAGE = "magicblock-session-key";
const SESSION_MIN_LAMPORTS = 0.02 * 1_000_000_000;
const SESSION_MAX_LAMPORTS = 0.05 * 1_000_000_000;

interface IMagicBlockEngineContext {
  engine: MagicBlockEngine;
  setEndpointEphemRpc: (endpoint: string) => void;
}

const MagicBlockEngineContext = React.createContext<IMagicBlockEngineContext>({} as IMagicBlockEngineContext);

export function useMagicBlockEngine(): IMagicBlockEngineContext {
  return React.useContext(MagicBlockEngineContext);
}

export function MagicBlockEngineProvider({ children }: { children: React.ReactNode }) {
  return <MagicBlockEngineProviderInner>{children}</MagicBlockEngineProviderInner>;
}

function MagicBlockEngineProviderInner({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { user } = useUser();
  const { wallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();

  const walletTypeRef = React.useRef("embedded");

  const pklist = useMemo<WalletWithMetadata[]>(
    () =>
      (user?.linkedAccounts.filter(
        (account) => account.type === "wallet" && account.chainType === "solana",
      ) as WalletWithMetadata[]) ?? [],
    [user],
  );

  const [endpointEphemRpc, setEndpointEphemRpc] = React.useState<string>(endpoints[NETWORK][2]);

  const walletContext = React.useMemo(() => {
    if (wallets && wallets[0]) {
      console.log("walletContext", wallets, wallets[0].address);
      console.log("user", user);
    }
    //const pk = wallets && wallets[0] ? new PublicKey(wallets[0].address) : null;

    const pk_item = pklist && pklist[0] ? pklist[0] : null;
    let pk: PublicKey | null = null;
    let pk_type = "external";
    if (pk_item) {
      pk = new PublicKey(pk_item.address);
      if (pk && pk_item.connectorType == "embedded") {
        pk_type = "embedded";
      }
    }
    const pk_item_1 = pklist && pklist[1] ? pklist[1] : null;
    let pk_1: PublicKey | null = null;
    if (pk_item_1 && pk_item_1.connectorType == "embedded") {
      pk_1 = new PublicKey(pk_item_1.address);
    }
    //walletTypeRef.current = pk_type;
    console.log(pklist, pk_type, pk?.toString());
    return {
      connected: ready && authenticated && !!pk,
      connecting: !ready,
      publicKey: pk,
      embeddedWallet: pk_1,
      sendTransaction: async (tx: Transaction, connection: Connection) => {
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = pk ? pk : new PublicKey(wallets[0].address);
        let receipt;
        if (pk_type == "embedded") {
          const tx_receipt = await sendTransaction({ transaction: tx, connection });
          receipt = tx_receipt.signature;
          console.log(receipt);
        } else {
          const wallet = wallets.find((wallet) => wallet.address === pk?.toString());
          if (wallet) {
            const tx_receipt = await wallet.sendTransaction!(tx, connection);
            receipt = tx_receipt;
          }
        }
        return receipt;
      },
      wallets: pk ? [{ adapter: { name: "Privy", icon: "" } }] : [],
      select: () =>
        login({
          walletChainType: "solana-only",
          disableSignup: false,
        }),
      disconnect: logout,
    } as unknown as WalletContextState;
  }, [ready, authenticated, wallets, sendTransaction, login, logout]);

  const engine = React.useMemo(() => {
    let sessionKey = deriveKeypairFromPublicKey(new PublicKey("11111111111111111111111111111111"));

    const sessionKeyString = localStorage.getItem(SESSION_LOCAL_STORAGE);
    if (sessionKeyString) {
      sessionKey = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(sessionKeyString)));
    } else {
      sessionKey = Keypair.generate();
      localStorage.setItem(SESSION_LOCAL_STORAGE, JSON.stringify(Array.from(sessionKey.secretKey)));
    }
    /*
    if (walletContext.publicKey) {
      sessionKey = deriveKeypairFromPublicKey(walletContext.publicKey);
    }
    */

    return new MagicBlockEngine(
      walletContext,
      sessionKey,
      {
        minLamports: SESSION_MIN_LAMPORTS,
        maxLamports: SESSION_MAX_LAMPORTS,
      },
      walletTypeRef.current,
      endpointEphemRpc,
    );
  }, [walletContext, endpointEphemRpc]);

  const contextValue = React.useMemo(
    () => ({
      engine,
      setEndpointEphemRpc,
    }),
    [engine, setEndpointEphemRpc],
  );

  return <MagicBlockEngineContext.Provider value={contextValue}>{children}</MagicBlockEngineContext.Provider>;
}
