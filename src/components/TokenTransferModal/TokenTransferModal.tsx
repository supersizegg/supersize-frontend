import React, { useEffect, useState, useRef, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { SupersizeVaultClient } from "@engine/SupersizeVaultClient";
import NotificationService from "@components/notification/NotificationService";
import { formatBuyIn } from "../../utils/helper";
import { cachedTokenMetadata } from "../../utils/constants";
import "./Modal.scss";

type Props = {
  engine?: { getWalletType: () => string | undefined };
  vaultClient: SupersizeVaultClient;
  kind: "deposit" | "withdraw";
  token: { mint: string; symbol: string; decimals: number };
  sessionBalance: number;
  fetchWalletBalance: (mint: string) => Promise<number>;
  onClose: () => void;
  onDone: () => void;
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
}) => {
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipient, setRecipient] = useState<string>("");
  const [addrTouched, setAddrTouched] = useState(false);

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

  const allowCustomRecipient = useMemo(() => {
    try {
      return kind === "withdraw" && engine?.getWalletType?.() === "embedded";
    } catch {
      return false;
    }
  }, [engine, kind]);

  const isValidSolanaAddress = (addr: string) => {
    try {
      new PublicKey(addr);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const setAmount = (fraction: number) => {
    const value = maxAmount * fraction;
    setInputValue(Math.floor(value).toFixed(0));
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
        const payoutWalletKey = allowCustomRecipient ? new PublicKey(recipient) : null;
        await vaultClient.executeWithdraw(new PublicKey(token.mint), numericValue, payoutWalletKey);
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
  const recipientInvalid = allowCustomRecipient ? !recipient || !isValidSolanaAddress(recipient) : false;
  const disableSubmit = isInvalid || isProcessing || inputValue === "" || recipientInvalid;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {allowCustomRecipient && (
          <>
            <div className="input-group">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                onBlur={() => setAddrTouched(true)}
                placeholder="Wallet address"
                className={`address-input ${addrTouched && recipientInvalid ? "invalid" : ""}`}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
            {addrTouched && recipientInvalid && <p className="error-message">Enter a valid Solana address</p>}
          </>
        )}

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

        <button className="submit-button" disabled={disableSubmit} onClick={handleConfirm}>
          {isProcessing ? "Processing..." : `Confirm ${kind === "deposit" ? "Deposit" : "Withdraw"}`}
        </button>
      </div>
    </div>
  );
};

export default TokenTransferModal;
