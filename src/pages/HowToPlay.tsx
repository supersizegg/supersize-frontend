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
              <li>Join a game: join a free game to start collecting slimecoins or pay slimecoins to enter a high stakes game.</li>
              <li>
                Eat mass: mass = slimecoins. Eat pieces of mass to grow in size and earn slimecoins. In high stakes games, mass is worth more slimecoins.
              </li>
              <li>
                Eat blobs: Bigger blobs can eat smaller blobs to gain their mass and slimecoins. 
              </li>
              <li>
                Split:  Press space to split all you blobs greater than 50 mass into two, shooting the new blobs forward at high speed.
                You can only have a maximum of 8 blobs at a time.
              </li>
              <li>
                Cash out: Exit the game anytime to cash out your slimecoins. There is a 5 second delay on exit.
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
                    go to profile → deposit → enter amount → confirm deposit → sign transaction → tokens in your account
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
            <summary>How to buy slimecoins</summary>
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
                          <li>go to market → buy → go to profile → deposit slimecoins to your account</li>
                        </ul>
                      </li>
                      <li>
                        If not using an external wallet 
                        <ul>
                          <li>
                            your linked wallet must have enough SOL for the purchase. You can send SOL to your linked
                            wallet address.
                          </li>
                          <li>go to market → buy → go to profile → deposit slimecoins to your account</li>
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
                  <li>Slimecoins can be bought or sold on exchanges like jup.ag</li>
                </ul>
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "sell"}>
            <summary>How to sell slimecoins</summary>
            <ul>
              <li>
                If using an external wallet (phantom, backpack, solflare...)
                <ul>
                  <li>
                    go to profile → withdraw → enter amount → confirm withdraw → sign transaction → tokens in your wallet
                  </li>
                  <li>sell on jup.ag</li>
                </ul>
              </li>
              <li>
                If not using an external wallet 
                <ul>
                  <li>If you don’t already have an external wallet create one with phantom.</li>
                  <li>
                    then you must buy at least 0.005 SOL and send it to your new wallet. Then go to jup.ag and purchase
                    1 slimecoin. Then proceed with the withdrawal.
                  </li>
                  <li>
                    go to profile → withdraw → paste address of wallet that will receive the tokens (wallet
                    must be holding more than 0 slimecoins) → enter amount → confirm withdraw → tokens in your wallet
                  </li>
                  <li>sell on jup.ag</li>
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
