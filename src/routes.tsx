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
import Shop from "@pages/Shop";
import Wishlist from "@pages/Wishlist";
import { ActiveGame, FetchedGame, Food } from "@utils/types";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { activeGamesList, NETWORK } from "@utils/constants";
import { pingEndpoints, getRegion } from "@utils/helper";
import { createUnloadedGame } from "@utils/game";
import { useMagicBlockEngine } from "./engine/MagicBlockEngineProvider";
import { SupersizeVaultClient } from "./engine/SupersizeVaultClient";

const AppRoutes = () => {
  const { engine, setEndpointEphemRpc } = useMagicBlockEngine();
  const [preferredRegion, setPreferredRegion] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
  const [sessionWalletInUse, setSessionWalletInUse] = useState<boolean>(true); //(NETWORK === 'mainnet' ? false : true);
  const [username, setUsername] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
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
  const [randomFood] = useState<Food[]>(
    Array.from({ length: 100 }, () => ({
      x: Math.floor(Math.random() * 4500) + 1000,
      y: Math.floor(Math.random() * 4500) + 1000,
      food_value: Math.floor(Math.random() * 10),
    })),
  );

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

  useEffect(() => {
    let vaultClient: SupersizeVaultClient | null = null;
    if (engine && engine.getWalletConnected()) {
      vaultClient = new SupersizeVaultClient(engine);
    }
    const fetchGameWalletEphem = async () => {
      if (vaultClient) {
        if (preferredRegion == "") {
          await vaultClient.findMyEphemEndpoint(setEndpointEphemRpc, setPreferredRegion);
        } 
      } else {
        const pingResults = await pingEndpoints();
        console.log("Vault is not initialized, fallback pinging endpoints", pingResults);
        if (pingResults.lowestPingEndpoint) {
          //setPreferredRegion(getRegion(pingResults.lowestPingEndpoint.region));
          setEndpointEphemRpc(pingResults.lowestPingEndpoint.endpoint);
          console.log("Set ephem endpoint to", pingResults.lowestPingEndpoint.endpoint);
        }
      }
    };

    const getTokenBalance = async () => {
      let balance = 0;
      const mintStr = "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp";
      const mint = new PublicKey(mintStr);
      const uiAmount = await vaultClient?.getVaultBalance(mint);
      if (uiAmount == "wrong_server") {
        balance = 0;
      } else if (uiAmount && uiAmount >= 0) {
        balance = uiAmount;
      }
      setTokenBalance(balance);
    };

    fetchGameWalletEphem();
    getTokenBalance();
  }, [engine]);

  return (
    <Routes>
      <Route index element={<Landing preferredRegion={preferredRegion} tokenBalance={tokenBalance} />} />
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
            preferredRegion={preferredRegion}
            tokenBalance={tokenBalance}
            setTokenBalance={setTokenBalance}
          />
        }
      />
      <Route
        path="/create-game"
        element={
          <CreateGame
            activeGamesLoaded={activeGamesLoaded}
            setActiveGamesLoaded={setActiveGamesLoaded}
            randomFood={randomFood}
            tokenBalance={tokenBalance}
          />
        }
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
      <Route path="/leaderboard" element={<Leaderboard randomFood={randomFood} tokenBalance={tokenBalance} />} />
      <Route path="/about" element={<HowToPlay tokenBalance={tokenBalance} />} />
      <Route path="/shop" element={<Shop tokenBalance={tokenBalance} />} />
      <Route path="/wishlist" element={<Wishlist tokenBalance={tokenBalance} />} />
      <Route
        path="/profile"
        element={
          <Profile
            randomFood={randomFood}
            username={username}
            setUsername={setUsername}
            sessionWalletInUse={sessionWalletInUse}
            setSessionWalletInUse={setSessionWalletInUse}
            preferredRegion={preferredRegion}
            setPreferredRegion={setPreferredRegion}
            tokenBalance={tokenBalance}
            setTokenBalance={setTokenBalance}
          />
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
