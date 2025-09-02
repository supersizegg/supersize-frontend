import React, { createContext, useState, useContext, ReactNode } from 'react';

interface BalanceContextType {
  p2pBalance: number;
  f2pBalance: number;
  isBalanceLoading: boolean;
  refreshBalance: () => Promise<void>; 
  setP2PBalance: (balance: number) => void;
  setF2PBalance: (balance: number) => void;
  setIsBalanceLoading: (isLoading: boolean) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider = ({ children }: { children: ReactNode }) => {
  const [p2pBalance, setP2PBalance] = useState(0);
  const [f2pBalance, setF2PBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);

  const value = {
    p2pBalance,
    f2pBalance,
    isBalanceLoading,
    refreshBalance: async () => { console.error("refreshBalance called before it was implemented"); },
    setP2PBalance,
    setF2PBalance,
    setIsBalanceLoading,
  };

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};