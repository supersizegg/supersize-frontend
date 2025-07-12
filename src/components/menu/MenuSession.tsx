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
    const stored = localStorage.getItem("user");
    const parsed = stored ? JSON.parse(stored) : {};
    const user = { ...parsed, name: username, use_session: currentStatus };
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("storage"));
  };


  return (
    <div className="menu-session">
      <div className="session-bottom">
        <div className="session-top row-inline"></div>

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
