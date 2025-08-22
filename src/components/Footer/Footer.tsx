import React from "react";
import { NavLink } from "react-router-dom";
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";
import "./Footer.scss";

interface FooterProps {
  engine: MagicBlockEngine;
  preferredRegion: string | undefined;
}

const Footer: React.FC<FooterProps> = ({ engine, preferredRegion }) => {
  const shouldShowBanner = !preferredRegion || !engine.getWalletConnected();

  const openX = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open("https://x.com/SUPERSIZEgg", "_blank");
  };

  return (
    <footer className="site-footer">
      <div className="footer-links">
        <NavLink to="/about" className="footer-btn help-btn" aria-label="About Page">
          ?
        </NavLink>
        <a
          href="https://x.com/SUPERSIZEgg"
          onClick={openX}
          className="footer-btn follow-x-btn"
          aria-label="Follow on X"
        >
          <img src="/x-logo.png" alt="X Logo" />
          <span>Follow</span>
        </a>
      </div>

      {shouldShowBanner && (
        <NavLink to="/profile" className="cta-banner desktop-only">
          {/* <img src="/icons/vault.svg" alt="Vault" className="cta-icon" /> */}
          <span className="cta-text">
            {!engine.getWalletConnected() ? "Sign in and activate your vault" : "Activate your vault"}
          </span>
        </NavLink>
      )}
    </footer>
  );
};

export default Footer;
