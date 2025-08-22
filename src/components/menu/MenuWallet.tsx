import * as React from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";

import { Button } from "../util/Button";
import { usePrivy } from "@privy-io/react-auth";
import "./MenuWallet.scss";

export function MenuWallet({ setPreferredRegion }: { setPreferredRegion: (region: string) => void }) {
  const { engine } = useMagicBlockEngine();
  const walletConnected = engine.getWalletConnected();
  return (
    <div className="menu-wallet">
      {walletConnected ? <MenuWalletConnected setPreferredRegion={setPreferredRegion} /> : <MenuWalletDisconnected />}
    </div>
  );
}

function MenuWalletConnected({ setPreferredRegion }: { setPreferredRegion: (region: string) => void }) {
  const { engine } = useMagicBlockEngine();

  function truncateAddress(address: string): string {
    return address.slice(0, 4) + "..." + address.slice(-4);
  }

  const publicKey = engine.getWalletPayer();
  const addressBase58 = publicKey.toBase58();

  return (
    <div className="wallet-widget">
      <div className="wallet-info">
        <span>{truncateAddress(addressBase58)}</span>
        <button
          className="copy-button"
          data-text="Copy"
          onClick={(e) => {
            navigator.clipboard.writeText(addressBase58);
            const button = e.currentTarget;
            button.classList.add("copied");
            setTimeout(() => {
              button.classList.remove("copied");
            }, 1000);
          }}
          title="Copy to clipboard"
        >
          <img src="/copy.png" alt="Copy" />
        </button>
      </div>
      <button
        className="disconnect-button"
        onClick={() => {
          setPreferredRegion("");
          engine.selectWalletAdapter(null);
        }}
        aria-label="Disconnect Wallet"
      >
        <img src="/icons/logout.svg" alt="Disconnect" />
      </button>
    </div>
  );
}

function MenuWalletDisconnected() {
  const { login } = usePrivy();
  return (
    <div className="wallet-disconnected">
      <Button text="Sign In" className="sign-in-button" onClick={login} />
    </div>
  );
}
