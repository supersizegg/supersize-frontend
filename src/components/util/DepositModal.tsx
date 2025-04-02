import React, { useState } from 'react';
import './Modal.css';
import { PublicKey } from '@solana/web3.js';
import { QRCodeSVG } from "qrcode.react";

interface DepositModalProps {
  walletAddress: PublicKey;
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number) => void;
}

type DepositMode = 'selection' | 'thisWallet' | 'anotherWallet';

const DepositModal: React.FC<DepositModalProps> = ({ walletAddress, isOpen, onClose, onDeposit }) => {
  const [mode, setMode] = useState<DepositMode>('selection');
  const [selectedDeposit, setSelectedDeposit] = useState<number | null>(null);
  const options: number[] = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0];

  if (!isOpen) return null;

  const handleDepositSubmit = () => {
    if (selectedDeposit !== null) {
      onDeposit(selectedDeposit);
    }
  };

  const renderSelection = () => (
    <div className="mode-selection">
      <button className="mode-button" onClick={() => setMode('thisWallet')}>
        Deposit from this wallet
      </button>
      <button className="mode-button" onClick={() => setMode('anotherWallet')}>
        Deposit from another wallet
      </button>
    </div>
  );

  const renderThisWallet = () => (
    <>
      <p style={{ fontSize: '18px' }}>Choose Deposit Amount</p>
      <div className="deposit-options">
        {options.map((amount, index) => (
          <button
            key={index}
            className={`deposit-button ${selectedDeposit === amount ? 'selected' : ''}`}
            onClick={() => setSelectedDeposit(amount)}
          >
            {amount} SOL
          </button>
        ))}
      </div>
      <button 
        className="deposit-submit" 
        onClick={handleDepositSubmit} 
        disabled={selectedDeposit === null}
      >
        Deposit
      </button>
    </>
  );

  const renderAnotherWallet = () => {
    return (
      <div className="another-wallet">
        <QRCodeSVG value={walletAddress.toString()} size={256} includeMargin={true} style={{margin: '0 auto', borderRadius: '8px'}}/>
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px' }}>Send SOL to:</p>
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '9px' }}>{walletAddress.toString()}</p>
        <button 
          className="deposit-submit" 
          onClick={async () => {
            await navigator.clipboard.writeText(walletAddress.toString());
            const button = document.querySelector('.deposit-submit');
            if (button) {
              const originalText = button.textContent;
              button.textContent = 'Copied';
              setTimeout(() => {
                button.textContent = originalText;
              }, 1000);
            }
          }}
          style={{ display: 'block', textAlign: 'center', fontSize: '12px', width: '100%', marginTop: '10px' }}
        >
          Copy Address
        </button>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={() => {setMode('selection'); setSelectedDeposit(null); onClose()}}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {mode === 'selection' && renderSelection()}
        {mode === 'thisWallet' && renderThisWallet()}
        {mode === 'anotherWallet' && renderAnotherWallet()}
      </div>
    </div>
  );
};

export default DepositModal;
