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

  const openExternal = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__left">
          <NavLink to="/about" className="btn btn--round btn--muted" aria-label="About page" title="About">
            ?
          </NavLink>

          <a
            href="https://x.com/slimecoinio"
            onClick={(e) => openExternal(e, "https://x.com/slimecoinio")}
            className="btn btn--pill btn--x"
            aria-label="Follow on X"
            title="Follow on X"
          >
            <svg viewBox="0 0 1200 1227" aria-hidden>
              <path
                d="M714.163 519.284L1160.89 0H1028.21L667.137 417.233L378.216 0H0L466.392 681.03L0 1226.28H132.679L515.354 784.064L823.784 1226.28H1202.01L714.137 519.284H714.163ZM565.438 723.513L520.625 659.815L180.53 159.51H325.87L594.258 550.277L639.071 613.974L993.607 1066.89H848.267L565.438 723.539V723.513Z"
                fill="currentColor"
              />
            </svg>
            <span>Follow</span>
          </a>

          <a
            href="https://t.me/supersizeplayers"
            onClick={(e) => openExternal(e, "https://t.me/supersizeplayers")}
            className="btn btn--pill btn--tg"
            aria-label="Technical Support"
            title="Technical Support"
          >
            <svg viewBox="0 0 240 240" aria-hidden>
              <path
                d="M120 0C53.726 0 0 53.726 0 120s53.726 120 120 120 120-53.726 120-120S186.274 0 120 0z"
                fill="currentColor"
                opacity="0.1"
              />
              <path
                d="M177.5 73.5L160.3 164.7c-1.3 7-5.3 8.7-10.8 5.4l-30-22.1-14.5 14c-1.6 1.6-3 2.9-6.1 2.9l2.2-31.2 56.7-51.2c2.5-2.2-0.55-3.5-3.8-1.3L82.2 124.4 51.8 114.8c-6.7-2.1-6.8-6.7 1.5-10l117.1-45.2c5.4-2 10.2 1.3 7.1 13.9z"
                fill="currentColor"
              />
            </svg>
            <span>Technical Support</span>
          </a>
        </div>

        {shouldShowBanner && (
          <NavLink to="/profile" className="cta-banner desktop-only">
            <span className="cta-dot" aria-hidden />
            <span className="cta-text">
              {!engine.getWalletConnected() ? "Sign in and activate your vault" : "Activate your vault"}
            </span>
          </NavLink>
        )}
      </div>
    </footer>
  );
};

export default Footer;
