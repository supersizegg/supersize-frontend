import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { PublicKey } from "@solana/web3.js";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { SupersizeVaultClient } from "../../engine/SupersizeVaultClient";
import { cachedTokenMetadata, NETWORK, API_URL, VALIDATOR_MAP } from "../../utils/constants";
import TokenTransferModal from "../TokenTransferModal/TokenTransferModal";
import "./MenuSession.scss";
import NotificationService from "@components/notification/NotificationService";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { formatBuyIn, fetchWalletTokenBalance, getValidatorKeyForEndpoint, getRegion } from "../../utils/helper";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
const SESSION_LOCAL_STORAGE = "magicblock-session-key";

type UserStatus = "loading" | "uninitialized" | "ready_to_delegate" | "delegated";

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

type MenuSessionProps = {
  setTokenBalance: (tokenBalance: number) => void;
};

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

export function MenuSession({ setTokenBalance }: MenuSessionProps) {
  const { engine } = useMagicBlockEngine();

  const [vaultClient, setVaultClient] = useState<SupersizeVaultClient | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const [resetGameWallet, setResetGameWallet] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [unclaimedBalance, setUnclaimedBalance] = useState<number>(0);
  const [dialog, setDialog] = useState<null | {
    type: "deposit" | "withdraw";
    token: TokenBalance & { symbol: string; decimals: number };
  }>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  useEffect(() => {
    if (engine && engine.getWalletConnected()) {
      setVaultClient(new SupersizeVaultClient(engine));

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

      savePlayerAddress();
    } else {
      setVaultClient(null);
      setStatus("loading");
    }
  }, [engine]);

  const refreshVaultBalances = useCallback(async () => {
    if (!vaultClient) return;

    const supportedMints = Object.keys(cachedTokenMetadata);
    const balances: TokenBalance[] = [];

    for (const mintStr of supportedMints) {
      const mint = new PublicKey(mintStr);
      const uiAmount = await vaultClient.getVaultBalance(mint);
      if (uiAmount == "wrong_server") {
        balances.push({ mint: mintStr, uiAmount: -1 });
      } else if (uiAmount >= 0) {
        if (mintStr === "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp") {
          setTokenBalance(uiAmount);
        }
        balances.push({ mint: mintStr, uiAmount });
      }
    }

    setTokenBalances(balances);
  }, [vaultClient, setTokenBalance]);

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
          // @ts-ignore
          const correctEndpoint = VALIDATOR_MAP[NETWORK][validatorAuthority];
          if (correctEndpoint) {
            return `Delegated to ${getRegion(correctEndpoint)} server`;
          } else {
            return `Delegated to unknown validator: ${validatorAuthority}`;
          }
        } else {
          const accountInfo = await engine.getConnectionChain().getAccountInfo(pda);
          if (!accountInfo) {
            return "❌ Does not exist.";
          }
          // @ts-ignore
          if (accountInfo.owner.equals(vaultClient.program.programId)) {
            return "On mainnet (not delegated).";
          }
          return "Exists, but not delegated.";
        }
      } catch (error) {
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
      const balancePda = vaultClient.userBalancePda(engine.getWalletPayer(), mint);
      debugString += `Balance PDA (${mint.toBase58().slice(0, 4)}...):\n`;
      debugString += `  - Status: ${await getDelegationInfo(balancePda)}\n`;
      debugString += `  - PDA: ${balancePda}\n`;
    } else {
      debugString += `Balance PDA:\n  - Status: No supported mints found for this network.\n`;
    }

    const walletPda = vaultClient.gameWalletPda();
    debugString += `\nWallet PDA:\n`;
    debugString += `  - Status: ${await getDelegationInfo(walletPda)}\n`;
    debugString += `  - PDA: ${walletPda}\n`;

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

  const checkStatus = useCallback(async () => {
    // fetch session wallet balance
    await fetchUnclaimedBalance();

    if (!vaultClient) return;

    setStatus("loading");
    const gwPda = vaultClient.gameWalletPda();
    const gwPdaCheck = await vaultClient.getGameWallet();
    try {
      const accountInfo = await engine.getConnectionChain().getAccountInfo(gwPda);
      if (!accountInfo) {
        setStatus("uninitialized");
      } else if (accountInfo.owner.equals(new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"))) {
        if (gwPdaCheck) {
          if (gwPdaCheck.toString() !== engine.getSessionPayer().toString()) {
            setResetGameWallet(true);
          }
        }
        setStatus("delegated");
        await refreshVaultBalances();
      } else {
        if (gwPdaCheck) {
          if (gwPdaCheck.toString() !== engine.getSessionPayer().toString()) {
            setResetGameWallet(true);
          }
        }
        await refreshVaultBalances();
        setStatus("ready_to_delegate");
      }
    } catch (e) {
      console.error("Failed to check status:", e);
      setStatus("uninitialized");
    }

    if (!engine.getWalletConnected()) return;
    const { balance, tokenName } = await fetchWalletTokenBalance(engine, NETWORK !== "mainnet");
    setWalletBalance(balance);
  }, [vaultClient, engine, refreshVaultBalances, fetchUnclaimedBalance]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (status === "ready_to_delegate" || status === "delegated") {
      fetchDebugInfo();
    }
  }, [status, fetchDebugInfo]);

  const handleEnableWallet = async () => {
    if (!vaultClient) return;
    setStatus("loading");
    try {
      let cMint = new PublicKey(Object.keys(cachedTokenMetadata)[0]);
      if (NETWORK !== "mainnet") {
        cMint = new PublicKey(Object.keys(cachedTokenMetadata)[1]);
      }
      //const validatorKey = getValidatorKeyForEndpoint("america");
      await vaultClient.setupUserAccounts(cMint); //new PublicKey(validatorKey)
      await checkStatus();
    } catch (error) {
      console.error("Failed to enable wallet:", error);
      setStatus("uninitialized");
    }
  };

  const handleWithdraw = async (mint: string, uiAmount: number, payoutWallet: PublicKey | null) => {
    if (!vaultClient || uiAmount <= 0) return;
    setStatus("loading");
    try {
      await vaultClient.withdraw(new PublicKey(mint), uiAmount, payoutWallet);
      const successAlertId = NotificationService.addAlert({
        type: "success",
        message: `withdraw successful`,
        shouldExit: false,
      });
      setTimeout(() => {
        NotificationService.updateAlert(successAlertId, { shouldExit: true });
      }, 3000);
      await checkStatus();
    } catch (error) {
      console.error("Failed to withdraw:", error);
      await checkStatus();
      throw error;
    } finally {
      setDialog(null);
    }
  };

  const fetchUserWalletUiAmount = useCallback(
    async (mint: string) => {
      if (!engine) return 0;
      const conn = engine.getConnectionChain();
      const payer = engine.getWalletPayer();
      const { value } = await conn.getParsedTokenAccountsByOwner(payer, {
        programId: TOKEN_2022_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      const acct = value.find((v) => v.account.data.parsed.info.mint === mint);
      return acct ? (acct.account.data.parsed.info.tokenAmount.uiAmount as number) : 0;
    },
    [engine],
  );

  return (
    <div className="menu-session">
      {unclaimedBalance > 0 && (
        <div className="unclaimed-balance-banner">
          <div className="banner-text">
            <span>Unclaimed F2P earnings</span>
            <strong>{formatBuyIn(unclaimedBalance)}</strong>
          </div>
          <button className="btn-claim" disabled>
            Claim
          </button>
        </div>
      )}

      <div className="session-content">
        {!engine.getWalletConnected() && (
          <div className="loading-overlay">Sign in and activate your vault to start stacking coins!</div>
        )}

        {status === "loading" && engine.getWalletConnected() && <div className="loading-overlay">Loading...</div>}

        {status === "uninitialized" && engine.getWalletConnected() && (
          <div className="session-prompt">
            <p>Activate your vault. This requires one-time approval.</p>
            <button className="btn-primary" onClick={handleEnableWallet}>
              Activate Vault
            </button>
          </div>
        )}

        {engine.getWalletConnected() && (status === "ready_to_delegate" || status === "delegated") && (
          <>
            <div className="vault-header">
              {/* <h3>Vault</h3> */}
              <button className="btn-subtle" onClick={checkStatus}>
                Refresh
              </button>
            </div>

            <table className="token-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th colSpan={2} style={{ width: "160px" }} className="desktop-only" />
                </tr>
              </thead>
              <tbody>
                {(status === "ready_to_delegate" || status === "delegated") &&
                  tokenBalances.map(({ mint, uiAmount }) => {
                    let meta = cachedTokenMetadata[mint];
                    if (!meta) return null;
                    if (meta.network !== NETWORK) return null;
                    const symbol = meta.symbol ?? mint.slice(0, 4) + "…";
                    return (
                      <tr key={mint}>
                        <td className="token-cell">
                          {meta.image && <img src={meta.image} alt={symbol} />}
                          {symbol}
                        </td>
                        <td className="balance-cell">
                          {uiAmount === -1 ? "Wrong Server" : formatBuyIn(Math.round(uiAmount * 1000) / 1000)}
                        </td>
                        <td className="desktop-only">
                          <button
                            className="table-btn"
                            onClick={() =>
                              setDialog({
                                type: "deposit",
                                token: { mint, uiAmount, symbol, decimals: meta.decimals ?? 0 },
                              })
                            }
                          >
                            Deposit
                          </button>
                        </td>
                        <td className="desktop-only">
                          <button
                            className="table-btn outline"
                            disabled={uiAmount === 0}
                            onClick={() =>
                              setDialog({
                                type: "withdraw",
                                token: { mint, uiAmount, symbol, decimals: meta.decimals ?? 0 },
                              })
                            }
                          >
                            Withdraw
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {(resetGameWallet || status === "ready_to_delegate") && (
              <div className="session-prompt">
                <p>Your session wallet needs to be reset. This will not affect your vault balance.</p>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const alertId = NotificationService.addAlert({
                      type: "success",
                      message: "reinitializing wallet...",
                      shouldExit: false,
                    });
                    try {
                      await vaultClient?.newGameWallet();
                      setResetGameWallet(false);
                    } catch (error) {
                      console.error("Failed to reset game wallet:", error);
                      const exitAlertId = NotificationService.addAlert({
                        type: "error",
                        message: "wallet reset failed",
                        shouldExit: false,
                      });
                      setTimeout(() => {
                        NotificationService.updateAlert(exitAlertId, { shouldExit: true });
                      }, 3000);
                    } finally {
                      NotificationService.updateAlert(alertId, { shouldExit: true });
                    }
                  }}
                >
                  Reset Session Wallet
                </button>
              </div>
            )}

            <div className="session-wallet-info">
              <div className="session-wallet-header">
                <span className="session-label">Session Wallet</span>
                {status === "delegated" && !resetGameWallet && <span className="status-tag">[active]</span>}
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
        )}
      </div>

      {dialog && vaultClient && (
        <TokenTransferModal
          engine={engine}
          vaultClient={vaultClient}
          kind={dialog.type}
          token={dialog.token}
          sessionBalance={dialog.token.uiAmount}
          fetchWalletBalance={fetchUserWalletUiAmount}
          onClose={() => setDialog(null)}
          onDone={async () => {
            if (dialog.type === "deposit") {
              setDialog(null);
              const successAlertId = NotificationService.addAlert({
                type: "success",
                message: `deposit successful`,
                shouldExit: false,
              });
              setTimeout(() => {
                NotificationService.updateAlert(successAlertId, { shouldExit: true });
              }, 3000);
              await checkStatus();
            } else {
              // withdraw is handled by handleWithdraw
            }
          }}
          handleWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
}
