import React from "react";
import { useNavigate } from "react-router-dom";

const BackButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button
      className="fixed bottom-7 left-14 z-50
      border-2 border-white rounded-md px-4 py-2
      text-white font-bold cursor-pointer text-2xl
      bg-transparent backdrop-blur-sm
      "
      onClick={() => navigate("/home")}
    >
      <div style={{ fontSize: "12px", textAlign: "left", margin: 0, lineHeight: "1" }}>back to</div>
      <div style={{ fontSize: "18px", textAlign: "left", margin: 0, lineHeight: "1" }}>lobby</div>
      {/*<img src="/back-button.png" alt="Back" />*/}
    </button>
  );
};

export default BackButton;
