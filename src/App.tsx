import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { MagicBlockEngineProvider } from "./engine/MagicBlockEngineProvider";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import AnimatedBackground from "./components/util/AnimatedBackground";

function App() {
  return (
    <BrowserRouter>
      <PrivyProvider
        appId={process.env.REACT_APP_PRIVY_APP_ID || ""}
        config={{
          appearance: { walletChainType: "solana-only" },
          embeddedWallets: { solana: { createOnLogin: "all-users" } },
          externalWallets: {
            solana: { connectors: toSolanaWalletConnectors() },
          },
        }}
      >
        <MagicBlockEngineProvider>
          <AnimatedBackground />
          <AppRoutes />
        </MagicBlockEngineProvider>
      </PrivyProvider>
    </BrowserRouter>
  );
}

export default App;
