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
        />
      </div>
      <MenuBar tokenBalance={tokenBalance} />

      <div className="how-to-play-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Superblob</summary>
            <ul>
              <li>Join a game: Every Supersize game has a token and a buy in. Pay to spawn as a blob.</li>
              <li>
                Boost: Your blob follows your mouse. Spend tokens (gold food) to boost forward. Use the{" "}
                <b>left click</b> to boost.
              </li>
              <li>
                Eat food: Food = tokens. Eat food to grow in size and earn tokens. Purple food is 7x the green food.
              </li>
              <li>
                Eat players: Bigger players can eat smaller players to gain their mass and steal their tokens. Bigger
                players move slower.
              </li>
              <li>
                Cash out: Exit the game anytime to cash out your tokens. There is a 5 second delay on exit and a 3% fee
                on cash out.
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "deposit"}>
            <summary>How to deposit</summary>
            <ul>
              <li>
                If using an external wallet (phantom, backpack, solflare...) as linked wallet
                <ul>
                  <li>
                    deposit → deposit from linked wallet → enter amount → deposit → sign transaction → tokens in your
                    account
                  </li>
                </ul>
              </li>
              <li>
                If NOT using an external wallet as linked wallet
                <ul>
                  <li>It’s NOT recommended to deposit from an unlinked wallet.</li>
                  <li>It is recommended to open a new account with your depositing wallet as the linked wallet.</li>
                  <li>Or you can fund the existing linked wallet and buy supercoin in the supermarket</li>
                </ul>
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "buy"}>
            <summary>How to buy SUPER SLIME tokens</summary>
            <ul>
              <li>
                On the app – supermarket
                <ul>
                  <li>
                    With CRYPTO
                    <ul>
                      <li>
                        If using an external wallet (phantom, backpack, solflare...) as linked wallet
                        <ul>
                          <li>buy with crypto → enter amount → buy → sign transaction → tokens in your account</li>
                        </ul>
                      </li>
                      <li>
                        If NOT using an external wallet as linked wallet
                        <ul>
                          <li>your linked wallet must have above 0.005 SOL</li>
                          <li>
                            your linked wallet must have enough SOL for the purchase. You can send SOL to your linked
                            wallet address.
                          </li>
                          <li>buy with crypto → enter amount → buy → tokens in your account</li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                  <li>
                    With CASH
                    <ul>
                      <li>buy with cash → proceed with stripe → tokens in your account</li>
                    </ul>
                  </li>
                </ul>
              </li>
              <li>
                Externally
                <ul>
                  <li>Super slime tokens can be bought or sold on exchanges like jup.ag</li>
                </ul>
              </li>
            </ul>
          </details>
          <details className="faq-item" open={section === "sell"}>
            <summary>How to sell SUPER SLIME tokens for cash</summary>
            <ul>
              <li>
                If using an external wallet (phantom, backpack, solflare...) as linked wallet
                <ul>
                  <li>
                    withdraw → withdraw to linked wallet → enter amount → withdraw → sign transaction → tokens in your
                    wallet
                  </li>
                  <li>sell on jup.ag</li>
                </ul>
              </li>
              <li>
                If NOT using an external wallet as linked wallet
                <ul>
                  <li>If you don’t already have a wallet create one with phantom.</li>
                  <li>
                    then you must buy at least 0.005 SOL and send it to your new wallet. Then go to jup.ag and purchase
                    1 supercoin. Then proceed with the withdrawal.
                  </li>
                  <li>
                    withdraw → withdraw to another wallet → paste address of wallet that will receive the tokens (wallet
                    must be holding more than 0 supercoins) → enter amount → withdraw → tokens in your wallet
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
