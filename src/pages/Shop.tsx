import React, { useEffect, useState } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import BackButton from "@components/util/BackButton";
import GameComponent from "@components/Game/Game";
import TradingViewWidget from "@components/util/TradingViewWidget";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { SupersizeVaultClient } from "@engine/SupersizeVaultClient";
import { useMagicBlockEngine } from "@engine/MagicBlockEngineProvider";
import { useFundWallet } from "@privy-io/react-auth/solana";
import "./Shop.scss";

type ShopProps = {
  tokenBalance: number;
};

const Shop: React.FC<ShopProps> = ({ tokenBalance }) => {
  const engine = useMagicBlockEngine();
  const { fundWallet } = useFundWallet();
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const SOL_MINT = "So11111111111111111111111111111111111111112";

  const buyBonk = async (usd: number, useSol = false) => {
    if (!engine.getWalletConnected()) {
      alert("Please sign in first");
      return;
    }

    try {
      let inputMint = USDC_MINT;
      let amount = Math.round(usd * 1_000_000); // USDC has 6 decimals

      if (useSol) {
        const priceRes = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        );
        const priceData = await priceRes.json();
        const solPrice = priceData.solana.usd;
        const solAmount = usd / solPrice;
        if (engine.getWalletType() === "embedded") {
          try {
            await fundWallet(engine.getWalletPayer().toBase58(), {
              amount: solAmount.toString(),
            });
          } catch (e) {
            console.error(e);
          }
        }
        amount = Math.round(solAmount * 1_000_000_000); // SOL has 9 decimals
        inputMint = SOL_MINT;
      }

      const quoteRes = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${BONK_MINT}&amount=${amount}&slippageBps=100`,
      );
      const quote = await quoteRes.json();
      const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: engine.getWalletPayer().toBase58(),
          wrapAndUnwrapSol: useSol,
        }),
      });
      const swapJson = await swapRes.json();
      const tx = VersionedTransaction.deserialize(Buffer.from(swapJson.swapTransaction, "base64"));
      const walletContext = (engine as any).walletContext;
      const signature = await walletContext.sendTransaction(tx, engine.getConnectionChain());
      await engine.getConnectionChain().confirmTransaction(signature, "confirmed");

      const vaultClient = new SupersizeVaultClient(engine);
      const bonkAmount = parseInt(quote.outAmount) / 100000; // BONK has 5 decimals
      await vaultClient.deposit(new PublicKey(BONK_MINT), bonkAmount);
      alert("Purchase complete!");
    } catch (e) {
      console.error(e);
      alert("Failed to buy BONK");
    }
  };

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
      <MenuBar tokenBalance={tokenBalance} />
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
              <img src="/transaction.png" style={{ width: "20px", height: "20px", marginLeft: "10px" }} />
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
          <button className="buy-button" onClick={() => buyBonk(1, true)}>
            buy $1 of Bonk
          </button>
          <button className="buy-button" onClick={() => buyBonk(5, true)}>
            buy $5 of Bonk
          </button>
          <a href="/about?section=sell" className="sell-link">
            How can I sell my bonk?
          </a>
        </div>
      </div>
      <BackButton />
    </div>
  );
};

export default Shop;
