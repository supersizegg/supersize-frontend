import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { SupersizeVaultClient } from "@engine/SupersizeVaultClient";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import "./Modal.css";
import NotificationService from "@components/notification/NotificationService";

type Props = {
  engine: MagicBlockEngine;
  vaultClient: SupersizeVaultClient;
  kind: "deposit" | "withdraw";
  token: { mint: string; symbol: string; decimals: number };
  sessionBalance: number;
  fetchWalletBalance: (mint: string) => Promise<number>;
  onClose: () => void;
  onDone: () => void;
  handleWithdraw: (mint: string, uiAmount: number, payoutWallet: PublicKey | null) => Promise<void>;
};

const TokenTransferModal: React.FC<Props> = ({
  engine,
  vaultClient,
  kind,
  token,
  sessionBalance,
  fetchWalletBalance,
  onClose,
  onDone,
  handleWithdraw,
}) => {
  const wallet = engine.getWalletPayer();
  const [max, setMax] = useState<number>(0);
  const [value, setValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payoutWallet, setPayoutWallet] = useState<PublicKey | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const m = kind === "deposit" ? await fetchWalletBalance(token.mint) : sessionBalance;
      if (mounted) {
        setMax(m);
        setValue(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [kind, token.mint, sessionBalance, fetchWalletBalance]);

  const handleConfirm = async () => {
    if (value === 0 || isProcessing) return;

    setIsProcessing(true);
    const alertId = NotificationService.addAlert({
      type: "success",
      message: `submitting ${kind}...`,
      shouldExit: false,
    });
    try {
      if (kind === "deposit") {
        await vaultClient.deposit(new PublicKey(token.mint), value);
        onDone();
      } else {
        await handleWithdraw(token.mint, value, payoutWallet);
      }
    } catch (error) {
      console.error(`Failed to ${kind}:`, error);
      const exitAlertId = NotificationService.addAlert({
        type: "error",
        message: `${kind} failed`,
        shouldExit: false,
      });
      setTimeout(() => {
        NotificationService.updateAlert(exitAlertId, { shouldExit: true });
      }, 3000);
    } finally {
      NotificationService.updateAlert(alertId, { shouldExit: true });
      setIsProcessing(false);
    }
  };

  const pct = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: "0.5rem" }}>
          {kind === "deposit" ? "Deposit" : "Withdraw"}
        </h3>

        <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          {engine?.getWalletType() === "embedded" && 
          kind === "withdraw"
           ?(
            <>
            <label htmlFor="payoutWalletInput">Payout Wallet:</label>
            <input
              type="text"
              id="payoutWalletInput"
              value={payoutWallet ? payoutWallet.toString() : ""}
              onChange={(e) => {
                try {
                  const newPayoutWallet = new PublicKey(e.target.value);
                  setPayoutWallet(newPayoutWallet);
                } catch (error) {
                  console.error("Invalid PublicKey format:", error);
                }
              }}
              placeholder="Enter payout wallet address"
              style={{ width: "100%", marginBottom: "0.5rem", color: "black"}}
            />
            </>
           )
           : (
            <>
              {kind === "deposit" ? "From wallet:" : "To wallet:"} {wallet.toString().slice(0, 3) + "..." + wallet.toString().slice(-3)}
            </>
           )}
        </p>


        <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          Available: {max.toLocaleString(undefined, { maximumFractionDigits: token.decimals })}
        </p>

        <input
          type="range"
          min={0}
          max={max}
          step={Math.pow(10, -token.decimals)}
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />

        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          {value.toLocaleString(undefined, { maximumFractionDigits: token.decimals })} {token.symbol} ({pct.toFixed(0)}
          %)
        </div>

        <button
          className="submit-button"
          style={{ marginTop: "1rem" }}
          disabled={value === 0 || isProcessing || value > max}
          onClick={handleConfirm}
        >
          {isProcessing ? "Processing..." : `Confirm ${kind === "deposit" ? "Deposit" : "Withdraw"}`}
        </button>
      </div>
    </div>
  );
};

export default TokenTransferModal;
