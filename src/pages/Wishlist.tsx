import React from "react";
import { useNavigate } from "react-router-dom";
import { MenuBar } from "@components/menu/MenuBar";
import "./Wishlist.scss";

const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="wishlist-page">
      <MenuBar />
      <div className="wishlist-overlay" onClick={() => navigate("/")}>
        <div className="wishlist-container" onClick={(e) => e.stopPropagation()}>
          <iframe
            className="wishlist-form"
            src="https://docs.google.com/forms/d/e/1FAIpQLSd8oYHrwdANcVhcX5tETW7fjfPy2PGc-OrGBjh8q66NLWDutw/viewform?usp=header"
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
