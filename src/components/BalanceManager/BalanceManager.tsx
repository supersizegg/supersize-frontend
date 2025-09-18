import { useEffect, useState, useCallback, useRef } from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { useBalance } from "../../context/BalanceContext";
import { SupersizeVaultClient } from "../../engine/SupersizeVaultClient";
import { PublicKey } from "@solana/web3.js";
import { NETWORK, API_URL, cachedTokenMetadata } from "../../utils/constants";
import axios from "axios";

interface SlimeBalanceResponse {
  wallet: string;
  exists: boolean;
  slime_balance: number;
  last_claimed_at: string | null;
  can_claim: boolean;
}

const TOKEN_MINT = Object.keys(cachedTokenMetadata).find((mint) => cachedTokenMetadata[mint].network === NETWORK);

export function BalanceManager() {
  const { engine } = useMagicBlockEngine();
  const { setP2PBalance, setF2PBalance, setIsBalanceLoading, registerRefreshBalance } = useBalance();

  const [vaultClient, setVaultClient] = useState<SupersizeVaultClient | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchBalances = useCallback(async (): Promise<void> => {
    if (!engine) return;

    const abortController = new AbortController();
    setIsBalanceLoading(true);

    try {
      const isConnected = engine.getWalletConnected();
      const sessionWallet = engine.getSessionPayer()?.toString();

      if (sessionWallet) {
        try {
          const { data } = await axios.get<SlimeBalanceResponse>(`${API_URL}/api/v1/slime`, {
            params: { wallet: sessionWallet },
            signal: abortController.signal,
          });
          if (mountedRef.current) {
            setF2PBalance(Number(data?.slime_balance ?? 0));
          }
        } catch {
          if (mountedRef.current) setF2PBalance(0);
        }
      } else {
        if (mountedRef.current) setF2PBalance(0);
      }

      if (isConnected && vaultClient && TOKEN_MINT) {
        try {
          const syncState = await vaultClient.getSyncState();
          if (syncState.status !== "uninitialized") {
            const primaryMint = new PublicKey(TOKEN_MINT);
            const onChainBalance = await vaultClient.getVaultBalance(primaryMint);
            if (mountedRef.current) setP2PBalance(onChainBalance);
          } else {
            if (mountedRef.current) setP2PBalance(0);
          }
        } catch (e) {
          console.error("Failed to fetch on-chain P2P balance:", e);
          if (mountedRef.current) setP2PBalance(0);
        }
      } else {
        if (mountedRef.current) setP2PBalance(0);
      }
    } finally {
      if (mountedRef.current) setIsBalanceLoading(false);
    }
  }, [engine, vaultClient, setP2PBalance, setF2PBalance, setIsBalanceLoading]);

  useEffect(() => {
    registerRefreshBalance(fetchBalances);
  }, [fetchBalances, registerRefreshBalance]);

  useEffect(() => {
    if (!engine) {
      setVaultClient(null);
      return;
    }
    if (engine.getWalletConnected()) {
      setVaultClient(new SupersizeVaultClient(engine));
    } else {
      setVaultClient(null);
    }
  }, [engine]);

  useEffect(() => {
    if (!engine) return;
    if (!engine.getWalletConnecting()) {
      fetchBalances();
    }
  }, [engine, fetchBalances]);

  return null;
}
