import React from "react";
import { useLocation } from "react-router-dom";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import "./HowToPlay.scss";
import GameComponent from "@components/Game/Game";
import BN from "bn.js";

type HowToPlayProps = {
  tokenBalance: number;
};

const HowToPlay: React.FC<HowToPlayProps> = ({ tokenBalance }) => {
  const location = useLocation();
  const section = new URLSearchParams(location.search).get("section");
  return (
    <div className="main-container">
      <div
        className="game"
        style={{
          display: "block",
          position: "absolute",
          top: "0",
          left: "0",
          height: "100%",
          width: "100%",
          zIndex: "0",
        }}
      >
        <GameComponent
          players={[]}
          visibleFood={[]}
          currentPlayer={{
            name: "",
            authority: null,
            score: 0,
            circles: [{ x: 5000, y: 5000, radius: 0, size: 0, speed: 0 }],
            removal: new BN(0),
            join: new BN(0),
            x: 5000,
            y: 5000,
            target_x: 5000,
            target_y: 5000,
            timestamp: 0,
          }}
          screenSize={{
            width: window.innerWidth,
            height: window.innerHeight,
          }}
          newTarget={{ x: 0, y: 0 }}
          gameSize={10000}
          buyIn={0}
          gameEnded={0}
        />
      </div>
      <MenuBar tokenBalance={tokenBalance} />

      <div className="how-to-play-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Blob Battle</summary>
            <ul>
              <li>Join a free game or pay coins to enter a high stakes game.</li>
              <li>
                Eat mass to grow and earn coins. In high stakes games, mass is worth more coins.
              </li>
              <li>
                Bigger blobs can eat smaller blobs to gain their mass and coins. 
              </li>
              <li>
                Press space to split all your blobs greater than 50 mass into two. Splitting shoots new blobs forward at high speed.
                You can have a maximum of 8 blobs at a time.
              </li>
              <li>
                Blobs merge every 15 seconds if you have more than 2 blobs. 
              </li>
              <li>
                Exit the game anytime to cash out your coins. There is a 5 second delay on exit.
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "deposit"}>
            <summary>How to deposit</summary>
            <ul>
              <li>
                If using an external wallet (phantom, backpack, solflare...) 
                <ul>
                  <li>
                    Go to profile → deposit → enter amount → confirm deposit → sign transaction → tokens in your account
                  </li>
                </ul>
              </li>
              <li>
                If not using an external wallet 
                <ul>
                  <li>It is recommended to open a new account with your depositing wallet as the linked wallet.</li>
                </ul>
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "buy"}>
            <summary>How to buy slimecoin</summary>
            <ul>
              <li>
                On the app
                <ul>
                  <li>
                    With CRYPTO
                    <ul>
                      <li>
                        If using an external wallet (phantom, backpack, solflare...) 
                        <ul>
                          <li>Go to market → buy → go to profile → deposit slimecoin to your account</li>
                        </ul>
                      </li>
                      <li>
                        If not using an external wallet 
                        <ul>
                          <li>
                            Your linked wallet must have enough SOL for the purchase. You can send SOL to your linked
                            wallet address.
                          </li>
                          <li>Go to market → buy → go to profile → deposit slimecoin to your account</li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                  <li>
                    With CASH
                    <ul>
                      <li>Coming soon</li>
                    </ul>
                  </li>
                </ul>
              </li>
              <li>
                Externally
                <ul>
                  <li>Slimecoin can be bought or sold on exchanges like jup.ag</li>
                </ul>
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "sell"}>
            <summary>How to sell slimecoin</summary>
            <ul>
              <li>
                If using an external wallet (phantom, backpack, solflare...)
                <ul>
                  <li>
                    Go to profile → withdraw → enter amount → confirm withdraw → sign transaction → tokens in your wallet
                  </li>
                  <li>Sell on jup.ag</li>
                </ul>
              </li>
              <li>
                If not using an external wallet 
                <ul>
                  <li>If you don’t already have an external wallet create one with phantom and fund it with SOL.</li>
                  <li>
                    Your external wallet must hold {">"} 0 slimecoin.
                  </li>
                  <li>
                    Go to profile → withdraw → paste address of wallet that will receive the coins → 
                    enter amount → confirm withdraw → tokens in your wallet
                  </li>
                  <li>Sell on jup.ag</li>
                </ul>
              </li>
            </ul>
          </details>
        </div>
      </div>
      <BackButton />
    </div>
  );
};

export default HowToPlay;
