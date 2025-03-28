import React from "react";
import "./Footer.css";
import { useNavigate } from "react-router-dom";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const openDocs = () => {
    window.open("https://docs.supersize.gg/", "_blank");
  };

  const openX = () => {
    window.open("https://x.com/SUPERSIZEgg", "_blank");
  };

  const openTG = () => {
    window.open("https://t.me/supersizeplayers", "_blank");
  };

  return (
    <footer className="footerContainer desktop-only">
      <span className="footerCopyright">{/* © Supersize Inc. 2025 */}</span>

      <div className="footerIcons">
        
        <div className="footerIcon" onClick={openDocs} style={{ display: "none" }}>
          <img src={`${process.env.PUBLIC_URL}/GitBook.png`} alt="GitBook" className="footerIconImg" />
          <img
            src={`${process.env.PUBLIC_URL}/GitBookhighlight.png`}
            alt="GitBook hover"
            className="footerIconImg footerIconImgHover"
          />
        </div>

        <div className="footerIcon" onClick={openX}>
          <img src={`${process.env.PUBLIC_URL}/x-logo.png`} alt="X" className="footerIconImg" />
          <img
            src={`${process.env.PUBLIC_URL}/x-logo-highlight.png`}
            alt="X hover"
            className="footerIconImg footerIconImgHover"
          />
        </div>

        <div className="footerIcon" onClick={openTG}>
          <img src={`${process.env.PUBLIC_URL}/tg2.png`} alt="Telegram" className="footerIconImg" />
          <img
            src={`${process.env.PUBLIC_URL}/tg.png`}
            alt="Telegram hover"
            className="footerIconImg footerIconImgHover"
          />
        </div>

        <button className="btn-outlined btn-green" onClick={() => navigate("/create-game")}>
              [+ Create Game]
        </button>
      </div>
    </footer>
  );
};

export default Footer;
