import { useEffect, useState, useCallback, useRef } from 'react';
import { useMagicBlockEngine } from '../../engine/MagicBlockEngineProvider';
import { useBalance } from '../../context/BalanceContext';
import { SupersizeVaultClient } from '../../engine/SupersizeVaultClient';
import { PublicKey } from '@solana/web3.js';
import { NETWORK, API_URL, cachedTokenMetadata } from '../../utils/constants';
import axios from 'axios';

const TOKEN_MINT = Object.keys(cachedTokenMetadata).filter((mint) => cachedTokenMetadata[mint].network === NETWORK)[0];

export function BalanceManager() {
  const { engine } = useMagicBlockEngine();
  const { setP2PBalance, setF2PBalance, setIsBalanceLoading, refreshBalance } = useBalance();
  const [vaultClient, setVaultClient] = useState<SupersizeVaultClient | null>(null);

  const refreshRef = useRef(refreshBalance);

  const fetchBalances = useCallback(async () => {
    if (!engine) return;

    setIsBalanceLoading(true);

    const isConnected = engine.getWalletConnected();
    const sessionWallet = engine.getSessionPayer()?.toString();

    if (sessionWallet) {
      try {
        const response = await axios.get<{ balances: { f2p_earnings: number } }>(`${API_URL}/api/v1/players/stats?wallet=${sessionWallet}`);
        setF2PBalance(Number(response.data.balances.f2p_earnings));
      } catch (error) {
        setF2PBalance(0);
      }
    }

    if (isConnected && vaultClient) {
      try {
        const syncState = await vaultClient.getSyncState();
        if (syncState.status !== 'uninitialized') {
          const primaryMint = new PublicKey(TOKEN_MINT);
          const onChainBalance = await vaultClient.getVaultBalance(primaryMint);
          setP2PBalance(onChainBalance);
        } else {
          setP2PBalance(0);
        }
      } catch (e) {
        console.error("Failed to fetch on-chain P2P balance:", e);
        setP2PBalance(0);
      }
    } else {
        setP2PBalance(0);
    }

    setIsBalanceLoading(false);
  }, [engine, vaultClient, setP2PBalance, setF2PBalance, setIsBalanceLoading]);

  useEffect(() => {
    // @ts-expect-error - this is intentional
    refreshRef.current.refreshBalance = fetchBalances;
  }, [fetchBalances]);

  useEffect(() => {
    if (engine && engine.getWalletConnected()) {
      setVaultClient(new SupersizeVaultClient(engine));
    }
  }, [engine]);

  useEffect(() => {
    const isConnecting = engine.getWalletConnecting();
    if (!isConnecting) {
      fetchBalances();
    }
  }, [engine, engine.getWalletConnected(), engine.getWalletConnecting(), fetchBalances]);

  return null;
}