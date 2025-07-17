import React from "react";
import { useNavigate } from "react-router-dom";
import { MenuBar } from "@components/menu/MenuBar";
import "./Wishlist.scss";

type WishlistProps = {
  tokenBalance: number;
};

const Wishlist: React.FC<WishlistProps> = ({ tokenBalance }) => {
  const navigate = useNavigate();
  return (
    <div className="wishlist-page">
      <MenuBar tokenBalance={tokenBalance} />
      <div className="wishlist-overlay" onClick={() => navigate("/")}>
        <div className="wishlist-container" onClick={(e) => e.stopPropagation()}>
          <iframe
            className="wishlist-form"
            src="https://docs.google.com/forms/d/e/1FAIpQLSf_example/viewform?embedded=true"
            title="wishlist-form"
            frameBorder="0"
            allowFullScreen
          >
            Loading…
          </iframe>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
