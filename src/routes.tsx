import React, { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Landing from "@pages/Landing";
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
  const [sessionWalletInUse, setSessionWalletInUse] = useState<boolean>(true); //(NETWORK === 'mainnet' ? false : true);
  const [username, setUsername] = useState<string>("");
  const [activeGamesLoaded, setActiveGamesLoaded] = useState<FetchedGame[]>(
    /*(NETWORK === 'mainnet' 
      ? [...activeGamesList[NETWORK], ...activeGamesList['devnet']]
      : [...activeGamesList[NETWORK]]
    )*/
   [...activeGamesList[NETWORK]].map((world) =>
      createUnloadedGame(world.worldId, world.worldPda, world.endpoint, world.permissionless),
    ),
  );
  const [myPlayerEntityPda, setMyPlayerEntityPda] = useState<PublicKey | null>(null);
  const [randomFood] = useState<Food[]>(Array.from({ length: 100 }, () => ({
    x: Math.floor(Math.random() * 4500) + 1000,
    y: Math.floor(Math.random() * 4500) + 1000,
    food_value: Math.floor(Math.random() * 10),
  })));

  useEffect(() => {
    const retrievedUser = localStorage.getItem("user");
    let use_session = sessionWalletInUse;
    let myusername = "";
    if (retrievedUser) {
      use_session = JSON.parse(retrievedUser).use_session;
      myusername = JSON.parse(retrievedUser).name
      setSessionWalletInUse(use_session);
      setUsername(myusername);
    }
  },[]);

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
            randomFood={randomFood}
            sessionWalletInUse={sessionWalletInUse}
            username={username}
          />
        }
      />
      <Route
        path="/create-game"
        element={<CreateGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} randomFood={randomFood} />}
      />
      {selectedGame && (
        <Route path="/game" element={<Game gameInfo={selectedGame} myPlayerEntityPda={myPlayerEntityPda} sessionWalletInUse={sessionWalletInUse} />} />
      )}
      <Route path="/leaderboard" element={<Leaderboard randomFood={randomFood} />} />
      <Route path="/about" element={<HowToPlay randomFood={randomFood}/>} />
      <Route path="/profile" element={<Profile randomFood={randomFood} username={username} setUsername={setUsername}
      sessionWalletInUse={sessionWalletInUse} setSessionWalletInUse={setSessionWalletInUse}/>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
