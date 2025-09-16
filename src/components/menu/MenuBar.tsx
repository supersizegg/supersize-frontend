import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "./MenuBar.scss";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { formatBuyIn } from "../../utils/helper";
import { useBalance } from "../../context/BalanceContext";

export function MenuBar() {
  const { engine } = useMagicBlockEngine();
  const { p2pBalance, f2pBalance, isBalanceLoading } = useBalance();

  const stored = localStorage.getItem("user");
  const initialUser = stored ? JSON.parse(stored) : null;

  const [username, setUsername] = useState<string>(initialUser?.name || "");
  const [avatar, setAvatar] = useState<string>(initialUser?.icon || "/slimey2.png");

  useEffect(() => {
    if (!engine.getWalletConnected()) {
      setUsername("");
      setAvatar("/slimey2.png");
      return;
    }

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

    window.addEventListener("user:updated", onStorage);
    return () => window.removeEventListener("user:updated", onStorage);
  }, [engine, engine.getWalletConnected()]);

  const displayBalance = engine.getWalletConnected() && p2pBalance > 0 ? p2pBalance : f2pBalance;

  return (
    <header className="menu-bar">
      <div className="menu-bar-left">
        <NavLink to="/" className="branding">
          <div className="title-image-container">
            <img src="/slimecoinio_nobg.png" alt="Supersize Logo" className="title-image" />
          </div>
        </NavLink>
      </div>

      <div className="menu-bar-right menu-desktop-only">
        <nav className="nav-links">
          <div className="asset-pill" title="Slime">
            <div className="asset-icon">
              <img src="/slimejar.png" alt="Slime" />
            </div>
            <span className="asset-value">{formatBuyIn(0)}</span>
          </div>
          <div className="asset-pill" title="Slimecoin">
            <div className="asset-icon">
              <img src="/slime.png" alt="Slimecoin" />
            </div>
            {isBalanceLoading ? (
              <span className="asset-value">
                <div className="balance-spinner" />
              </span>
            ) : (
              <span className="asset-value">{formatBuyIn(displayBalance)}</span>
            )}
          </div>
          <div className="utility-column">
            <NavLink to="/leaderboard" className="utility-btn">
              <img src="/trophy.png" alt="Leaderboard" className="utility-image" />
            </NavLink>
            <NavLink to="/shop" className="utility-btn">
              <img src="/shop.png" alt="Shop" className="utility-image" />
            </NavLink>
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
      </div>

      <div className="menu-bar-right mobile-only">
        <nav className="mobile-action-bar">
          <NavLink to="/leaderboard" className="mobile-action-btn" aria-label="Leaderboard">
            <img src="/trophy.png" alt="Leaderboard" />
          </NavLink>
          <NavLink to="/shop" className="mobile-action-btn" aria-label="Shop">
            <img src="/shop.png" alt="Shop" />
          </NavLink>
          <NavLink to="/profile" className="mobile-action-btn" aria-label="Profile">
            <img src={engine.getWalletConnected() ? avatar : "/slimey2.png"} alt="Profile" />
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
