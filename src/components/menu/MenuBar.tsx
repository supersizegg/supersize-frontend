import * as React from "react";
import { NavLink } from "react-router-dom";
import "./MenuBar.scss";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { useEffect } from "react";
import { formatBuyIn } from "../../utils/helper";

type MenuBarProps = {
  tokenBalance: number;
};

export function MenuBar({ tokenBalance }: MenuBarProps) {
  const { engine } = useMagicBlockEngine();
  const stored = localStorage.getItem("user");
  const initialUser = stored ? JSON.parse(stored) : null;

  const [isMobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [username, setUsername] = React.useState<string>(initialUser?.name || "");
  const [avatar, setAvatar] = React.useState<string>(initialUser?.icon || "/slimey2.png");

  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (!engine.getWalletConnected()) return;

    const storedData = localStorage.getItem("user");
    let name = engine.getWalletPayer().toString().slice(0, 7);
    if (storedData) {
      const user = JSON.parse(storedData);
      if (user.name) name = user.name;
      setAvatar(user.icon || "/slimey2.png");
    }
    setUsername(name);

    const onStorage = () => {
      const u = localStorage.getItem("user");
      if (u) {
        const user = JSON.parse(u);
        if (user.name) setUsername(user.name);
        setAvatar(user.icon || "/slimey2.png");
      } else {
        setUsername("");
        setAvatar("/slimey2.png");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [engine]);

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
        <NavLink to="/" className="branding">
          <div className="title-image-container">
            <img src="/slimecoinio_nobg.png" alt="Supersize Logo" className="title-image" />
          </div>
        </NavLink>
      </div>

      <div className="menu-bar-right">
        <nav className="nav-links">
          <div className="coin-pill">
            <div className="coin-icon">
              <img src="/slime.png" alt="Game Token" />
            </div>
            <span className="coin-balance">
              {engine.getWalletConnected() ? formatBuyIn(Math.round(tokenBalance * 10) / 10) : "0"}
            </span>
          </div>
          <NavLink to="/profile" className="user-panel-link">
            <div className="user-panel">
              <img
                src={engine.getWalletConnected() ? avatar : "/slimey2.png"}
                alt="User Avatar"
                className="user-avatar"
              />
              <div className="username-pill">
                <span>{(engine.getWalletConnected() && username) || "Sign In"}</span>
              </div>
            </div>
          </NavLink>
        </nav>

        <div className="utility-column">
          <NavLink to="/leaderboard" className="utility-btn">
            <img src="/trophy.png" alt="Leaderboard" className="utility-image" />
          </NavLink>
          <NavLink to="/shop" className="utility-btn">
            <img src="/shop.png" alt="Shop" className="utility-image" />
          </NavLink>
        </div>

        <button className="burger-menu" onClick={toggleMobileMenu} aria-label="Toggle navigation">
          <img src="/icons/bars-solid.svg" alt="Menu" />
        </button>
      </div>

      <div className={`mobile-nav-backdrop ${isMobileMenuOpen ? "open" : ""}`} onClick={closeMobileMenu}>
        <nav className={`mobile-nav ${isMobileMenuOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <NavLink to="/about" onClick={closeMobileMenu}>
            About Supersize
          </NavLink>
          <NavLink to="/leaderboard" onClick={closeMobileMenu}>
            Leaderboard
          </NavLink>
          <NavLink to="/shop" onClick={closeMobileMenu}>
            Shop
          </NavLink>
          <a href="https://x.com/SUPERSIZEgg" target="_blank" rel="noreferrer">
            ⎋ Follow on X
          </a>
        </nav>
      </div>
    </header>
  );
}
