import * as React from "react";
import { Keypair, PublicKey, Transaction, Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { usePrivy, useUser, WalletWithMetadata } from "@privy-io/react-auth";
import { useSolanaWallets, useSendTransaction } from "@privy-io/react-auth/solana";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { deriveKeypairFromPublicKey, pingEndpoints, getRegion } from "@utils/helper";
import { useMemo } from "react";
import { endpoints, NETWORK } from "@utils/constants";
import { SupersizeVaultClient } from "./SupersizeVaultClient";

const SESSION_LOCAL_STORAGE = "magicblock-session-key";
const SESSION_MIN_LAMPORTS = 0.02 * 1_000_000_000;
const SESSION_MAX_LAMPORTS = 0.05 * 1_000_000_000;

interface IMagicBlockEngineContext {
  engine: MagicBlockEngine;
  setEndpointEphemRpc: (endpoint: string) => void;
  preferredRegion: string;
  endpointReady: boolean;
  invalidateEndpointCache: () => void;
}

const MagicBlockEngineContext = React.createContext<IMagicBlockEngineContext>({} as IMagicBlockEngineContext);

export function useMagicBlockEngine(): IMagicBlockEngineContext {
  return React.useContext(MagicBlockEngineContext);
}

export function MagicBlockEngineProvider({ children }: { children: React.ReactNode }) {
  return <MagicBlockEngineProviderInner>{children}</MagicBlockEngineProviderInner>;
}

type EphemCache = {
  endpoint: string;
  region: string;
  ts: number;
};

const cacheKeyFor = (walletKey: string | null) => `ephem-endpoint:${NETWORK}:${walletKey ?? "guest"}`;

const readCache = (key: string): EphemCache | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (key: string, data: EphemCache) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* */
  }
};

const clearCache = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* */
  }
};

function MagicBlockEngineProviderInner({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { user } = useUser();
  const { wallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();

  const walletTypeRef = React.useRef<"external" | "embedded">("external");

  const [preferredRegion, setPreferredRegion] = React.useState<string>("");
  const [endpointEphemRpc, setEndpointEphemRpc] = React.useState<string>(endpoints[NETWORK][0]);
  const [endpointReady, setEndpointReady] = React.useState<boolean>(false);

  const pklist = useMemo<WalletWithMetadata[]>(
    () =>
      (user?.linkedAccounts.filter(
        (account) => account.type === "wallet" && account.chainType === "solana",
      ) as WalletWithMetadata[]) ?? [],
    [user],
  );

  const walletContext = React.useMemo(() => {
    const pk_item = pklist && pklist[0] ? pklist[0] : null;

    let pk: PublicKey | null = null;
    let pk_type: "external" | "embedded" = "external";

    if (pk_item) {
      pk = new PublicKey(pk_item.address);
      if (pk_item.connectorType === "embedded") pk_type = "embedded";
    }

    walletTypeRef.current = pk_type;

    return {
      connected: ready && authenticated && !!pk,
      connecting: !ready,
      publicKey: pk,
      sendTransaction: async (tx: Transaction, connection: Connection) => {
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = pk ?? new PublicKey(wallets[0]?.address!);

        if (pk_type === "embedded") {
          const res = await sendTransaction({ transaction: tx, connection });
          return res.signature;
        } else {
          const wallet = wallets.find((w) => w.address === pk?.toString());
          if (!wallet?.sendTransaction) throw new Error("No wallet adapter found");
          return wallet.sendTransaction(tx, connection);
        }
      },
      wallets: pk ? [{ adapter: { name: "Privy", icon: "" } }] : [],
      select: () =>
        login({
          walletChainType: "solana-only",
          disableSignup: false,
        }),
      disconnect: logout,
    } as unknown as WalletContextState;
  }, [ready, authenticated, pklist, wallets, sendTransaction, login, logout]);

  const engine = React.useMemo(() => {
    let sessionKey = deriveKeypairFromPublicKey(new PublicKey("11111111111111111111111111111111"));

    const sessionKeyString = localStorage.getItem(SESSION_LOCAL_STORAGE);
    if (sessionKeyString) {
      sessionKey = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(sessionKeyString)));
    } else {
      sessionKey = Keypair.generate();
      localStorage.setItem(SESSION_LOCAL_STORAGE, JSON.stringify(Array.from(sessionKey.secretKey)));
    }

    return new MagicBlockEngine(
      walletContext,
      sessionKey,
      { minLamports: SESSION_MIN_LAMPORTS, maxLamports: SESSION_MAX_LAMPORTS },
      walletTypeRef.current,
      endpointEphemRpc,
    );
  }, [walletContext, endpointEphemRpc]);

  const walletKey = React.useMemo(() => {
    try {
      return walletContext.connected && walletContext.publicKey ? walletContext.publicKey.toBase58() : null;
    } catch {
      return null;
    }
  }, [walletContext.connected, walletContext.publicKey]);

  const invalidateEndpointCache = React.useCallback(() => {
    clearCache(cacheKeyFor(walletKey));
  }, [walletKey]);

  const resolvingIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!ready) return;

    const reqId = ++resolvingIdRef.current;
    let cancelled = false;

    setEndpointReady(false);

    const key = cacheKeyFor(walletKey);
    const cached = readCache(key);

    if (cached?.endpoint) {
      setEndpointEphemRpc(cached.endpoint);
      setPreferredRegion(cached.region || getRegion(cached.endpoint));
    }

    (async () => {
      try {
        if (walletKey) {
          const client = new SupersizeVaultClient(engine);
          const delegated = await client.findDelegatedEphemEndpoint();

          if (!cancelled && reqId === resolvingIdRef.current && delegated) {
            setEndpointEphemRpc(delegated.endpoint);
            setPreferredRegion(delegated.region);
            writeCache(key, { endpoint: delegated.endpoint, region: delegated.region, ts: Date.now() });
            setEndpointReady(true);
            return;
          }
        }

        const { lowestPingEndpoint } = await pingEndpoints();
        if (!cancelled && reqId === resolvingIdRef.current && lowestPingEndpoint) {
          setEndpointEphemRpc(lowestPingEndpoint.endpoint);
          setPreferredRegion(lowestPingEndpoint.region);
          writeCache(key, {
            endpoint: lowestPingEndpoint.endpoint,
            region: lowestPingEndpoint.region,
            ts: Date.now(),
          });
        }

        if (!cancelled && reqId === resolvingIdRef.current) {
          setEndpointReady(true);
        }
      } catch (e) {
        console.error("Endpoint resolution failed:", e);
        if (!cancelled && reqId === resolvingIdRef.current) {
          setEndpointReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, walletKey]);

  const contextValue = React.useMemo(
    () => ({
      engine,
      setEndpointEphemRpc,
      preferredRegion,
      endpointReady,
      invalidateEndpointCache,
    }),
    [engine, setEndpointEphemRpc, preferredRegion, endpointReady, invalidateEndpointCache],
  );

  return <MagicBlockEngineContext.Provider value={contextValue}>{children}</MagicBlockEngineContext.Provider>;
}
