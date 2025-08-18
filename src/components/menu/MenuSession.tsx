import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { SupersizeVaultClient } from "../../engine/SupersizeVaultClient";
import { cachedTokenMetadata, NETWORK } from "../../utils/constants";
import TokenTransferModal from "../TokenTransferModal/TokenTransferModal";
import "./MenuSession.scss";
import NotificationService from "@components/notification/NotificationService";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { formatBuyIn, fetchWalletTokenBalance } from "../../utils/helper";

type UserStatus = "loading" | "uninitialized" | "ready_to_delegate" | "delegated";

export interface TokenBalance {
  mint: string;
  uiAmount: number;
}

type MenuSessionProps = {
  setTokenBalance: (tokenBalance: number) => void;
};

export function MenuSession({ setTokenBalance }: MenuSessionProps) {
  const { engine } = useMagicBlockEngine();

  const [vaultClient, setVaultClient] = useState<SupersizeVaultClient | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const [resetGameWallet, setResetGameWallet] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [dialog, setDialog] = useState<null | {
    type: "deposit" | "withdraw";
    token: TokenBalance & { symbol: string; decimals: number };
  }>(null);

  useEffect(() => {
    console.log(engine.getEndpointEphemRpc());
    if (engine && engine.getWalletConnected()) {
      setVaultClient(new SupersizeVaultClient(engine));
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
  }, [vaultClient]);

  const checkStatus = useCallback(async () => {

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

  }, [vaultClient, engine, refreshVaultBalances]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleEnableWallet = async () => {
    if (!vaultClient) return;
    setStatus("loading");
    try {
      let cMint = new PublicKey(Object.keys(cachedTokenMetadata)[1]);
      if (NETWORK !== "mainnet") {
        cMint = new PublicKey(Object.keys(cachedTokenMetadata)[2]);
      }
      await vaultClient.setupUserAccounts(cMint);
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
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });
      const acct = value.find((v) => v.account.data.parsed.info.mint === mint);
      return acct ? (acct.account.data.parsed.info.tokenAmount.uiAmount as number) : 0;
    },
    [engine],
  );

  return (
    <div className="menu-session">
        {engine.getWalletConnected() && (status === "ready_to_delegate" || status === "delegated") && (
          <>
            <div className="flex justify-center items-center m-0 p-0 background-transparent"
              style={{ display: walletBalance > 0 ? "flex" : "none" }}
            > 
              {walletBalance.toFixed(2)} USDC available to deposit
            </div>
          </>
      )}
      <div className="session-bottom">
        {!engine.getWalletConnected() && <div className="loading-overlay">Sign in to play!</div>}

        {status === "loading" && engine.getWalletConnected() && <div className="loading-overlay">Loading...</div>}
        
        {status === "uninitialized" && engine.getWalletConnected() && (
          <div className="session-prompt">
            <p style={{ padding: "20px 0" }}>
              To play, you need to enable the game wallet. This requires one-time approval.
            </p>
            <button className="submit-button" onClick={handleEnableWallet}>
              Enable Now
            </button>
          </div>
        )}

        {engine.getWalletConnected() && (status === "ready_to_delegate" || status === "delegated") && (
          <>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}
            >
              <h3 style={{ margin: 0 }}>Vault</h3>
              <button
                className="table-btn outline"
                onClick={checkStatus}
                style={{ fontSize: "12px", borderRadius: "5px", padding: "5px" }}
              >
                Refresh
              </button>
            </div>

            <table className="token-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th colSpan={2} style={{ width: "160px" }} />
                </tr>
              </thead>
              <tbody>
                {(status === "ready_to_delegate" || status === "delegated") &&
                  tokenBalances.map(({ mint, uiAmount }) => {
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
                          {uiAmount == -1
                            ? "Wrong Server"
                            : formatBuyIn(Math.round(uiAmount * 1000) / 1000) 
                            //uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })
                          }
                        </td>
                        <td>
                          <button
                            className="table-btn"
                            /* style={{ opacity: engine?.getWalletType() === "embedded" ? "0" : "1" }} */
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

            <div className="session-top row-inline">
              <div className="network-switch" style={{ display: "flex", alignItems: "center" }}>
                <span className="session-label" style={{ marginRight: "10px", display: "inline" }}>
                  Session wallet
                  {status === "delegated" && !resetGameWallet && (
                    <p style={{ display: "inline", color: "#4c9058", marginLeft: "10px" }}>[active]</p>
                  )}
                  <div 
                    style={{ 
                      display: "inline-block",
                      backgroundColor: "#4c9058",
                      borderRadius: "5px",
                      color: "#ffffff",
                      border: "none",
                      padding: "0px 5px",
                      cursor: "pointer",
                      marginLeft: "10px",
                      fontSize: "12px",
                    }}>
                  <button
                    className="copy-icon-button"
                    onClick={(e) => {
                      navigator.clipboard.writeText(engine.getSessionPayer().toString());
                      const button = e.currentTarget;
                      button.style.transform = "translateY(0px)";
                      button.textContent = "Copied";
                      setTimeout(() => {
                          button.innerHTML = '<img src="/copy.png" alt="Copy" width="15" height="15"/>';
                          button.style.transform = "translateY(3px)";
                      }, 600);
                    }}
                    title="Copy to clipboard"
                  >
                      <img src="/copy.png" alt="Copy" width={15} height={15} style={{ transform: "translateY(3px)" }} />
                  </button>
                  </div>
                  <div 
                    style={{ 
                      display: "inline-block",
                      backgroundColor: "#4c9058",
                      borderRadius: "5px",
                      color: "#ffffff",
                      border: "none",
                      padding: "0px 5px",
                      cursor: "pointer",
                      marginLeft: "10px",
                      fontSize: "12px",
                    }}>
                  <button
                    className="copy-icon-button"
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
                    title="export private key"
                  >
                      Export Private Key
                  </button>
                  </div>
                  <p className="info-text" style={{ marginTop: "5px", textAlign: "center", width: "320px" }}>
                    Session wallet is not used to store funds
                  </p>
                </span>
              </div>               
            </div>

            {(resetGameWallet || status === "ready_to_delegate") && (
              <div className="session-buttons">
                <button
                  className="btn-fund"
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
                  Need to reset session wallet
                </button>
                <div className="flex" style={{ fontSize: "12px", color: "#FFF" }}>*this will not affect your vault balance</div>
              </div>
            )}
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
              //
            }
          }}
          handleWithdraw={handleWithdraw}
        />
      )}
    </div>
  );
}
