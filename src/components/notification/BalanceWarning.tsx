import React from "react";
import "./BalanceWarning.scss";

type BalanceWarningProps = {
  tokenBalance: number;
  setHasInsufficientTokenBalance: (hasInsufficientTokenBalance: boolean) => void;
};

const BalanceWarning: React.FC<BalanceWarningProps> = ({
  tokenBalance,
  setHasInsufficientTokenBalance,
}) => {
  const [opacity, setOpacity] = React.useState(100);

  React.useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        setHasInsufficientTokenBalance(false);
        //setTokenBalance(-1);
      }, 1000);
    }, 5000);

    return () => {
      clearTimeout(fadeOutTimer);
    };
  }, []);

  return (
    <div
      className="balance-warning fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[900]"
      style={{ opacity, transition: "opacity 1s ease-in-out" }}
    >
      <span>⚠️</span>
      <span>
        Your token balance <b>{tokenBalance >= 0 ? Math.floor(tokenBalance) : ""}</b> is below the buy-in amount.{" "}
        <a href="/shop">Get some SLIMECOIN in Shop</a>.
      </span>
    </div>
  );
};

export default BalanceWarning;
