import React from "react";
import "./Footer.css";
import "../../pages/Landing.scss";
import { useNavigate } from "react-router-dom";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const openX = () => {
    window.open("https://x.com/SUPERSIZEgg", "_blank");
  };

  return (
    <footer className="footerContainer desktop-only">

      <div className="footerIcons">
            <button onClick={() => navigate("/about")} className="help-btn">
              <span className="desktop-only">?</span>
              <span className="mobile-only">?</span>
            </button>
            <button
              onClick={openX}
              className="follow-x-button"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2b2d31")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1d1f23")}
            >
              <img src={`${process.env.PUBLIC_URL}/x-logo.png`} alt="X" style={{ width: "16px", height: "16px" }} />
              Follow
            </button>
      </div>
    </footer>
  );
};

export default Footer;
