import React from "react";
import { Spinner } from "../util/Spinner";
import "./TxnModal.scss";

type TxnModalProps = {
  isOpen: boolean;
  onClose: () => void;
  transactions: { id: string; status: string }[];
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>;
  errorMessage: string;
  handleUserRetry: () => void;
  newGameId: string;
  gameCreated: boolean;
};

const steps: { [key: string]: string } = {
  "transfer-sol": "Transferring SOL",
  "init-world": "Initializing world",
  "create-map": "Creating map",
  "create-food-entities": "Creating food entities",
  "create-player-entities": "Creating player entities",
  "create-anteroom": "Creating anteroom",
  "init-map-component": "Initializing map component",
  "init-food-components": "Initializing food components",
  "init-player-components": "Initializing player components",
  "init-anteroom-component": "Initializing anteroom component",
  "setup-vault": "Setting up vault",
  "initialize-game": "Initializing game",
  "init-players": "Initializing players",
  "init-anteroom": "Initializing anteroom",
  "delegate-map": "Delegating map",
  "delegate-food-1": "Delegating food 1/10",
  "delegate-food-2": "Delegating food 2/10",
  "delegate-food-3": "Delegating food 3/10",
  "delegate-food-4": "Delegating food 4/10",
  "delegate-food-5": "Delegating food 5/10",
  "delegate-food-6": "Delegating food 6/10",
  "delegate-food-7": "Delegating food 7/10",
  "delegate-food-8": "Delegating food 8/10",
  "delegate-food-9": "Delegating food 9/10",
  "delegate-food-10": "Delegating food 10/10",
  "delegate-players-1": "Delegating players 1/10",
  "delegate-players-2": "Delegating players 2/10",
  "delegate-players-3": "Delegating players 3/10",
  "delegate-players-4": "Delegating players 4/10",
  "delegate-players-5": "Delegating players 5/10",
  "delegate-players-6": "Delegating players 6/10",
  "delegate-players-7": "Delegating players 7/10",
  "delegate-players-8": "Delegating players 8/10",
  "delegate-players-9": "Delegating players 9/10",
  "delegate-players-10": "Delegating players 10/10",
  "init-food": "Initializing food",
  "reclaim-sol": "Reclaiming leftover SOL",
};

const TxnModal: React.FC<TxnModalProps> = ({
  isOpen,
  onClose,
  transactions,
  setTransactions,
  errorMessage,
  handleUserRetry,
  newGameId,
  gameCreated,
}) => {
  if (!isOpen) return null;

  async function updateTransaction(
    setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
    id: string,
    status: string,
  ) {
    setTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, status } : txn)));
  }

  const hasFailedTransactions = transactions.some((txn) => txn.status === "failed");

  return (
    <div className="txn-modal-overlay">
      <div className="txn-modal-container">
        <header className="txn-modal-header">
          <h2 className="txn-modal-title">
            {!gameCreated ? `Creating Game: ${newGameId}` : `Success! Game ID: ${newGameId}`}
          </h2>
          <button
            className="txn-modal-close-button"
            onClick={onClose}
            disabled={!gameCreated && !hasFailedTransactions}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="close-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="txn-modal-body">
          <div className="txn-modal-transactions-list">
            {transactions
              .slice()
              .reverse()
              .map((txn, index) => (
                <div key={index} className="txn-modal-transaction-item">
                  <span className="txn-modal-transaction-id">
                    <p className="txn-modal-transaction-id-text">{steps[txn.id] ? `${steps[txn.id]}...` : txn.id}</p>
                  </span>
                  <div className="txn-modal-transaction-status">
                    {txn.status}
                    {txn.status !== "confirmed" && txn.status !== "failed" ? (
                      <Spinner />
                    ) : (
                      <>
                        {txn.status === "confirmed" ? (
                          <p className="success-icon">&nbsp;</p>
                        ) : (
                          <p className="failed-icon">X</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <footer className="txn-modal-footer">
          {hasFailedTransactions ? (
            <>
              <div className="txn-modal-error-container">
                {errorMessage !== "" && (
                  <p className="txn-modal-error-message">
                    {errorMessage} <br />
                    <span className="txn-modal-retry-prompt">Would you like to retry?</span>
                  </p>
                )}
              </div>
              <button
                className="txn-modal-retry-button"
                onClick={() => {
                  const failedTxn = transactions.find((txn) => txn.status === "failed");
                  if (failedTxn) {
                    handleUserRetry();
                    updateTransaction(setTransactions, failedTxn.id, "pending");
                  }
                }}
              >
                Retry and Resume
              </button>
            </>
          ) : (
            <div className="footer-content">
              {!gameCreated ? (
                <>
                  <p className="info-text" style={{ marginTop: 0, marginBottom: "10px" }}>
                    Deployment process can take 5-30 minutes. Please wait...
                  </p>
                  <button
                    className="txn-modal-restart-button"
                    onClick={() => {
                      handleUserRetry();
                      const failedTxn = transactions.find((txn) => txn.status === "failed");
                      if (failedTxn) {
                        updateTransaction(setTransactions, failedTxn.id, "pending");
                      }
                    }}
                  >
                    Restart Current Txn and Resume
                  </button>
                </>
              ) : (
                <p className="create-game-success-text">
                  Success! Game ID: <b>{newGameId}</b>
                </p>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default TxnModal;
