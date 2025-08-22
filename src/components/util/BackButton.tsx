import React from "react";
import { useNavigate } from "react-router-dom";
import "./BackButton.scss";

const BackButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button className="back-button" onClick={() => navigate("/home")} aria-label="Back to lobby">
      <img src="/icons/back.svg" alt="Back" />
    </button>
  );
};

export default BackButton;
