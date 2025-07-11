import React from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.scss";

const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-page">
      <div className="game-canvas" />
      <div className="top-nav">
        <div className="branding">supersize.io</div>
        <div className="nav-right">
          <button className="help-btn">?</button>
          <div className="coin-pill">
            <div className="coin-icon" />
            <span>100</span>
          </div>
          <div className="avatar" />
          <div className="username-pill">username</div>
        </div>
      </div>
      <button className="follow-btn">
        <div className="x-icon" /> Follow
      </button>
      <div className="panels">
        <div className="panel" onClick={() => navigate("/home")}> 
          <div className="panel-title">SUPER BLOB</div>
          <div className="panel-subtitle">multiplayer blob game</div>
        </div>
        <div className="panel disabled">
          <div className="panel-title">SUPER SNAKE</div>
          <div className="panel-subtitle">multiplayer snake game</div>
        </div>
      </div>
      <div className="utility-column">
        <button className="utility-btn trophy" />
        <button className="utility-btn store" />
      </div>
      <div className="promo-callout">
        <div className="promo-icon" />
        <div className="promo-text">download<br />the app!</div>
      </div>
      <div className="live-feed">
        <div className="feed-item">lewis won 80k 🥇 on Super Blob <span>10 seconds ago</span></div>
        <div className="feed-item">Denys won 20k 🥇 on Super Blob <span>40 seconds ago</span></div>
        <div className="feed-item">lewis won 80k 🥇 on Super Blob <span>1 minute ago</span></div>
      </div>
    </div>
  );
};

export default Landing;
