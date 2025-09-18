import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { PublicKey, Connection } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { SupersizeVaultClient, AccountSyncState } from "../../engine/SupersizeVaultClient";
import { useBalance } from "../../context/BalanceContext";
import { cachedTokenMetadata, NETWORK, API_URL, VALIDATOR_MAP } from "../../utils/constants";
import TokenTransferModal from "../TokenTransferModal/TokenTransferModal";
import NotificationService from "@components/notification/NotificationService";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { formatBuyIn, getRegion } from "../../utils/helper";

import "./MenuSession.scss";

const SESSION_LOCAL_STORAGE = "magicblock-session-key";

export interface TokenBalance {
  mint: string;
  uiAmount: number;
}

interface PlayerStats {
  balances: {
    f2p_earnings: number;
    p2p_vault_balance: number;
  };
}

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

export function MenuSession() {
  const { engine } = useMagicBlockEngine();
  const { p2pBalance, refreshBalance } = useBalance();

  const [vaultClient, setVaultClient] = useState<SupersizeVaultClient | null>(null);
  const [tokenBalances] = useState<TokenBalance[]>([
    { mint: "B1aHFyLNzm1y24gkhASHiBU7LH6xXV2V785S4MrtY777", uiAmount: 0 },
  ]);
  const [unclaimedBalance, setUnclaimedBalance] = useState<number>(0);
  const [dialog, setDialog] = useState<null | {
    type: "deposit" | "withdraw";
    token: TokenBalance & { symbol: string; decimals: number };
  }>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<AccountSyncState | null>(null);
  const isMounted = useRef(false);

  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  const savePlayerAddress = async () => {
    const sessionWalletAddress = engine.getSessionPayer().toString();
    const parentWalletAddress = engine.getWalletPayer().toString();

    if (sessionWalletAddress && parentWalletAddress) {
      try {
        await fetch("https://supersize.miso.one/api/v1/players", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parent_wallet: parentWalletAddress,
          }),
        });
      } catch (error) {
        console.error("Failed to save player address:", error);
      }
    }
  };

  useEffect(() => {
    if (engine && engine.getWalletConnected()) {
      setVaultClient(new SupersizeVaultClient(engine));

      savePlayerAddress();
    } else {
      setVaultClient(null);
      if (!engine) setIsInitializing(true);
    }
  }, [engine]);

  const getDelegationInfo = useCallback(
    async (pda: PublicKey): Promise<string> => {
      if (!engine || !vaultClient) return "Client not initialized.";
      const routerUrl =
        NETWORK === "mainnet" ? "https://router.magicblock.app" : "https://devnet-router.magicblock.app";
      try {
        const response = await axios.post<RouterResponse>(routerUrl, {
          jsonrpc: "2.0",
          id: 1,
          method: "getDelegationStatus",
          params: [pda.toBase58()],
        });

        const { result } = response.data;

        if (result.isDelegated && result.delegationRecord) {
          const validatorAuthority = result.delegationRecord.authority;
          const correctEndpoint =
            VALIDATOR_MAP[NETWORK][validatorAuthority as keyof (typeof VALIDATOR_MAP)[typeof NETWORK]];
          if (correctEndpoint) {
            return `Delegated to ${getRegion(correctEndpoint)} server (${validatorAuthority.substring(0, 3)})`;
          } else {
            return `Delegated to unknown validator: ${validatorAuthority}`;
          }
        } else {
          const accountInfo = await engine.getConnectionChain().getAccountInfo(pda);
          if (!accountInfo) {
            return "❌ Does not exist.";
          }
          if (accountInfo.owner.equals(vaultClient.program.programId)) {
            return "On mainnet (not delegated).";
          }
          return "Exists, but not delegated.";
        }
      } catch {
        const accountInfo = await engine.getConnectionChain().getAccountInfo(pda);
        if (!accountInfo) {
          return "❌ Does not exist (router query failed).";
        }
        return "On mainnet (router query failed).";
      }
    },
    [engine, vaultClient],
  );

  const fetchDebugInfo = useCallback(async () => {
    if (!vaultClient || !engine || !engine.getWalletConnected()) return;

    let debugString = "";

    const supportedMints = Object.keys(cachedTokenMetadata).filter(
      (mint) => cachedTokenMetadata[mint].network === NETWORK,
    );
    if (supportedMints.length > 0) {
      const mint = new PublicKey(supportedMints[0]);
      const balancePda = vaultClient.userProfilePda();
      debugString += `Profile PDA:\n`;
      debugString += `  - Status: ${await getDelegationInfo(balancePda)}\n`;
      debugString += `  - PDA: ${balancePda}\n`;
    } else {
      debugString += `Profile PDA:\n  - Status: No supported mints found for this network.\n`;
    }

    const sessionPayer = engine.getSessionPayer().toString();
    const storedKey = (await vaultClient.getGameWallet())?.toString();
    debugString += `\nSession Payer Sync:\n`;
    debugString += `  - Session Key: ${sessionPayer.slice(0, 10)}...\n`;
    debugString += `  - Stored Key:  ${storedKey ? storedKey.slice(0, 10) + "..." : "Not Found"}\n`;
    debugString += `  - Match: ${sessionPayer === storedKey ? "✅ Synchronized" : "❌ Mismatch"}\n`;

    debugString += `\nSystem Status:\n`;
    debugString += `  - Network: ${NETWORK}\n`;
    debugString += `  - Main Wallet: ${engine.getWalletPayer().toString().slice(0, 10)}...\n`;
    debugString += `  - Ephemeral RPC: ${engine.getEndpointEphemRpc()}\n`;

    setDebugInfo(debugString);
  }, [vaultClient, engine, getDelegationInfo]);

  const pollForAccount = (
    connection: Connection,
    accountPublicKey: PublicKey,
    timeout = 20000,
    pollInterval = 1000,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let elapsed = 0;
      const intervalId = setInterval(async () => {
        elapsed += pollInterval;

        if (elapsed >= timeout) {
          clearInterval(intervalId);
          resolve(false);
          return;
        }

        try {
          const accountInfo = await connection.getAccountInfo(accountPublicKey);
          if (accountInfo) {
            clearInterval(intervalId);
            resolve(true);
          }
        } catch (error) {
          console.error("Polling failed with error:", error);
        }
      }, pollInterval);
    });
  };

  const fetchUnclaimedBalance = useCallback(async () => {
    const sessionWallet = engine.getSessionPayer()?.toString();
    if (!sessionWallet) return;
    try {
      const response = await axios.get<PlayerStats>(`${API_URL}/api/v1/players/stats?wallet=${sessionWallet}`);
      setUnclaimedBalance(Number(response.data.balances.f2p_earnings));
    } catch (error) {
      console.error("Failed to fetch unclaimed balance:", error);
    }
  }, [engine]);

  const analyzeAccountState = useCallback(async () => {
    if (!vaultClient) return;

    setIsRefreshing(true);
    try {
      await fetchUnclaimedBalance();
      await refreshBalance();
      const state = await vaultClient.getSyncState();
      setSyncState(state);
    } catch (e) {
      console.error("Failed to analyze account state:", e);
      setSyncState(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [vaultClient, fetchUnclaimedBalance]);

  useEffect(() => {
    if (isMounted.current && vaultClient && engine.getWalletConnected()) {
      analyzeAccountState().finally(() => setIsInitializing(false));
    } else if (!engine.getWalletConnected()) {
      setIsInitializing(false);
    }
    isMounted.current = true;
  }, [vaultClient, engine, analyzeAccountState]);

  useEffect(() => {
    if (!isInitializing && syncState && syncState.status !== "uninitialized") {
      fetchDebugInfo();
    }
  }, [syncState, fetchDebugInfo, isInitializing]);

  const handleActionComplete = async () => {
    setDialog(null);
    await refreshBalance();
    await analyzeAccountState();
  };

  const handleSynchronizeVault = async () => {
    if (!vaultClient) return;
    setIsSyncing(true);
    const alertId = NotificationService.addAlert({
      type: "success",
      message: "Preparing vault...",
      shouldExit: false,
    });

    try {
      await vaultClient.resyncAndDelegateAll();

      try {
        const profilePda = vaultClient.userProfilePda();
        const appeared = await pollForAccount(engine.getConnectionChain(), profilePda, 30000, 1000);
        await savePlayerAddress();
        if (!appeared) {
          console.warn("Polling timed out waiting for Profile PDA to appear.");
        }
      } catch (pollErr) {
        console.warn("Polling for Profile PDA failed:", pollErr);
      }

      NotificationService.updateAlert(alertId, { message: "Vault is ready!", shouldExit: true, timeout: 3000 });
      await handleActionComplete();
    } catch (error) {
      console.error("Failed to synchronize vault:", error);
      NotificationService.updateAlert(alertId, {
        type: "error",
        message: "Synchronization failed. Please try again.",
        shouldExit: true,
        timeout: 4000,
      });
      await handleActionComplete();
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchUserWalletUiAmount = useCallback(
    async (mint: string) => {
      if (!engine) return 0;
      const conn = engine.getConnectionChain();
      const payer = engine.getWalletPayer();
      const { value } = await conn.getParsedTokenAccountsByOwner(payer, {
        programId: TOKEN_2022_PROGRAM_ID,
      });
      const acct = value.find((v) => v.account.data.parsed.info.mint === mint);
      return acct ? (acct.account.data.parsed.info.tokenAmount.uiAmount as number) : 0;
    },
    [engine],
  );

  const renderContent = () => {
    if (!engine.getWalletConnected()) {
      return <div className="loading-overlay">Sign in and activate your vault to start stacking coins!</div>;
    }

    if (!syncState) {
      return null;
    }

    if (syncState.status === "uninitialized") {
      return (
        <div className="session-prompt">
          <p>Activate your vault. This requires one-time approval.</p>
          <button className="btn-primary" onClick={handleSynchronizeVault} disabled={isSyncing}>
            {isSyncing ? "Activating..." : "Activate Vault"}
          </button>
        </div>
      );
    }

    return (
      <>
        {syncState.status === "needs_sync" && (
          <div className="session-prompt">
            <h4>
              <b>Synchronization Required</b>
            </h4>
            <p>Your vault must be fully synchronized to play. You can still deposit or withdraw.</p>
            <ul className="issue-list">
              {syncState.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
            <button className="btn-primary" onClick={handleSynchronizeVault} disabled={isSyncing}>
              {isSyncing ? "Synchronizing..." : "Synchronize Vault"}
            </button>
          </div>
        )}

        <div className="vault-header">
          <button className="btn-subtle" onClick={analyzeAccountState} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <table className="token-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Balance</th>
              <th className="desktop-only" style={{ whiteSpace: "nowrap" }}></th>
            </tr>
          </thead>
          <tbody>
            {tokenBalances.map(({ mint }) => {
              let meta = cachedTokenMetadata[mint];
              if (!meta || meta.network !== NETWORK) return null;
              const symbol = meta.symbol ?? mint.slice(0, 4) + "…";
              return (
                <tr key={mint}>
                  <td className="token-cell">
                    <div className="token-info">
                      {meta.image && <img src={meta.image} alt={symbol} />}
                      <span>{symbol}</span>
                    </div>
                  </td>
                  <td className="balance-cell">{formatBuyIn(p2pBalance)}</td>
                  <td className="desktop-only actions-cell">
                    <div className="actions-container">
                      <button
                        className="table-btn primary"
                        onClick={() =>
                          setDialog({
                            type: "deposit",
                            token: { mint, uiAmount: p2pBalance, symbol, decimals: meta.decimals ?? 0 },
                          })
                        }
                      >
                        Deposit
                      </button>
                      <button
                        className="table-btn outline"
                        disabled={p2pBalance === 0}
                        onClick={() =>
                          setDialog({
                            type: "withdraw",
                            token: { mint, uiAmount: p2pBalance, symbol, decimals: meta.decimals ?? 0 },
                          })
                        }
                      >
                        Withdraw
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="session-wallet-info">
          <div className="session-wallet-header">
            <span className="session-label">Session Wallet</span>
            {syncState.status === "ready_to_play" && <span className="status-tag">[active]</span>}
          </div>
          <div className="session-wallet-actions">
            <button
              className="icon-button"
              onClick={(e) => {
                navigator.clipboard.writeText(engine.getSessionPayer().toString());
                const button = e.currentTarget;
                const originalContent = button.innerHTML;
                button.textContent = "Copied";
                setTimeout(() => {
                  button.innerHTML = originalContent;
                }, 1000);
              }}
              aria-label="Copy session wallet address"
            >
              <img src="/copy.png" alt="Copy" />
            </button>
            <button
              className="icon-button"
              onClick={() => {
                const privateKey = engine.getSessionKey();
                const secretKeyArray = Object.values(privateKey.secretKey);
                const secretKeyBuffer = Buffer.from(secretKeyArray);
                const base58Key = bs58.encode(secretKeyBuffer);
                const json = JSON.stringify({ base58Key });
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "session-wallet-key.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              aria-label="Export session key"
            >
              Export
            </button>
            <button
              className="icon-button"
              onClick={async () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "application/json";
                input.onchange = async (event) => {
                  const target = event.target as HTMLInputElement;
                  if (!target.files) return;
                  const file = target.files[0];
                  if (file) {
                    const text = await file.text();
                    const { base58Key } = JSON.parse(text);
                    const secretKeyBuffer = bs58.decode(base58Key);
                    const secretKeyArray = Array.from(secretKeyBuffer);
                    localStorage.setItem(SESSION_LOCAL_STORAGE, JSON.stringify(secretKeyArray));
                  }
                };
                input.click();
              }}
              aria-label="Import session key"
            >
              Import
            </button>
          </div>
          <p className="info-text-small">Session wallets are temporary and do not store funds.</p>

          <span className="debug-toggle" onClick={() => setShowDebugInfo(!showDebugInfo)}>
            {showDebugInfo ? "Hide advanced info" : "Show advanced info"}
          </span>
          {showDebugInfo && (
            <div className="debug-info">
              <pre>{debugInfo}</pre>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="menu-session">
      {unclaimedBalance > 0 && (
        <div className="unclaimed-balance-banner">
          <div className="banner-text">
            <span>Unclaimed F2P earnings</span>
            <strong>{formatBuyIn(unclaimedBalance)}</strong>
          </div>
          <button className="btn-claim" disabled>
            Coming soon
          </button>
        </div>
      )}

      <div className="session-content">
        {isInitializing ? <div className="loading-overlay">Loading...</div> : renderContent()}
      </div>

      {dialog && vaultClient && (
        <TokenTransferModal
          engine={engine}
          vaultClient={vaultClient}
          kind={dialog.type}
          token={dialog.token}
          sessionBalance={dialog.token.uiAmount}
          fetchWalletBalance={fetchUserWalletUiAmount}
          onClose={async () => await handleActionComplete()}
          onDone={async () => {
            NotificationService.addAlert({
              type: "success",
              message: `${dialog.type} successful`,
              shouldExit: true,
              timeout: 3000,
            });
            await handleActionComplete();
          }}
        />
      )}
    </div>
  );
}
