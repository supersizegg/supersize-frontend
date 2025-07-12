import React from "react";
import "./Footer.css";
import "../../pages/Landing.scss";
import { useNavigate } from "react-router-dom";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="footerContainer desktop-only">
      <span className="footerCopyright">{/* © Supersize Inc. 2025 */}</span>

      <div className="footerIcons">
        <button
            onClick={() => navigate("/create-game")}
          >
          <div className="coin-pill" style={{ position: "fixed", zIndex: "1", bottom: "2rem", right: "2.5rem", width: "170px", height: "50px"}}>
            <div className="overlay-panel" style={{ borderRadius: "10px", border: "3px solid transparent"}}/>
            <span style={{ position: "absolute", zIndex: "1", fontSize: "18px", fontWeight: "bold", margin: "auto"}}>+ Create Game</span>
          </div>
          </button>
      </div>
    </footer>
  );
};

export default Footer;
