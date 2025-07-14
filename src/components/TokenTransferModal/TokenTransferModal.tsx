import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { SupersizeVaultClient } from "@engine/SupersizeVaultClient";
import "./Modal.css";

type Props = {
  vaultClient: SupersizeVaultClient;
  kind: "deposit" | "withdraw";
  token: { mint: string; symbol: string; decimals: number };
  sessionBalance: number;
  fetchWalletBalance: (mint: string) => Promise<number>;
  onClose: () => void;
  onDone: () => void;
  handleWithdraw: (mint: string, uiAmount: number) => Promise<void>;
};

const TokenTransferModal: React.FC<Props> = ({
  vaultClient,
  kind,
  token,
  sessionBalance,
  fetchWalletBalance,
  onClose,
  onDone,
  handleWithdraw,
}) => {
  const [max, setMax] = useState<number>(0);
  const [value, setValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
    try {
      if (kind === "deposit") {
        await vaultClient.deposit(new PublicKey(token.mint), value);
        onDone();
      } else {
        await handleWithdraw(token.mint, value);
      }
    } catch (error) {
      console.error(`Failed to ${kind}:`, error);
      alert(`The ${kind} transaction failed.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pct = max === 0 ? 0 : (value / max) * 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: "0.5rem" }}>
          {kind === "deposit" ? "Deposit to Game Vault" : "Withdraw to Main Wallet"}
        </h3>

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
