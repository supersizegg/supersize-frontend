import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "@pages/Home";
import NotFound from "@pages/NotFound";
import CreateGame from "@pages/CreateGame";
import Game from "@pages/Game";
import Leaderboard from "@pages/Leaderboard";
import Profile from "@pages/Profile";
import HowToPlay from "@pages/HowToPlay";
import { ActiveGame, FetchedGame } from "@utils/types";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { activeGamesList, NETWORK } from "@utils/constants";
import { createUnloadedGame } from "@utils/game";

const AppRoutes = () => {
  const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
  const [activeGamesLoaded, setActiveGamesLoaded] = useState<FetchedGame[]>(
    activeGamesList[NETWORK].map((world) =>
      createUnloadedGame(world.worldId, world.worldPda, world.endpoint, world.permissionless),
    ),
  );
  const [myPlayerEntityPda, setMyPlayerEntityPda] = useState<PublicKey | null>(null);

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
          />
        }
      />
      <Route
        path="/create-game"
        element={<CreateGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />}
      />
      {selectedGame && (
        <Route path="/game" element={<Game gameInfo={selectedGame} myPlayerEntityPda={myPlayerEntityPda} />} />
      )}
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/about" element={<HowToPlay />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
