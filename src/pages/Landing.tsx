import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Landing.scss";
import { BN } from "@coral-xyz/anchor";
import GameComponent from "@components/Game/Game";
import { MenuBar } from "@components/menu/MenuBar";

const Landing = ({ preferredRegion}: { preferredRegion: string }) => {
  const navigate = useNavigate();
  const openX = () => {
    window.open("https://x.com/SUPERSIZEgg", "_blank");
  };

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
            circles: [{x: 5000, y: 5000, radius: 0, size: 0, speed: 0}],
            removal: new BN(0),
            x: 5000,
            y: 5000,
            target_x: 5000,
            target_y: 5000,
            timestamp: 0,
          }}
          screenSize={{width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0}}
          gameSize={10000}
          buyIn={0}
        />
      </div>
      <MenuBar />
      <div 
        onClick={openX} 
        className="follow-x-button  follow-btn"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2b2d31")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1d1f23")}
      >
        <img 
          src={`${process.env.PUBLIC_URL}/x-logo.png`} 
          alt="X" 
          style={{ width: "16px", height: "16px" }}
        />
        Follow
      </div>
      <div className="panels">
        <div className="panel" onClick={() => navigate("/home")}> 
          <div className="inner-panel">
          <div className="overlay-panel" />
          <img src="/superblob.png" alt="SUPER BLOB" className="panel-image" style={{ width: "85%", height: "85%", margin: "auto", marginTop: "-20px"}}/>
          </div>
          <div className="panel-subtitle">multiplayer blob game </div>
        </div>
        <div className="panel disabled" style={{ pointerEvents: "none" }}>
          <div className="inner-panel" >
          <div className="overlay-panel" />
          <img src="/supersnake.png" alt="SUPER SNAKE" className="panel-image" />
          </div>
          <div className="panel-subtitle">coming soon!</div>
        </div>
      </div>
      <div className="promo-callout">
        <div className="promo-icon" >
          <img src="/slimeicon.png" alt="slime icon" className="promo-image" />
        </div>

        <div className="promo-text">Sign up for the <br/>app wishlist!</div>
      </div>
    </div>
  );
};

export default Landing;
