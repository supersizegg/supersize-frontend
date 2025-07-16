import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { SupersizeVaultClient } from "../../engine/SupersizeVaultClient";
import { cachedTokenMetadata } from "../../utils/constants";
import TokenTransferModal from "../TokenTransferModal/TokenTransferModal";
import "./MenuSession.scss";

type UserStatus = "loading" | "uninitialized" | "ready_to_delegate" | "delegated";

export interface TokenBalance {
  mint: string;
  uiAmount: number;
}

export function MenuSession() {
  const engine = useMagicBlockEngine();
  const { connected: isWalletConnected } = useWallet();

  const [vaultClient, setVaultClient] = useState<SupersizeVaultClient | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [dialog, setDialog] = useState<null | {
    type: "deposit" | "withdraw";
    token: TokenBalance & { symbol: string; decimals: number };
  }>(null);

  useEffect(() => {
    if (isWalletConnected && engine) {
      setVaultClient(new SupersizeVaultClient(engine));
    } else {
      setVaultClient(null);
      setStatus("loading");
    }
  }, [isWalletConnected, engine]);

  const refreshVaultBalances = useCallback(async () => {
    if (!vaultClient) return;

    setStatus("loading");
    const supportedMints = Object.keys(cachedTokenMetadata);
    const balances: TokenBalance[] = [];

    for (const mintStr of supportedMints) {
      const mint = new PublicKey(mintStr);
      const uiAmount = await vaultClient.getVaultBalance(mint);
      if (uiAmount >= 0) {
        balances.push({ mint: mintStr, uiAmount });
      }
    }

    setTokenBalances(balances);
    setStatus("ready_to_delegate");
  }, [vaultClient]);

  const checkStatus = useCallback(async () => {
    if (!vaultClient) {
      console.warn("Vault client not initialized");
      return;
    }

    setStatus("loading");
    const gwPda = vaultClient.gameWalletPda();
    try {
      const accountInfo = await engine.getConnectionChain().getAccountInfo(gwPda);
      if (!accountInfo) {
        setStatus("uninitialized");
      } else if (accountInfo.owner.equals(new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"))) {
        setStatus("delegated");
        await refreshVaultBalances();
      } else {
        await refreshVaultBalances();
        setStatus("ready_to_delegate");
      }
    } catch (e) {
      console.error("Failed to check status:", e);
      setStatus("uninitialized");
    }
  }, [vaultClient, engine, refreshVaultBalances]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleEnableWallet = async () => {
    if (!vaultClient) return;
    setStatus("loading");
    try {
      const cMint = new PublicKey(Object.keys(cachedTokenMetadata)[2]);
      await vaultClient.setupUserAccounts(cMint);
      await checkStatus();
    } catch (error) {
      console.error("Failed to enable wallet:", error);
      setStatus("uninitialized");
    }
  };

  const handleWithdraw = async (mint: string, uiAmount: number) => {
    if (!vaultClient || uiAmount <= 0) return;
    setStatus("loading");
    try {
      await vaultClient.withdraw(new PublicKey(mint), uiAmount);
      await checkStatus();
    } catch (error) {
      console.error("Failed to withdraw:", error);
      await checkStatus();
    } finally {
      setDialog(null);
    }
  };

  const fetchUserWalletUiAmount = useCallback(
    async (mint: string) => {
      if (!isWalletConnected || !engine) return 0;
      const conn = engine.getConnectionChain();
      const payer = engine.getWalletPayer();
      const { value } = await conn.getParsedTokenAccountsByOwner(payer, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      const acct = value.find((v) => v.account.data.parsed.info.mint === mint);
      return acct ? (acct.account.data.parsed.info.tokenAmount.uiAmount as number) : 0;
    },
    [engine, isWalletConnected],
  );

  return (
    <div className="menu-session">
      <div className="session-bottom">
        {status === "loading" && <div className="loading-overlay">Loading...</div>}

        {status === "uninitialized" && (
          <div className="session-prompt">
            <p style={{ padding: "20px 0" }}>
              To play, you need to enable the game wallet. This requires one-time approval.
            </p>
            <button className="submit-button" onClick={handleEnableWallet}>
              Enable Now
            </button>
          </div>
        )}

        {(status === "ready_to_delegate" || status === "delegated") && (
          <>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}
            >
              <h3 style={{ margin: 0 }}>Game Vault</h3>
              <button
                className="table-btn outline"
                onClick={checkStatus}
                style={{ fontSize: "12px", borderRadius: "5px", padding: "5px" }}
              >
                Refresh
              </button>
            </div>

            {status === "delegated" && (
              <div className="session-active-banner">
                <p>✓ Session Active: You can now play games without signing transactions.</p>
              </div>
            )}

            <table className="token-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th colSpan={2} style={{ width: "160px" }} />
                </tr>
              </thead>
              <tbody>
                {tokenBalances.map(({ mint, uiAmount }) => {
                  let meta = cachedTokenMetadata[mint];
                  if (!meta) return null;
                  const symbol = meta.symbol ?? mint.slice(0, 4) + "…";
                  return (
                    <tr key={mint}>
                      <td className="token-cell">
                        {meta.image && <img src={meta.image} alt={symbol} />}
                        {symbol}
                      </td>
                      <td className="balance-cell">
                        {uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td>
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
                      <td>
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
          </>
        )}
      </div>

      {dialog && vaultClient && (
        <TokenTransferModal
          vaultClient={vaultClient}
          kind={dialog.type}
          token={dialog.token}
          sessionBalance={dialog.token.uiAmount}
          fetchWalletBalance={fetchUserWalletUiAmount}
          onClose={() => setDialog(null)}
          onDone={async () => {
            if (dialog.type === "deposit") {
              setDialog(null);
              await checkStatus();
            } else {
              //
            }
          }}
          handleWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
}
