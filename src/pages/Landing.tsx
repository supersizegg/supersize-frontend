import React from "react";
import { useNavigate } from "react-router-dom";
import { MenuBar } from "@components/menu/MenuBar";
import "./Landing.scss";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <MenuBar />
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

    </div>
  );
};

export default Landing;
