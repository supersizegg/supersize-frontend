import React from "react";
import { useNavigate } from "react-router-dom";

const BackButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button
      className="fixed bottom-5 left-5 z-50"
      onClick={() => navigate("/home")}
    >
      <img src="/back-button.png" alt="Back" />
    </button>
  );
};

export default BackButton;
