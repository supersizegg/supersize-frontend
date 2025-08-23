import React from "react";
import { useLocation } from "react-router-dom";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import GameComponent from "@components/Game/Game";
import BN from "bn.js";
import "./AboutPage.scss";
import AnimatedBackground from "../components/util/AnimatedBackground";

type AboutPageProps = {
  tokenBalance: number;
};

const AboutPage: React.FC<AboutPageProps> = ({ tokenBalance }) => {
  const location = useLocation();
  const section = new URLSearchParams(location.search).get("section");

  return (
    <div className="about-page">
      <AnimatedBackground />

      <MenuBar tokenBalance={tokenBalance} />

      <main className="about-content">
        <h1 className="about-title">How to Play</h1>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Blob Battle</summary>
            <ul>
              <li>Join a free game or deposit coins to enter a high stakes game.</li>
              <li>Eat mass to grow and earn coins. In high stakes games, mass is worth more coins.</li>
              <li>Bigger blobs can eat smaller blobs to gain their mass and coins.</li>
              <li>Press space to split your blobs. This shoots new blobs forward at high speed.</li>
              <li>Blobs merge automatically every 15 seconds.</li>
              <li>Exit the game anytime to cash out your coins (5 second delay).</li>
            </ul>
          </details>
          <details className="faq-item" open={section === "deposit"}>
            <summary>How to Deposit</summary>
            <ul>
              <li>Using an external wallet (like Phantom):</li>
              <ul>
                <li>Go to Profile → Deposit → Enter Amount → Confirm and sign the transaction.</li>
              </ul>
              <li>Without an external wallet:</li>
              <ul>
                <li>It is recommended to create a new account and link your funding wallet during setup.</li>
              </ul>
            </ul>
          </details>
          <details className="faq-item" open={section === "buy"}>
            <summary>How to Buy Slimecoin</summary>
            <ul>
              <li>With Crypto:</li>
              <ul>
                <li>
                  Go to Market → Buy. Ensure your linked wallet has enough SOL for the purchase. After buying, you must
                  still deposit the Slimecoin into your game account via the Profile page.
                </li>
              </ul>
              <li>With Cash:</li>
              <ul>
                <li>Coming soon!</li>
              </ul>
              <li>Externally:</li>
              <ul>
                <li>Slimecoin can be bought or sold on any Solana DEX, like Jupiter (jup.ag).</li>
              </ul>
            </ul>
          </details>
          <details className="faq-item" open={section === "sell"}>
            <summary>How to Sell Slimecoin</summary>
            <ul>
              <li>
                Go to Profile → Withdraw → Enter Amount → Confirm and sign to send tokens to your external wallet.
              </li>
              <li>Once in your wallet, you can sell on an exchange like Jupiter (jup.ag).</li>
            </ul>
          </details>
        </div>
      </main>

      <BackButton />
    </div>
  );
};

export default AboutPage;
