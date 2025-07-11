import * as React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "./MenuBar.scss";
import "../../pages/Landing.scss";

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

      <div className="branding">
          <NavLink to="/">
          <svg width="283" height="60">
            <text x="0" y="40" fill="#fff" stroke="#4A4A4A" strokeWidth="8px" fontSize="48px" fontFamily="'Lexend', sans-serif" paintOrder="stroke">
              supersize.io
            </text>
          </svg>
          </NavLink>
          <button
              onClick={() => navigate("/about")}
              className="help-btn"
            >
               <span className="desktop-only">?</span>
               <span className="mobile-only">?</span>            
          </button>
      </div>

      </div>

      <div className="menu-bar-right">
        <nav className="nav-links">
          <NavLink to="/home" end>
            Lobby
          </NavLink>
          <div className="nav-right">
          <div className="coin-icon">
            <img src="/slime.png" alt="SUPER BLOB" className="coin-image" />
          </div>

          <div className="coin-pill">
            <div className="overlay-panel" style={{borderRadius: "10px", border: "3px solid transparent"}}/>
            <span style={{ position: "absolute", zIndex: "1", marginLeft: "10px"}}>0</span>
          </div>
          <NavLink to="/profile">
          <div className="user-panel">
            <img src="/chick.png" alt="SUPER BLOB" className="avatar" />
            <div className="username-pill">
              <div className="overlay-panel" style={{borderRadius: "18px", border: "3px solid transparent"}}/>
              <span style={{position: "absolute", zIndex: "1", transform: "translateY(-120%) translateX(15%)"}}>username</span>
              </div>
          </div>
          </NavLink>
        </div>
        </nav>

        <button className="burger-menu" onClick={toggleMobileMenu} aria-label="Toggle navigation">
          <img src="/icons/bars-solid.svg" alt="Menu" />
        </button>
        
        <div className="utility-column">
        <NavLink to="/leaderboard">
        <div className="utility-btn">
          <img 
            src="/trophy.png" 
            alt="trophy" 
            className="utility-image" 
            style={{ transition: "transform 0.2s", cursor: "pointer"}}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05) rotate(5deg)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
          />
        </div>
        </NavLink>
        <div className="utility-btn">
          <img 
            src="/shop.png" 
            alt="store" 
            className="utility-image" 
            style={{ transition: "transform 0.2s", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05) rotate(5deg)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
          />
        </div>  
      </div>
      </div>

      <div className={`mobile-nav-backdrop ${isMobileMenuOpen ? "open" : ""}`} onClick={closeMobileMenu}>
        <nav className={`mobile-nav ${isMobileMenuOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <NavLink to="/home" end onClick={closeMobileMenu}>
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
