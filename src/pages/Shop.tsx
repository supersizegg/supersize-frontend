import React, { useEffect, useState } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import GameComponent from "@components/Game/Game";
import TradingViewWidget from "@components/util/TradingViewWidget";
import { BN } from "@coral-xyz/anchor";
import "./Shop.scss";

const Shop: React.FC = () => {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bonk&vs_currencies=usd&include_24hr_change=true",
        );
        const data = await res.json();
        setPrice(data.bonk.usd);
        setChange(data.bonk.usd_24h_change);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="shop-page main-container">
      <div
        className="game"
        style={{
          display: "block",
          position: "absolute",
          top: "0",
          left: "0",
          height: "100%",
          width: "100%",
          zIndex: 0,
        }}
      >
        <GameComponent
          players={[]}
          visibleFood={[]}
          currentPlayer={{
            name: "",
            authority: null,
            score: 0,
            circles: [{ x: 5000, y: 5000, radius: 0, size: 0, speed: 0 }],
            removal: new BN(0),
            x: 5000,
            y: 5000,
            target_x: 5000,
            target_y: 5000,
            timestamp: 0,
          }}
          screenSize={{ width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0 }}
          gameSize={10000}
          buyIn={0}
        />
      </div>
      <MenuBar />
      <div className="shop-content" style={{ position: "relative", zIndex: 1 }}>
        <div className="shop-panel">
          <h1 className="shop-title">supermarket</h1>
          <div className="conversion-widget">
            <div className="left">
              <span className="amount">1</span>
              <img
                src="/coin.png"
                className="bonk-icon"
                title="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
                alt="BONK"
              />
              <img src="/transaction.png" style={{ width: "20px", height: "20px", marginLeft: "10px"}}/>

            </div>
            <div className="right">
              <span className="price">{price !== null ? `$${price.toFixed(5)}` : "--"}</span>
              <img src="/usdc.png" className="usd-icon" alt="USD" />
              {change !== null && (
                <div className="change" style={{ color: change >= 0 ? "#2ECC71" : "#E74C3C" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    {change >= 0 ? <path d="M6 2l4 8H2l4-8z" /> : <path d="M6 10L2 2h8L6 10z" />}
                  </svg>
                  <span>{change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
          <div className="chart-container">
            <TradingViewWidget />
          </div>
        </div>
        <div className="action-column">
          <button className="buy-button">buy $1 of Bonk</button>
          <button className="buy-button">buy $5 of Bonk</button>
          <a href="#" className="sell-link">
            can I sell my bonk?
          </a>
        </div>
      </div>
      <BackButton />
    </div>
  );
};

export default Shop;
