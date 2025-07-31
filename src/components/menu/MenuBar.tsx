import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./MenuBar.scss";
import "../../pages/Landing.scss";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { useEffect } from "react";

type MenuBarProps = {
  tokenBalance: number;
};

export function MenuBar({ tokenBalance }: MenuBarProps) {
  const { engine } = useMagicBlockEngine();

  const stored = localStorage.getItem("user");
  const initialUser = stored ? JSON.parse(stored) : null;

  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [username, setUsername] = React.useState<string>(initialUser?.name || "");
  const [avatar, setAvatar] = React.useState<string>(initialUser?.icon || "/chick.png");
  const navigate = useNavigate();
  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (!engine.getWalletConnected()) return;

    const stored = localStorage.getItem("user");
    let name = engine.getWalletPayer().toString().slice(0, 7);
    if (stored) {
      const user = JSON.parse(stored);
      if (user.name) name = user.name;
      setAvatar(user.icon || "/chick.png");
    }
    setUsername(name);

    const onStorage = () => {
      const u = localStorage.getItem("user");
      if (u) {
        const user = JSON.parse(u);
        if (user.name) setUsername(user.name);
        setAvatar(user.icon || "/chick.png");
      } else {
        setUsername("");
        setAvatar("/chick.png");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [engine]);

  return (
    <header className="menu-bar" style={{ zIndex: 2 }}>
      <div className="menu-bar-left">
        <div className="branding">
          <NavLink to="/">
            <svg width="305" height="60">
              <text
                x="0"
                y="40"
                fill="#fff"
                stroke="#4A4A4A"
                strokeWidth="8px"
                fontSize="48px"
                fontFamily="'Lexend', sans-serif"
                paintOrder="stroke"
              >
                supersize.gg
              </text>
            </svg>
          </NavLink>
          <button onClick={() => navigate("/about")} className="help-btn">
            <span className="desktop-only">?</span>
            <span className="mobile-only">?</span>
          </button>
        </div>
      </div>

      <div className="menu-bar-right">
        <nav className="nav-links">
          <div className="nav-right">
            <div className="coin-icon">
              <img src="/fallback-token.webp" alt="game token" className="coin-image" />
            </div>

            <div className="coin-pill">
              <div className="overlay-panel" style={{ borderRadius: "10px", border: "3px solid transparent" }} />
              <span style={{ position: "absolute", zIndex: "1", marginLeft: "8px" }}>
                {engine.getWalletConnected() ? tokenBalance.toFixed(1) : "0"}
              </span>
            </div>
            <NavLink to="/profile">
              <div
                className="user-panel"
                onMouseEnter={(e) => {
                  const usernamePill = e.currentTarget.querySelector<HTMLElement>(".username-pill");
                  if (usernamePill) {
                    usernamePill.style.opacity = "0.8";
                  }
                }}
                onMouseLeave={(e) => {
                  const usernamePill = e.currentTarget.querySelector<HTMLElement>(".username-pill");
                  if (usernamePill) {
                    usernamePill.style.opacity = "1";
                  }
                }}
              >
                <div className="overlay-panel" style={{ borderRadius: "18px", border: "3px solid transparent" }} />
                <img
                  src={engine.getWalletConnected() ? avatar : "/chick.png"}
                  alt="avatar"
                  style={{ width: "48px", height: "48px", position: "absolute", zIndex: "1", marginLeft: "10px" }}
                />
                <div
                  className="username-pill"
                  style={{
                    position: "absolute",
                    zIndex: "1",
                    transform: "translateX(65px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                  }}
                >
                  <span style={{ fontSize: "24px", fontWeight: "bold", margin: "auto" }}>
                    {(engine.getWalletConnected() && username) || "sign in"}
                  </span>
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
                style={{ transition: "transform 0.2s", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05) rotate(5deg)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
              />
            </div>
          </NavLink>
          <NavLink to="/shop">
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
          </NavLink>
        </div>
      </div>

      <div className={`mobile-nav-backdrop ${isMobileMenuOpen ? "open" : ""}`} onClick={closeMobileMenu}>
        <nav className={`mobile-nav ${isMobileMenuOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
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
