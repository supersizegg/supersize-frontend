import * as React from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { cachedTokenMetadata } from "../../utils/constants";
import TokenTransferModal from "../TokenTransferModal/TokenTransferModal";
import { SupersizeVaultClient } from "../../engine/SupersizeVaultClient";
import "./MenuSession.scss";

type MenuSessionProps = {
  username: string;
  sessionWalletInUse: boolean;
  sessionLamports: number | undefined;
  setSessionWalletInUse: (sessionWalletInUse: boolean) => void;
  setIsDepositModalOpen: (isDepositModalOpen: boolean) => void;
  setIsWithdrawalModalOpen: (isWithdrawalModalOpen: boolean) => void;
  setSessionLamports: (accountBalance: number | undefined) => void;
};

export interface TokenBalance {
  mint: string;
  uiAmount: number;
}

export function MenuSession({
  // username,
  // sessionLamports,
  setSessionWalletInUse,
  setSessionLamports,
}: MenuSessionProps) {
  const engine = useMagicBlockEngine();
  const [vaultClient, setVaultClient] = React.useState<SupersizeVaultClient | null>(null);
  const [isSessionReady, setIsSessionReady] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [tokenBalances, setTokenBalances] = React.useState<TokenBalance[]>([]);
  const [dialog, setDialog] = React.useState<null | {
    type: "deposit" | "withdraw";
    token: TokenBalance & { symbol: string; decimals: number };
  }>(null);

  // const fetchWalletUiAmount = React.useCallback(
  //   async (mint: string) => {
  //     if (!engine.getWalletConnected()) return 0;
  //     const conn = engine.getConnectionChain();
  //     const payer = engine.getWalletPayer();
  //     const { value } = await conn.getParsedTokenAccountsByOwner(payer, { programId: TOKEN_PROGRAM_ID });
  //     const acct = value.find((v) => v.account.data.parsed.info.mint === mint);
  //     return acct ? (acct.account.data.parsed.info.tokenAmount.uiAmount as number) : 0;
  //   },
  //   [engine],
  // );

  const sessionPayer = engine.getSessionPayer();

  React.useEffect(() => {
    if (engine) {
      setVaultClient(new SupersizeVaultClient(engine));
    }
  }, [engine]);

  React.useEffect(() => {
    const retrievedUser = localStorage.getItem("user");
    let use_session = null;
    if (retrievedUser) {
      use_session = JSON.parse(retrievedUser).use_session;
      if (use_session) {
        setSessionWalletInUse(use_session);
      }
    }
  }, []);

  React.useEffect(() => {
    return engine.subscribeToChainAccountInfo(sessionPayer, (accountInfo) => {
      setSessionLamports(accountInfo?.lamports);
    });
  }, [engine, sessionPayer]);

  React.useEffect(() => {
    const connection = engine.getConnectionChain();
    if (!connection) return;

    let subId: number | undefined;

    const refresh = async () => {
      const { value } = await connection.getParsedTokenAccountsByOwner(sessionPayer, { programId: TOKEN_PROGRAM_ID });

      const list: TokenBalance[] = value
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          return {
            mint: info.mint as string,
            uiAmount: info.tokenAmount.uiAmount as number,
          };
        })
        .filter((b) => b.uiAmount > 0);

      setTokenBalances(list);
    };

    refresh();

    subId = connection.onAccountChange(sessionPayer, refresh, "confirmed");

    return () => {
      if (subId) connection.removeProgramAccountChangeListener(subId);
    };
  }, [engine, sessionPayer]);

  const refreshVaultBalances = React.useCallback(async () => {
    if (!vaultClient) return;

    setIsLoading(true);
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
    setIsLoading(false);
  }, [vaultClient]);

  React.useEffect(() => {
    if (!vaultClient) return;

    const checkSessionStatus = async () => {
      setIsLoading(true);
      const gwPda = vaultClient.gameWalletPda();
      const accountInfo = await engine.getConnectionChain().getAccountInfo(gwPda);
      if (accountInfo) {
        setIsSessionReady(true);
        await refreshVaultBalances();
      } else {
        setIsSessionReady(false);
      }
      setIsLoading(false);
    };

    checkSessionStatus();
  }, [vaultClient, refreshVaultBalances, engine]);

  const handleStartSession = async () => {
    if (!vaultClient) return;

    setIsLoading(true);
    try {
      // TEST: prepare PDA for Magic Block Gem
      const firstMint = new PublicKey(Object.keys(cachedTokenMetadata)[2]);
      await vaultClient.preparePDAs(firstMint);

      setIsSessionReady(true);
      await refreshVaultBalances();
    } catch (error) {
      console.error("Failed to prepare session:", error);
      alert("Failed to prepare session.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserWalletUiAmount = React.useCallback(
    async (mint: string) => {
      if (!engine.getWalletConnected()) return 0;
      const conn = engine.getConnectionChain();
      const payer = engine.getWalletPayer();
      const { value } = await conn.getParsedTokenAccountsByOwner(payer, { programId: TOKEN_PROGRAM_ID });
      const acct = value.find((v) => v.account.data.parsed.info.mint === mint);
      return acct ? (acct.account.data.parsed.info.tokenAmount.uiAmount as number) : 0;
    },
    [engine],
  );

  /*
  const handleSetSessionWalletInUse = async (currentStatus: boolean) => {
    setSessionWalletInUse(currentStatus);
    const user = { name: username, use_session: currentStatus };
    localStorage.setItem("user", JSON.stringify(user));
  };

  const solBalance = sessionLamports !== undefined ? (sessionLamports / 1_000_000_000).toFixed(3) : "0";
  */

  return (
    <div className="menu-session">
      <div className="session-bottom">
        {isLoading && <div className="loading-overlay">Loading...</div>}

        {!isSessionReady && !isLoading && (
          <div className="session-prompt">
            <h3>Enable Game Wallet</h3>
            <p>To play, you need to enable the game wallet. This requires one-time approval.</p>
            <button className="submit-button" onClick={handleStartSession}>
              Enable Now
            </button>
          </div>
        )}

        {isSessionReady && (
          <>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}
            >
              <h3 style={{ margin: 0 }}>Game Wallet Balances</h3>
              <button
                className="table-btn outline"
                onClick={refreshVaultBalances}
                style={{ fontSize: "12px", borderRadius: "5px", padding: "5px" }}
                disabled={isLoading}
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
          engine={engine}
          vaultClient={vaultClient}
          kind={dialog.type}
          token={dialog.token}
          sessionBalance={dialog.token.uiAmount}
          fetchWalletBalance={fetchUserWalletUiAmount}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            refreshVaultBalances();
          }}
        />
      )}
    </div>
  );
}
