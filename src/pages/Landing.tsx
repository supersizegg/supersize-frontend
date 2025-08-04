import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Landing.scss";
import { BN } from "@coral-xyz/anchor";
import GameComponent from "@components/Game/Game";
import { MenuBar } from "@components/menu/MenuBar";
import SignUpBanner from "../components/util/SignUpBanner";
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
          screenSize={{ width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0 }}
          gameSize={10000}
          buyIn={0}
        />
      </div>
      <MenuBar tokenBalance={tokenBalance} />
      <div className="panels">
        <div className="panel"
          onMouseEnter={(e) => {
            const goButton = e.currentTarget.querySelector<HTMLElement>(".inner-panel");
            if (goButton) {
              goButton.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            const goButton = e.currentTarget.querySelector<HTMLElement>(".inner-panel");
            if (goButton) {
              goButton.style.opacity = "1";
            }
          }}>
          <div className="inner-panel" onClick={() => navigate("/home")}>
            <div className="overlay-panel"/>
            <img
              src="/blobgame.png"
              alt="SUPER BLOB"
              className="panel-image"
              style={{ width: "100%", height: "100%", margin: "auto"}}
            />
          </div>
          <div className="panel-subtitle">Play now!</div>
        </div>
        <div className="panel disabled" style={{ pointerEvents: "none" }}>
          <div className="inner-panel">
            <div className="overlay-panel" />
            <img src="/snakegame.png" alt="SUPER SNAKE" className="panel-image" 
            style={{ width: "85%", height: "85%", margin: "auto", marginTop: "-20px" }}/>
          </div>
          <div className="panel-subtitle">coming soon</div>
        </div>
      </div>
      {/*
      <div className="promo-callout" onClick={() => navigate("/wishlist")}>
        <div className="promo-icon">
          <img src="/slimeicon.png" alt="slime icon" className="promo-image" />
        </div>

        <div className="promo-text">
          Sign up for the <br />
          app wishlist!
        </div>
      </div>
      */}

      <Footer/>
      <SignUpBanner engine={engine} preferredRegion={preferredRegion} />
    </div>
  );
};

export default Landing;
