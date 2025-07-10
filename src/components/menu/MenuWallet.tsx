import * as React from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";

import { Button } from "../util/Button";
import { Text } from "../util/Text";
import { usePrivy } from "@privy-io/react-auth";
import "./MenuWallet.scss";

export function MenuWallet() {
  const engine = useMagicBlockEngine();
  const walletConnected = engine.getWalletConnected();

  return <div className="menu-wallet">{walletConnected ? <MenuWalletConnected /> : <MenuWalletDisconnected />}</div>;
}

function MenuWalletConnected() {
  const engine = useMagicBlockEngine();

  function truncateAddress(address: string): string {
    return address.slice(0, 4) + "..." + address.slice(-4);
  }

  const publicKey = engine.getWalletPayer();
  const addressBase58 = publicKey.toBase58();

  return (
    <div className="wallet-connected desktop-only">
      <div className="wallet-info">
        <Text value={truncateAddress(addressBase58)} />
      </div>
      <button
        className="wallet-disconnect-button"
        onClick={() => {
          engine.selectWalletAdapter(null);
        }}
      >
        <img src="/icons/logout.svg" className="logout-icon" alt="Disconnect" />
      </button>
    </div>
  );
}

function MenuWalletDisconnected() {
  const { login } = usePrivy();

  return (
    <div className="wallet-disconnected desktop-only">
      <Button
        text="Connect Wallet"
        className="connect-wallet-button"
        onClick={login}
      />
    </div>
  );
}
