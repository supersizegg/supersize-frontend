import * as React from "react";
import { Keypair, PublicKey, Transaction, Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets, useSendTransaction } from "@privy-io/react-auth/solana";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { deriveKeypairFromPublicKey } from "@utils/helper";
const SESSION_LOCAL_STORAGE = "magicblock-session-key";
const SESSION_MIN_LAMPORTS = 0.02 * 1_000_000_000;
const SESSION_MAX_LAMPORTS = 0.05 * 1_000_000_000;

const MagicBlockEngineContext = React.createContext<MagicBlockEngine>({} as MagicBlockEngine);

export function useMagicBlockEngine(): MagicBlockEngine {
  return React.useContext(MagicBlockEngineContext);
}

export function MagicBlockEngineProvider({ children }: { children: React.ReactNode }) {
  return <MagicBlockEngineProviderInner>{children}</MagicBlockEngineProviderInner>;
}

function MagicBlockEngineProviderInner({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();

  const walletContext = React.useMemo(() => {
    const pk = wallets && wallets[0] ? new PublicKey(wallets[0].address) : null;
    return {
      connected: ready && authenticated && !!pk,
      connecting: !ready,
      publicKey: pk,
      sendTransaction: async (tx: Transaction, connection: Connection) => {
        const receipt = await sendTransaction({ transaction: tx, connection });
        return receipt.signature;
      },
      wallets: pk ? [{ adapter: { name: "Privy", icon: "" } }] : [],
      select: () => login(),
      disconnect: logout,
    } as unknown as WalletContextState;
  }, [ready, authenticated, wallets, sendTransaction, login, logout]);

  const engine = React.useMemo(() => {
    let sessionKey = deriveKeypairFromPublicKey(new PublicKey("11111111111111111111111111111111"));
    /*
    const sessionKeyString = localStorage.getItem(SESSION_LOCAL_STORAGE);
    if (sessionKeyString) {
      sessionKey = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(sessionKeyString)));
    } else {
      sessionKey = Keypair.generate();
      localStorage.setItem(SESSION_LOCAL_STORAGE, JSON.stringify(Array.from(sessionKey.secretKey)));
    }
    */
    if (walletContext.publicKey) {
      sessionKey = deriveKeypairFromPublicKey(walletContext.publicKey);
    }

    return new MagicBlockEngine(walletContext, sessionKey, {
      minLamports: SESSION_MIN_LAMPORTS,
      maxLamports: SESSION_MAX_LAMPORTS,
    });
  }, [walletContext]);

  return <MagicBlockEngineContext.Provider value={engine}>{children}</MagicBlockEngineContext.Provider>;
}
