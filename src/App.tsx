import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { MagicBlockEngineProvider } from "./engine/MagicBlockEngineProvider";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";


function App() {
  return (
    <BrowserRouter>
      <PrivyProvider
        appId={process.env.REACT_APP_PRIVY_APP_ID || ""}
        config={{
          appearance: {walletChainType: 'solana-only'},
          embeddedWallets: { createOnLogin: "all-users" },
          externalWallets: {
            solana: {connectors: toSolanaWalletConnectors()}
          }
        }}
        >
        <MagicBlockEngineProvider>
          <AppRoutes />
        </MagicBlockEngineProvider>
      </PrivyProvider>
    </BrowserRouter>
  );
}

export default App;
