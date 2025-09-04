import React, { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Landing from "@pages/Landing";
import Home from "@pages/Home";
import NotFound from "@pages/NotFound";
import CreateGame from "@pages/CreateGame";
import Game from "@pages/Game";
import Leaderboard from "@pages/Leaderboard";
import Profile from "@pages/Profile";
import AboutPage from "@pages/AboutPage";
import Shop from "@pages/Shop";
import Wishlist from "@pages/Wishlist";
import { ActiveGame, FetchedGame } from "@utils/types";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { activeGamesList, NETWORK } from "@utils/constants";
import { createUnloadedGame } from "@utils/game";
import { useMagicBlockEngine } from "./engine/MagicBlockEngineProvider";

const AppRoutes = () => {
  const { engine, preferredRegion } = useMagicBlockEngine();
  const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
  const [sessionWalletInUse, setSessionWalletInUse] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");
  const [activeGamesLoaded, setActiveGamesLoaded] = useState<FetchedGame[]>(
    [...activeGamesList[NETWORK]].map((world) =>
      createUnloadedGame(world.worldId, world.worldPda, world.endpoint, world.permissionless),
    ),
  );
  const [myPlayerEntityPda, setMyPlayerEntityPda] = useState<PublicKey | null>(null);

  useEffect(() => {
    const retrievedUser = localStorage.getItem("user");
    let use_session = sessionWalletInUse;
    let myusername = "";
    if (retrievedUser) {
      use_session = JSON.parse(retrievedUser).use_session;
      myusername = JSON.parse(retrievedUser).name;
      setSessionWalletInUse(use_session);
      setUsername(myusername);
    }
  }, []);

  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route
        path="/home"
        element={
          <Home
            selectedGame={selectedGame}
            setSelectedGame={setSelectedGame}
            setMyPlayerEntityPda={setMyPlayerEntityPda}
            activeGamesLoaded={activeGamesLoaded}
            setActiveGamesLoaded={setActiveGamesLoaded}
            sessionWalletInUse={sessionWalletInUse}
            username={username}
          />
        }
      />
      <Route
        path="/create-game"
        element={<CreateGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />}
      />
      {selectedGame && (
        <Route
          path="/game"
          element={
            <Game
              gameInfo={selectedGame}
              myPlayerEntityPda={myPlayerEntityPda}
              sessionWalletInUse={sessionWalletInUse}
              preferredRegion={preferredRegion}
            />
          }
        />
      )}
      <Route path="/leaderboard" element={<Leaderboard engine={engine} />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route
        path="/profile"
        element={
          <Profile
            username={username}
            setUsername={setUsername}
            sessionWalletInUse={sessionWalletInUse}
            setSessionWalletInUse={setSessionWalletInUse}
            preferredRegion={preferredRegion}
            setPreferredRegion={() => {}}
          />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
