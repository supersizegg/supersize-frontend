import * as React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { MenuWallet } from "./MenuWallet";
import "./MenuBar.scss";

export function MenuBar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const openX = () => {
    window.open("https://x.com/SUPERSIZEgg", "_blank");
  };

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
      <button
              onClick={() => navigate("/about")}
              className="how-to-play-button"
            >
               <span className="desktop-only">?</span>
               <span className="mobile-only">?</span>            
      </button>
      <div 
        onClick={openX} 
        className="follow-x-button"
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

      </div>

      <div className="menu-bar-right">
        <nav className="nav-links">
          <NavLink to="/" end>
            Lobby
          </NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>

        <button className="burger-menu" onClick={toggleMobileMenu} aria-label="Toggle navigation">
          <img src="/icons/bars-solid.svg" alt="Menu" />
        </button>

        <MenuWallet />
      </div>

      <div className={`mobile-nav-backdrop ${isMobileMenuOpen ? "open" : ""}`} onClick={closeMobileMenu}>
        <nav className={`mobile-nav ${isMobileMenuOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <NavLink to="/" end onClick={closeMobileMenu}>
            Lobby
          </NavLink>
          <NavLink to="/about" onClick={closeMobileMenu}>
            About Supersize
          </NavLink>
          <NavLink to="/leaderboard" onClick={closeMobileMenu}>
            Leaderboard
          </NavLink>
          <NavLink to="/profile" style={{ display: "none" }} onClick={closeMobileMenu}>
            Profile
          </NavLink>
          <a href="https://x.com/SUPERSIZEgg" target="_blank" rel="noreferrer">
            ⎋ Follow on X
          </a>
        </nav>
      </div>
    </header>
  );
}
