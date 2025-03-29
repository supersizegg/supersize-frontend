import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { MagicBlockEngineProvider } from "./engine/MagicBlockEngineProvider";

// eslint-disable-next-line
require("@solana/wallet-adapter-react-ui/styles.css");

function App() {
  return (
    <BrowserRouter>
      <MagicBlockEngineProvider>
        <AppRoutes />
      </MagicBlockEngineProvider>
    </BrowserRouter>
  );
}

export default App;
