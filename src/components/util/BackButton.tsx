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
      lobby
      {/*<img src="/back-button.png" alt="Back" />*/}
    </button>
  );
};

export default BackButton;
