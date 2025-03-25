import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "@pages/Home";
import NotFound from "@pages/NotFound";
import CreateGame from "@pages/CreateGame";
import Game from "@pages/Game";
import Leaderboard from "@pages/Leaderboard";
import Profile from "@pages/Profile";
import HowToPlay from "@pages/HowToPlay";
import { ActiveGame, FetchedGame, Food } from "@utils/types";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { activeGamesList, NETWORK } from "@utils/constants";
import { createUnloadedGame } from "@utils/game";

const AppRoutes = () => {
  const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
  const [activeGamesLoaded, setActiveGamesLoaded] = useState<FetchedGame[]>(
    (NETWORK === 'mainnet' 
      ? [...activeGamesList[NETWORK], ...activeGamesList['devnet']]
      : [...activeGamesList[NETWORK]]
    ).map((world) =>
      createUnloadedGame(world.worldId, world.worldPda, world.endpoint, world.permissionless),
    ),
  );
  const [myPlayerEntityPda, setMyPlayerEntityPda] = useState<PublicKey | null>(null);
  const [randomFood] = useState<Food[]>(Array.from({ length: 50 }, () => ({
    x: Math.floor(Math.random() * 1500) + 1000,
    y: Math.floor(Math.random() * 1500) + 1000,
    food_value: Math.floor(Math.random() * 10),
    food_multiple: Math.floor(Math.random() * 10),
  })));

  return (
    <Routes>
      <Route
        index
        element={
          <Home
            selectedGame={selectedGame}
            setSelectedGame={setSelectedGame}
            setMyPlayerEntityPda={setMyPlayerEntityPda}
            activeGamesLoaded={activeGamesLoaded}
            setActiveGamesLoaded={setActiveGamesLoaded}
            randomFood={randomFood}
          />
        }
      />
      <Route
        path="/create-game"
        element={<CreateGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} randomFood={randomFood} />}
      />
      {selectedGame && (
        <Route path="/game" element={<Game gameInfo={selectedGame} myPlayerEntityPda={myPlayerEntityPda} />} />
      )}
      <Route path="/leaderboard" element={<Leaderboard randomFood={randomFood} />} />
      <Route path="/about" element={<HowToPlay randomFood={randomFood}/>} />
      <Route path="/profile" element={<Profile randomFood={randomFood}/>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
