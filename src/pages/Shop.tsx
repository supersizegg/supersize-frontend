import React, { useEffect, useState } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import "./Shop.scss";

const Shop: React.FC = () => {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bonk&vs_currencies=usd&include_24hr_change=true"
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
    <div className="shop-page">
      <MenuBar />
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
            <svg className="arrow-icon" viewBox="0 0 16 16">
              <path d="M5 3h6l-2 2h4v2H9l2 2H5l2-2H3V5h4L5 3z" fill="currentColor" />
            </svg>
          </div>
          <div className="right">
            <span className="price">
              {price !== null ? `$${price.toFixed(5)}` : "--"}
            </span>
            <img src="/usdc.png" className="usd-icon" alt="USD" />
            {change !== null && (
              <div
                className="change"
                style={{ color: change >= 0 ? "#2ECC71" : "#E74C3C" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  {change >= 0 ? (
                    <path d="M6 2l4 8H2l4-8z" />
                  ) : (
                    <path d="M6 10L2 2h8L6 10z" />
                  )}
                </svg>
                <span>{change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className="chart-container">
          <iframe
            src="https://s.tradingview.com/widgetembed/?symbol=BINANCE:BONKUSDT&theme=light"
            width="512"
            height="200"
            frameBorder="0"
            scrolling="no"
            title="chart"
          ></iframe>
        </div>
      </div>
      <div className="action-column">
        <button className="buy-button">buy with cash</button>
        <button className="buy-button">buy with crypto</button>
        <a href="#" className="sell-link">
          can I sell my supercoins?
        </a>
      </div>
      <BackButton />
    </div>
  );
};

export default Shop;
