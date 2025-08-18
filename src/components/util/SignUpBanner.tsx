import React from "react";
import { useNavigate } from "react-router-dom";
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";

interface SignUpBannerProps {
    engine: MagicBlockEngine;
    preferredRegion: string | undefined
}
  
const SignUpBanner: React.FC<SignUpBannerProps> = ({engine, preferredRegion}) => {
  const navigate = useNavigate();
  return (
    <button
        className="
        fixed bottom-11 right-10 z-50 
        flex items-center
        bg-[#2B2B2B] 
        border-2 border-[#4fc124]  
        rounded-[24px]
        px-5 py-3
        shadow-inner
        hover:bg-[#333333]
        transform hover:scale-[1.02]
        transition-all duration-150
        "
      style={{display: (preferredRegion == undefined || preferredRegion == "" || !engine.getWalletConnected()) 
        ? "block" : "none"}}
      onClick={() => navigate("/profile")}
    >
        <span className="text-white font-semibold text-base tracking-wide">
          {!engine.getWalletConnected() ? "Sign in and " : ""}
           activate your vault to start stacking coins!
        </span>
    </button>
  );
};

export default SignUpBanner;
