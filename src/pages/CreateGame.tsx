import React, { useState } from "react";
import GameLauncher from "@components/CreateGame/GameLauncher";
import EarnFees from "@components/InfoPanel/EarnFees";
import ModGame from "@components/InfoPanel/ModGame";
import { MenuBar } from "@components/menu/MenuBar";
import FooterLink from "@components/Footer/Footer";
import BackButton from "@components/util/BackButton";
import { FetchedGame, Food } from "@utils/types";
import "./CreateGame.scss";
import GameComponent from "@components/Game/Game";
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
            name: "",
            authority: null,
            score: 0,
            circles: [{x: 5000, y: 5000, radius: 0, size: 0, speed: 0}],
            removal: new BN(0),
            x: 5000,
            y: 5000,
            target_x: 5000,
            target_y: 5000,
            timestamp: 0,
          }}
          screenSize={{width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0 }}
          gameSize={10000}
          buyIn={0}
        />
      </div>
      <MenuBar />
      <div className="create-game-wrapper" style={{ position: "relative", zIndex: 1 }}>
        <div className="create-game-card">
          {tab === 0 ? (
            <GameLauncher activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />
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
      <BackButton />
    </div>
  );
};

export default CreateGame;
