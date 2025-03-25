import React from "react";
import { MenuBar } from "@components/menu/MenuBar";
import Footer from "@components/Footer";
import "./HowToPlay.scss";
import { Food } from "@utils/types";
import GameComponent from "@components/Game";
import BN from "bn.js";

type HowToPlayProps = {
  randomFood: Food[];
};

const HowToPlay: React.FC<HowToPlayProps> = ({ randomFood }) => {
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
          visibleFood={randomFood}
          currentPlayer={{
            name: "unnamed",
            authority: null,
            x: 2000,
            y: 2000,
            radius: 0,
            mass: 0,
            score: 0,
            speed: 0,
            removal: new BN(0),
            target_x: 0,
            target_y: 0,
          }}
          screenSize={{width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0, boost: false }}
          gameSize={4000}
        />
      </div>
      <MenuBar />

      <div className="how-to-play-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="top-blocks-row">
          <div className="block block1">
            <h2>Joining</h2>
            <p>
              Every Supersize game has a token and a buy-in. Pay the buy-in, then spawn as a blob.
            </p>
          </div>

          <div className="block block2">
            <h2>Basics</h2>
            <p>
              Your blob follows your mouse. Bigger players move slower than smaller players but can spend tokens to
              boost forward. Use the <b>left click to boost</b>.
            </p>
          </div>
        </div>

        <div className="top-blocks-row row-even">
          <div className="block block1">
            <h2>Food</h2>
            <p>
              Food = tokens. Eat food to grow in size and earn tokens. Purple food is 7x green food. Gold food is 200x normal food.
            </p>
          </div>
          <div className="block block2">
            <h2>Eat Players</h2>
            <p>Bigger players can eat smaller players to gain their mass and steal their tokens.</p>
          </div>
        </div>
        <div className="top-blocks-row">
          <div className="block block3">
            <div className="block3-text">
              <h2>Size Matters</h2>
              <p>Your size represents tokens. For example, if you have size 5 on the USDC map, you have $5.</p>
            </div>
            <div className="block3-image">
              <img src={`${process.env.PUBLIC_URL}/size-meme.png`} alt="Your size is not size" />
            </div>
          </div>
        </div>
        <div className="top-blocks-row">
          <div className="block block2">
            <h2>Cash Out</h2>
            <p>
              Exit the game anytime to cash out your tokens. There is a 5 second delay on exit and a 3% fee on cash out.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HowToPlay;
