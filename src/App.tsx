import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { MagicBlockEngineProvider } from "./engine/MagicBlockEngineProvider";
import { PrivyProvider } from "@privy-io/react-auth";


function App() {
  return (
    <BrowserRouter>
      <PrivyProvider
        appId={process.env.REACT_APP_PRIVY_APP_ID || ""}
        config={{ embeddedWallets: { createOnLogin: "all-users" } }}
      >
        <MagicBlockEngineProvider>
          <AppRoutes />
        </MagicBlockEngineProvider>
      </PrivyProvider>
    </BrowserRouter>
  );
}

export default App;
