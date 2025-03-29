import React from "react";
import { cachedTokenMetadata} from "@utils/constants";
import { ActiveGame } from "@utils/types";
import "./BalanceWarning.scss";

type BalanceWarningProps = {
  activeGame: ActiveGame;
  tokenBalance: number;
  setHasInsufficientTokenBalance: (hasInsufficientTokenBalance: boolean) => void;
  setTokenBalance: (tokenBalance: number) => void;
};

const BalanceWarning: React.FC<BalanceWarningProps> = ({ activeGame, tokenBalance, setHasInsufficientTokenBalance, setTokenBalance }) => {
    const tokenMint = activeGame.tokenMint?.toString();
    const tokenMetadata = tokenMint ? cachedTokenMetadata[tokenMint] : null;

    let swapLink = "";
    let swapText = "";

    if (tokenMint !== "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp") {
      if (tokenMetadata?.raydium) {
        swapLink = `https://raydium.io/swap/?inputMint=sol&outputMint=${tokenMint}`;
        swapText = "Buy some on Raydium.";
      } else {
        swapLink = `https://jup.ag/swap/SOL-${tokenMint}`;
        swapText = "Buy some on Jupiter.";
      }
    }else{
      swapLink = `https://supersize.gg/faucet`;
      swapText = "Go find some gems.";
    }

    const [opacity, setOpacity] = React.useState(100);

    React.useEffect(() => {
      const fadeOutTimer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          setHasInsufficientTokenBalance(false);
          setTokenBalance(-1);
        }, 1000);
      }, 4000);

      return () => {
        clearTimeout(fadeOutTimer);
      };
    }, []);

    return (
      <div
        className={`balance-warning fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[900]`}
        style={{ opacity: opacity, transition: "opacity 1s ease-in-out" }}
      >
        Your token balance <b>{tokenBalance >= 0 ? tokenBalance : ""}</b> is below the buy-in amount.{" "}
        {swapLink && (
          <a href={swapLink} target="_blank" rel="noopener noreferrer">
            {swapText}
          </a>
        )}
      </div>
    );
  };

  export default BalanceWarning;
