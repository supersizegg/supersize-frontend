import React from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.scss";
import { BN } from "@coral-xyz/anchor";
import GameComponent from "@components/Game/Game";
import { MenuBar } from "@components/menu/MenuBar";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import Footer from "../components/Footer/Footer";

type LandingProps = {
  preferredRegion: string;
  tokenBalance: number;
};

const Landing = ({ preferredRegion, tokenBalance }: LandingProps) => {
  const { engine } = useMagicBlockEngine();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="game-background">
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
          screenSize={{ width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0 }}
          gameSize={10000}
          buyIn={0}
          gameEnded={0}
        />
      </div>
      <MenuBar tokenBalance={tokenBalance} />
      <div className="panels-container">
        <div className="panel" onClick={() => navigate("/home")}>
          <div className="inner-panel">
            <img src="/blobgame.png" alt="SUPER BLOB" className="panel-image blob-game-image" />
            <div className="panel-text-overlay">
              <div className="panel-title desktop-only">Play now!</div>
            </div>
          </div>
        </div>
        <div className="panel disabled">
          <div className="inner-panel">
            <img src="/snakegame.png" alt="SUPER SNAKE" className="panel-image snake-game-image" />
            <div className="panel-text-overlay">
              <div className="panel-title">Coming soon</div>
            </div>
          </div>
        </div>
      </div>

      <Footer engine={engine} preferredRegion={preferredRegion} />
    </div>
  );
};

export default Landing;
