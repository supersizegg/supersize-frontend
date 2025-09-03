import React, { useState } from "react";
import GameLauncher from "@components/CreateGame/GameLauncher";
import AllCoins from "@components/InfoPanel/AllCoins";
import ModGame from "@components/InfoPanel/ModGame";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import { FetchedGame } from "@utils/types";
import AnimatedBackground from "@components/util/AnimatedBackground";
import "./CreateGame.scss";

type CreateGameProps = {
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
};

const CreateGame: React.FC<CreateGameProps> = ({ activeGamesLoaded, setActiveGamesLoaded }) => {
  const tabs = [0, 1, 2];
  const [tab, setTab] = useState(0);

  return (
    <div className="main-container">
      <AnimatedBackground />
      <MenuBar />
      <div className="create-game-wrapper" style={{ position: "relative", zIndex: 1 }}>
        <div className="create-game-card">
          {tab === 0 ? (
            <GameLauncher activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />
          ) : tab === 1 ? (
            <AllCoins />
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
