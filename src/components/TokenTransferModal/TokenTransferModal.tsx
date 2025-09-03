import React, { useEffect, useState, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { SupersizeVaultClient } from "@engine/SupersizeVaultClient";
import NotificationService from "@components/notification/NotificationService";
import { formatBuyIn } from "../../utils/helper";
import { cachedTokenMetadata } from "../../utils/constants";
import "./Modal.scss";

type Props = {
  vaultClient: SupersizeVaultClient;
  kind: "deposit" | "withdraw";
  token: { mint: string; symbol: string; decimals: number };
  sessionBalance: number;
  fetchWalletBalance: (mint: string) => Promise<number>;
  onClose: () => void;
  onDone: () => void;
};

const TokenTransferModal: React.FC<Props> = ({
  vaultClient,
  kind,
  token,
  sessionBalance,
  fetchWalletBalance,
  onClose,
  onDone,
}) => {
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (kind !== "deposit") return;

    let cancelled = false;

    (async () => {
      const amount = await fetchWalletBalance(token.mint);
      if (!cancelled) setMaxAmount(amount);
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, token.mint, fetchWalletBalance]);

  useEffect(() => {
    if (kind !== "withdraw") return;
    setMaxAmount(sessionBalance);
  }, [kind, sessionBalance]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const setAmount = (fraction: number) => {
    const value = maxAmount * fraction;
    setInputValue(value.toFixed(token.decimals > 0 ? 2 : 0));
  };

  const handleConfirm = async () => {
    const numericValue = parseFloat(inputValue);
    if (isNaN(numericValue) || numericValue <= 0 || numericValue > maxAmount || isProcessing) {
      return;
    }

    setIsProcessing(true);
    const alertId = NotificationService.addAlert({
      type: "success",
      message: `Submitting ${kind}... Please check your wallet.`,
      shouldExit: false,
    });

    try {
      if (kind === "deposit") {
        await vaultClient.executeDeposit(new PublicKey(token.mint), numericValue);
      } else {
        await vaultClient.executeWithdraw(new PublicKey(token.mint), numericValue);
      }
      onDone();
    } catch (error: any) {
      const isUserRejection = error.code === 4001 || error.name === "WalletSignTransactionError";
      if (isUserRejection) {
        NotificationService.addAlert({
          type: "success",
          message: "Transaction cancelled.",
          shouldExit: true,
          timeout: 4000,
        });
        onClose();
      } else {
        NotificationService.addAlert({
          type: "error",
          message: `${kind} failed. Please try again.`,
          shouldExit: true,
          timeout: 4000,
        });
      }
    } finally {
      NotificationService.updateAlert(alertId, { shouldExit: true });
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  const numericValue = parseFloat(inputValue) || 0;
  const isInvalid = numericValue > maxAmount || numericValue <= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        <div className="modal-header">
          <img src={cachedTokenMetadata[token.mint]?.image || ""} alt={token.symbol} className="token-icon" />
          <h3>
            {kind === "deposit" ? "Deposit" : "Withdraw"} {token.symbol}
          </h3>
        </div> */}

        <div className="balance-info">
          <span>Available Balance</span>
          <strong>{Math.floor(maxAmount)}</strong>
        </div>

        <div className="input-group">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="0.00"
            className={`amount-input ${isInvalid && inputValue !== "" ? "invalid" : ""}`}
          />
          <span className="token-symbol-in-input">{token.symbol}</span>
        </div>
        {isInvalid && inputValue !== "" && <p className="error-message">Amount exceeds your available balance</p>}

        <div className="quick-select-buttons">
          <button onClick={() => setAmount(0.25)}>25%</button>
          <button onClick={() => setAmount(0.5)}>50%</button>
          <button onClick={() => setAmount(0.75)}>75%</button>
          <button onClick={() => setAmount(1)}>Max</button>
        </div>

        <button
          className="submit-button"
          disabled={isInvalid || isProcessing || inputValue === ""}
          onClick={handleConfirm}
        >
          {isProcessing ? "Processing..." : `Confirm ${kind === "deposit" ? "Deposit" : "Withdraw"}`}
        </button>
      </div>
    </div>
  );
};

export default TokenTransferModal;
