import React from "react";
import "./Footer.css";
import { useNavigate } from "react-router-dom";

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="footerContainer desktop-only">
      <span className="footerCopyright">{/* © Supersize Inc. 2025 */}</span>

      <div className="footerIcons">

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
