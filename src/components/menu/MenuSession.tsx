import * as React from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
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

export function MenuSession({ username, sessionWalletInUse, sessionLamports, setSessionWalletInUse, setIsDepositModalOpen, setIsWithdrawalModalOpen, setSessionLamports }: MenuSessionProps) {
  const engine = useMagicBlockEngine();

  const sessionPayer = engine.getSessionPayer();
  
  React.useEffect(() => {
    const retrievedUser = localStorage.getItem("user");
    let  use_session = null;
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

  const handleSetSessionWalletInUse = async (currentStatus: boolean) => {
    setSessionWalletInUse(currentStatus)
    const user = { name: username, use_session: currentStatus };
    localStorage.setItem("user", JSON.stringify(user));
  };

  const solBalance = sessionLamports !== undefined ? (sessionLamports / 1_000_000_000).toFixed(3) : "0";

  return (
    <div className="menu-session">
      <div className="session-bottom">
        <div className="session-top row-inline">
          <div className="network-switch" style={{ display: "flex", alignItems: "center" }}>
            <span className="session-label" style={{marginRight: '10px'}}>Game wallet:</span>
            <label className="switch" style={{ marginRight: "10px", marginTop: '3px' }}>
              <input
                type="checkbox"
                checked={sessionWalletInUse}
                onChange={() => handleSetSessionWalletInUse(!sessionWalletInUse)}
              />
              <span className="slider round"></span>
            </label>
            <span className="network-label">{sessionWalletInUse ? "use for all tokens" : "use only for gems"}</span>
          </div>
          
          <span className="session-balance">Balance: {solBalance} SOL</span>
        </div>

        <input className="session-address" type="text" readOnly value={sessionPayer.toBase58()} />

        <div className="session-buttons">
            <button className="btn-fund" onClick={() => setIsDepositModalOpen(true)}>
             Deposit
            </button>

          <button className="btn-withdraw" onClick={() => setIsWithdrawalModalOpen(true)}>
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
