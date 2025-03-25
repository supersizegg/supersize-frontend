import React, { useState } from "react";
import LanchGame from "@components/LaunchGame";
import EarnFees from "@components/EarnFees";
import ModGame from "@components/ModGame";
import { MenuBar } from "@components/menu/MenuBar";
import FooterLink from "@components/Footer";
import { FetchedGame, Food } from "@utils/types";
import "./CreateGame.scss";
import GameComponent from "@components/Game";
import { BN } from "@coral-xyz/anchor";

type CreateGameProps = {
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
  randomFood: Food[];
};

const CreateGame: React.FC<CreateGameProps> = ({ activeGamesLoaded, setActiveGamesLoaded, randomFood }) => {
  const tabs = [0, 1, 2];
  const [tab, setTab] = useState(0);

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
      <div className="create-game-wrapper" style={{ position: "relative", zIndex: 1 }}>
        <div className="create-game-card">
          {tab === 0 ? (
            <LanchGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />
          ) : tab === 1 ? (
            <EarnFees />
          ) : (
            <ModGame />
          )}
        </div>
        <div className="tab-selector">
          {tabs.map((tabIdx) => (
            <div
              key={tabIdx}
              className={`tab-dot ${tabIdx === tab ? "active" : ""}`}
              onClick={() => setTab(tabIdx)}
            ></div>
          ))}
        </div>
      </div>
      <FooterLink />
    </div>
  );
};

export default CreateGame;
