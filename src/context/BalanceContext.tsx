import React, { createContext, useState, useContext, ReactNode, useCallback, useRef } from "react";

interface BalanceContextType {
  p2pBalance: number;
  f2pBalance: number;
  isBalanceLoading: boolean;

  refreshBalance: () => Promise<void>;
  registerRefreshBalance: (impl: () => Promise<void>) => void;
  setP2PBalance: (balance: number) => void;
  setF2PBalance: (balance: number) => void;
  setIsBalanceLoading: (isLoading: boolean) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider = ({ children }: { children: ReactNode }) => {
  const [p2pBalance, setP2PBalance] = useState(0);
  const [f2pBalance, setF2PBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);

  const refreshImplRef = useRef<(() => Promise<void>) | null>(null);

  const registerRefreshBalance = useCallback((impl: () => Promise<void>) => {
    refreshImplRef.current = impl;
  }, []);

  const refreshBalance = useCallback(async () => {
    if (refreshImplRef.current) {
      await refreshImplRef.current();
    } else {
      console.error("refreshBalance called before it was implemented");
    }
  }, []);

  const value: BalanceContextType = {
    p2pBalance,
    f2pBalance,
    isBalanceLoading,
    refreshBalance,
    registerRefreshBalance,
    setP2PBalance,
    setF2PBalance,
    setIsBalanceLoading,
  };

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error("useBalance must be used within a BalanceProvider");
  }
  return context;
};
