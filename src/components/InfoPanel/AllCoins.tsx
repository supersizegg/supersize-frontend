import React from "react";

const AllCoins = () => {
  return (
    <div className="flex justify-center w-full h-full text-white">
      <div className="w-[60%]">
        <h1 className="mr-[2vw] ml-[4vw] text-[36px] mb-[2vw]">For all coins</h1>
        <p className="ml-[4vw] text-[20px] w-[80%]">
          Slimecoin.io games are playable using all SPL tokens. 
          <br /><br />
          Every game has its own vault.
          You can deposit tokens to your game's vault to add tokens to the map for players to eat.
          <br /><br />
          As players eat each other, the game's vault balance grows. As players extract tokens, it's balance shrinks.
        </p>
      </div>
      <img
        src={`${process.env.PUBLIC_URL}/Group7.png`}
        className="w-[25vw] h-[25vw] mr-[1vw] self-center"
        alt="Image"
      />
    </div>
  );
};

export default AllCoins;
