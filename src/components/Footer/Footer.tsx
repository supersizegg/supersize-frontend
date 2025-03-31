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
        </div>

        <div className="footerIcon" onClick={openX}>
          <img src={`${process.env.PUBLIC_URL}/x-logo.png`} alt="X" className="footerIconImg" />
        </div>

        <div className="footerIcon" onClick={openTG}>
          <img src={`${process.env.PUBLIC_URL}/tg2.png`} alt="Telegram" className="footerIconImg" />
        </div>

        <button
            className={`region-button text-white px-4 py-0 rounded-md border border-white/20 bg-[#666] hover:bg-[#555] transition-colors cursor-pointer`}
            onClick={() => navigate("/create-game")}
          >
            <div className="flex flex-row items-center gap-1 text-sm">
              <span>+ Create Game</span>
            </div>
          </button>
      </div>
    </footer>
  );
};

export default Footer;
