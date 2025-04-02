import React, { useState } from 'react';
import './Modal.css';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Adjust the transaction cost as needed
const TRANSACTION_COST_LAMPORTS = 5000;

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountBalance: number | undefined; // in lamports
  onWithdraw: (amount: number, recipient?: PublicKey | undefined) => void; // amount in SOL; recipientWallet if withdrawing to another wallet
}

type WithdrawalMode = 'selection' | 'thisWallet' | 'anotherWallet';

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  accountBalance,
  onWithdraw,
}) => {
  const [mode, setMode] = useState<WithdrawalMode>('selection');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [recipientWallet, setRecipientWallet] = useState<string>('');

  if (!isOpen) return null;

  const maxWithdrawalInSOL =
    accountBalance !== undefined
      ? ((accountBalance - TRANSACTION_COST_LAMPORTS) / LAMPORTS_PER_SOL).toFixed(3)
      : '0';

  const handleWithdraw = () => {
    const isAmountValid =
    !isNaN(parseFloat(withdrawAmount)) &&
    accountBalance !== undefined &&
    parseFloat(withdrawAmount) * LAMPORTS_PER_SOL <= accountBalance - TRANSACTION_COST_LAMPORTS;
    const amount = parseFloat(withdrawAmount);
    if (!isNaN(amount) && isAmountValid) {
      if (mode === 'anotherWallet' && recipientWallet.trim() === '') {
        console.error('Recipient wallet address is required.');
        return;
      }
      if (mode === 'anotherWallet' && recipientWallet.trim() !== '') {
        if (!PublicKey.isOnCurve(recipientWallet)) {
            console.error('Invalid recipient wallet address.');
            return;
          }
      }
      onWithdraw(amount, mode === 'anotherWallet' ? new PublicKey(recipientWallet) : undefined);
    } else {
      console.error('Withdrawal amount exceeds available balance or is invalid.');
    }
  };

  const renderSelection = () => (
    <div className="mode-selection">
      <button className="mode-button" onClick={() => setMode('thisWallet')}>
        Withdraw to this wallet
      </button>
      <button className="mode-button" onClick={() => setMode('anotherWallet')}>
        Withdraw to another wallet
      </button>
    </div>
  );

  const renderWithdrawalForm = () => (
    <>
      <div className="withdrawal-content">
        <p>
          Account Balance:{' '}
          {accountBalance !== undefined ? (accountBalance / LAMPORTS_PER_SOL).toFixed(3) : 0} SOL
        </p>
        <label className="withdrawal-label">
          Amount to withdraw:
          <div className="withdrawal-input-group">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              style={{ color: 'black' }}
              placeholder="Enter amount"
            />
            <button
              type="button"
              className="max-button"
              style={{ marginLeft: '10px' }}
              onClick={() => setWithdrawAmount(maxWithdrawalInSOL)}
            >
              Max
            </button>
          </div>
        </label>
        {mode === 'anotherWallet' && (
          <label className="withdrawal-label" style={{width: '100%'}}>
            Wallet to receive SOL:
            <input
              type="text"
              value={recipientWallet}
              onChange={(e) => setRecipientWallet(e.target.value)}
              style={{ color: 'black', width:"100%" }}
              placeholder="Enter wallet address"
            />
          </label>
        )}
        <button
          className="submit-button"
          style={{marginTop: '10px'}}
          onClick={handleWithdraw}
          disabled={
            !(!isNaN(parseFloat(withdrawAmount)) &&
                accountBalance !== undefined &&
            parseFloat(withdrawAmount) * LAMPORTS_PER_SOL <= accountBalance - TRANSACTION_COST_LAMPORTS) ||
            (mode === 'anotherWallet' && recipientWallet.trim() === '')
          }
        >
          Withdraw
        </button>
      </div>
    </>
  );

  return (
    <div className="modal-overlay" onClick={() => {setMode('selection'); setWithdrawAmount(''); setRecipientWallet(''); onClose()}}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {mode === 'selection' ? renderSelection() : renderWithdrawalForm()}
      </div>
    </div>
  );
};

export default WithdrawalModal;
