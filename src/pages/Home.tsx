import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FooterLink from "@components/Footer/Footer";
import "./Home.scss";
import { ActiveGame, Food } from "@utils/types";
import { cachedTokenMetadata, NETWORK, options } from "@utils/constants";
import { formatBuyIn, fetchTokenBalance, pingEndpoints, pingSpecificEndpoint, getMaxPlayers, getNetwork } from "@utils/helper";
import { FindEntityPda, FindComponentPda, FindWorldPda, createDelegateInstruction, BN } from "@magicblock-labs/bolt-sdk";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Tooltip } from "react-tooltip";
import { MenuBar } from "@components/menu/MenuBar";
import { Spinner } from "@components/util/Spinner";
import { gameExecuteJoin } from "@states/gameExecuteJoin";
import { COMPONENT_PLAYER_ID } from "../states/gamePrograms";
import { FetchedGame, PlayerInfo } from "@utils/types";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import { endpoints } from "@utils/constants";
import { createUnloadedGame } from "@utils/game";
import { stringToUint8Array, getRegion, getGameData, updatePlayerInfo, getPingColor } from "@utils/helper";
import { gameSystemCashOut } from "@states/gameSystemCashOut";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import GameComponent from "@components/Game/Game";
import NotificationContainer from "@components/notification/NotificationContainer";
import NotificationService from "@components/notification/NotificationService";
import BalanceWarning from "@components/notification/BalanceWarning";

type homeProps = {
  selectedGame: ActiveGame | null;
  setSelectedGame: (game: ActiveGame | null) => void;
  setMyPlayerEntityPda: (pda: PublicKey | null) => void;
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: (games: FetchedGame[]) => void;
  randomFood: Food[];
  sessionWalletInUse: boolean;
  username: string;
};

const Home = ({
  selectedGame,
  setSelectedGame,
  setMyPlayerEntityPda,
  activeGamesLoaded,
  setActiveGamesLoaded,
  randomFood,
  sessionWalletInUse,
  username
}: homeProps) => {
  const navigate = useNavigate();
  const engine = useMagicBlockEngine();
  const activeGamesRef = useRef<FetchedGame[]>(activeGamesLoaded);
  const [inputValue, setInputValue] = useState<string>("");
  const pingResultsRef = useRef<{ endpoint: string; pingTime: number; region: string }[]>(
    endpoints[NETWORK].map((endpoint) => ({ endpoint: endpoint, pingTime: 0, region: getRegion(endpoint) })),
  );
  const isSearchingGame = useRef(false);
  const selectedServer = useRef<string>("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [isLoadingCurrentGames, setIsLoadingCurrentGames] = useState(true);
  const [loadingGameNum, setLoadingGameNum] = useState(-1);
  const checkActiveGamesLoadedCallCount = useRef(0);
  const checkActiveGamesLoadedWait = useRef(500);
  const [numberOfGamesInEndpoint, setNumberOfGamesInEndpoint] = useState<null | number>(null);
  const [hasInsufficientTokenBalance, setHasInsufficientTokenBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(-1);
  const [gemBalance, setGemBalance] = useState(0);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleEnterKeyPress(inputValue);
    }
  };

  const handleEnterKeyPress = async (inputValue: string) => {
    console.log("Searching game", inputValue);
    const thisEndpoint = endpoints[NETWORK][options.indexOf(selectedServer.current)];
    if (inputValue.trim() !== "") {
      isSearchingGame.current = true;
      try {
        const worldId = { worldId: new anchor.BN(inputValue.trim()) };
        const alreadyExists = activeGamesLoaded.some((item) => item.activeGame.worldId.eq(worldId.worldId));
        if (alreadyExists) {
          console.log("Game with this worldId already exists, skipping.");
          isSearchingGame.current = false;
          return;
        }
        const worldPda = await FindWorldPda(worldId);
        const newGameInfo = createUnloadedGame(worldId.worldId, worldPda, "", true);
        try {
          const { gameInfo: updateGameInfo, anteroomData } = await getGameData(engine, worldId.worldId, thisEndpoint, newGameInfo.activeGame);
          newGameInfo.activeGame = updateGameInfo;
          if (newGameInfo.activeGame.max_players > 0){
            console.log("new game info", newGameInfo.activeGame.worldId, newGameInfo.activeGame.worldPda.toString());
            setSelectedGame(newGameInfo.activeGame);
            let updatedPlayerInfo = await updatePlayerInfo(engine, newGameInfo.activeGame.worldId, newGameInfo.activeGame.max_players, "new_player", new PublicKey(0), 0, false, false, thisEndpoint);
            newGameInfo.activeGame.active_players = updatedPlayerInfo.activeplayers;
            newGameInfo.activeGame.max_players = updatedPlayerInfo.max_players;
            newGameInfo.activeGame.isLoaded = true;

            activeGamesRef.current = [
              ...activeGamesRef.current,
              {
                activeGame: newGameInfo.activeGame,
                playerInfo: {
                  playerStatus: updatedPlayerInfo.playerStatus,
                  need_to_delegate: updatedPlayerInfo.need_to_delegate,
                  need_to_undelegate: updatedPlayerInfo.need_to_undelegate,
                  newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
                },
              },
            ];
            setActiveGamesLoaded([
              ...activeGamesLoaded,
              {
                activeGame: newGameInfo.activeGame,
                playerInfo: {
                  playerStatus: updatedPlayerInfo.playerStatus,
                  need_to_delegate: updatedPlayerInfo.need_to_delegate,
                  need_to_undelegate: updatedPlayerInfo.need_to_undelegate,
                  newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
                },
              },
            ]);
          }
        } catch (error) {
          console.error("Error fetching map data:", error);
        }
      } catch (error) {
        console.error("Invalid PublicKey:", error);
      } finally {
        isSearchingGame.current = false;
      }
    } else {
      console.log("Input is empty");
    }
  };

  const handleRefresh = async (engine: MagicBlockEngine, activeGames: FetchedGame[], index: number) => {
    setIsLoadingCurrentGames(true);
    try {
      const refreshedGames = [...activeGames];
      const prewnewgame: FetchedGame = {
        activeGame: {
          ...refreshedGames[index].activeGame,
          active_players: -1,
        } as ActiveGame,
        playerInfo: {
          ...refreshedGames[index].playerInfo,
        } as PlayerInfo,
      };

      refreshedGames[index] = prewnewgame;
      setActiveGamesLoaded(refreshedGames);

      let max_players = getMaxPlayers(activeGames[index].activeGame.size);
      let updatedPlayerInfo = await updatePlayerInfo(engine, activeGames[index].activeGame.worldId, max_players, 
        activeGames[index].playerInfo.playerStatus, activeGames[index].playerInfo.newplayerEntityPda, activeGames[index].activeGame.active_players,
        activeGames[index].playerInfo.need_to_delegate, activeGames[index].playerInfo.need_to_undelegate, activeGames[index].activeGame.endpoint);
      const newgame: FetchedGame = {
        activeGame: {
          ...activeGames[index].activeGame,
          isLoaded: true,
          active_players: updatedPlayerInfo.activeplayers,
          max_players: updatedPlayerInfo.max_players,
        } as ActiveGame,
        playerInfo: {
          playerStatus: updatedPlayerInfo.playerStatus,
          need_to_delegate: updatedPlayerInfo.need_to_delegate,
          need_to_undelegate: updatedPlayerInfo.need_to_undelegate,
          newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
        } as PlayerInfo,
      };

      refreshedGames[index] = newgame;
      activeGamesRef.current[index] = newgame;
      setActiveGamesLoaded([...refreshedGames]);
      setIsLoadingCurrentGames(false);
    } catch (error) {
      console.log("Error refreshing games:", error);
      setIsLoadingCurrentGames(false);
    }
  };

  const fetchAndLogMapData = async (
    engine: MagicBlockEngine,
    activeGames: FetchedGame[],
    server: string,
  ) => {
    let pingResults = await pingSpecificEndpoint(server);
    let pingTime = pingResults.pingTime;
    pingResultsRef.current = pingResultsRef.current.map((result) =>
      result.endpoint === server ? { ...result, pingTime: pingTime } : result
    );
    let filteredGames = [...activeGames];
    const serverIndex = endpoints[NETWORK].indexOf(server);
    for (let i = 0; i < filteredGames.length; i++) {
      //maybe if not on server, set isloaded to false
      if(!(server === filteredGames[i].activeGame.endpoint || filteredGames[i].activeGame.endpoint === endpoints["devnet"][serverIndex])) continue;
      console.log("engine", engine);
      try {
        const preNewGame: FetchedGame = {
          activeGame: {
            ...filteredGames[i].activeGame,
            isLoaded: true,
            active_players: -1,
          } as ActiveGame,
          playerInfo: {
            ...filteredGames[i].playerInfo,
          } as PlayerInfo,
        };

        const preMergedGames = [...filteredGames];
        preMergedGames[i] = preNewGame;
        filteredGames = preMergedGames;
        setActiveGamesLoaded(preMergedGames);

        let activeGameCopy = filteredGames[i].activeGame;
        const { gameInfo: updateGameInfo, anteroomData } = await getGameData(engine, activeGameCopy.worldId, activeGameCopy.endpoint, activeGameCopy);
        activeGameCopy = updateGameInfo;
        let max_players = getMaxPlayers(activeGameCopy.size);
        let updatedPlayerInfo = await updatePlayerInfo(engine, activeGameCopy.worldId, max_players, 
          filteredGames[i].playerInfo.playerStatus, filteredGames[i].playerInfo.newplayerEntityPda, activeGameCopy.active_players,  
          filteredGames[i].playerInfo.need_to_delegate, filteredGames[i].playerInfo.need_to_undelegate, activeGameCopy.endpoint);
        const newgame: FetchedGame = {
          activeGame: {
            ...activeGameCopy,
            max_players: updatedPlayerInfo.max_players,
            active_players: updatedPlayerInfo.activeplayers,
          } as ActiveGame,
          playerInfo: {
            playerStatus: updatedPlayerInfo.playerStatus,
            need_to_delegate: updatedPlayerInfo.need_to_delegate,
            need_to_undelegate: updatedPlayerInfo.need_to_undelegate,
            newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
          } as PlayerInfo,
        };

        const mergedGames = [...filteredGames];
        mergedGames[i] = newgame;
        filteredGames = mergedGames;
        activeGamesRef.current[i] = newgame;
        setActiveGamesLoaded(mergedGames);
      } catch (error) {
        console.log(`Error fetching map data for game ID ${filteredGames[i].activeGame.worldId}:`, error);
      }
    }
  }

  const handlePlayButtonClick = async (game: FetchedGame) => {
    let networkType = getNetwork(game.activeGame.endpoint);
    engine.setChain(networkType);
    engine.setEndpointEphemRpc(game.activeGame.endpoint);
    setSelectedGame(game.activeGame);

    if (game.playerInfo.playerStatus === "new_player") {
        const alertId = NotificationService.addAlert({
          type: "success",
          message: "submitting buy in...",
          shouldExit: false,
        });
      let max_players = getMaxPlayers(game.activeGame.size);
      let updatedPlayerInfo = await updatePlayerInfo(engine, game.activeGame.worldId, max_players, game.playerInfo.playerStatus, 
        game.playerInfo.newplayerEntityPda, game.activeGame.active_players, 
        game.playerInfo.need_to_delegate, game.playerInfo.need_to_undelegate, game.activeGame.endpoint);
      if (updatedPlayerInfo.playerStatus == "Game Full" || updatedPlayerInfo.playerStatus == "error"){
        const exitAlertId = NotificationService.addAlert({
          type: "error",
          message: updatedPlayerInfo.playerStatus,
          shouldExit: false,
        });
        setTimeout(() => {
          NotificationService.updateAlert(exitAlertId, { shouldExit: true });
        }, 3000);
      }
      game.playerInfo = {
        playerStatus: updatedPlayerInfo.playerStatus,
        need_to_delegate: updatedPlayerInfo.need_to_delegate,
        need_to_undelegate: updatedPlayerInfo.need_to_undelegate,
        newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
      };
      const { tokenBalance, hasInsufficientTokenBalance } = await fetchTokenBalance(engine, game.activeGame, networkType == "devnet");
      setTokenBalance(tokenBalance);
      setHasInsufficientTokenBalance(hasInsufficientTokenBalance);

      const result = await gameExecuteJoin(
        engine,
        game.activeGame,
        game.activeGame.buy_in,
        username,
        game.playerInfo,
        networkType == "devnet" || sessionWalletInUse,
        setMyPlayerEntityPda,
      );
      if (result.success) { 
        navigate("/game"); 
      }
      else{
        const exitAlertId = NotificationService.addAlert({
          type: "error",
          message: result.error || "Error submitting buy in",
          shouldExit: false,
        });
        setTimeout(() => {
          NotificationService.updateAlert(exitAlertId, { shouldExit: true });
        }, 3000);
      }
      NotificationService.updateAlert(alertId, { shouldExit: true });
    }
    if (game.playerInfo.playerStatus === "cashing_out") {
      try {
        const anteEntityPda = FindEntityPda({
          worldId: game.activeGame.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array("ante"),
        });
        const cashoutAlertId = NotificationService.addAlert({
          type: "success",
          message: "Cashing out...",
          shouldExit: false,
        });
        const cashoutFeedback = await gameSystemCashOut(
          engine,
          game.activeGame,
          anteEntityPda,
          game.playerInfo.newplayerEntityPda,
          networkType == "devnet" || sessionWalletInUse,
        );
        NotificationService.updateAlert(cashoutAlertId, { shouldExit: true });
        if (cashoutFeedback.success) {
          const cashoutSuccessAlertId = NotificationService.addAlert({
            type: "success",
            message: "Cashing out successful",
            shouldExit: false,
          });
          setTimeout(() => {
            NotificationService.updateAlert(cashoutSuccessAlertId, { shouldExit: true });
          }, 3000);
        }else{
          const cashoutFailedAlertId = NotificationService.addAlert({
            type: "error",
            message: cashoutFeedback.error || "Error cashing out",
            shouldExit: false,
          });
          setTimeout(() => {
            NotificationService.updateAlert(cashoutFailedAlertId, { shouldExit: true });
          }, 3000);
        }
      } catch (cashoutError) {
        const cashoutFailedAlertId = NotificationService.addAlert({
          type: "error",
          message: "Error cashing out",
          shouldExit: false,
        });
        setTimeout(() => {
          NotificationService.updateAlert(cashoutFailedAlertId, { shouldExit: true });
        }, 3000);
        console.log("error", cashoutError);
      }
    }
    if (game.playerInfo.playerStatus === "in_game") {
      if (game.playerInfo.need_to_delegate) {
        try {
          const playerComponentPda = FindComponentPda({
            componentId: COMPONENT_PLAYER_ID,
            entity: game.playerInfo.newplayerEntityPda,
          });
          const playerdelegateIx = createDelegateInstruction({
            entity: game.playerInfo.newplayerEntityPda,
            account: playerComponentPda,
            ownerProgram: COMPONENT_PLAYER_ID,
            payer: engine.getWalletPayer(),
          });
          const deltx = new Transaction().add(playerdelegateIx);
          const playerdelsignature = await engine.processWalletTransaction("playerdelegate", deltx);
          console.log(`delegation signature: ${playerdelsignature}`);
        } catch (error) {
          console.log("Error delegating:", error);
        }
      }
      setMyPlayerEntityPda(game.playerInfo.newplayerEntityPda);
      navigate(`/game`);
    }
    if (game.playerInfo.playerStatus === "error") {
      console.log("error joining game");
    }
  };

  const refreshAllGames = async () => {
    console.log(`Refreshing games in ${selectedEndpoint}`);
    setIsLoadingCurrentGames(true);
    await fetchAndLogMapData(
      engine,
      activeGamesRef.current,
      selectedEndpoint,
    );
    setIsLoadingCurrentGames(false);
  };

  useEffect(() => {
    const fetchUserTokenBalance = async () => {
      let connection = engine.getConnectionChainDevnet();
      const tokenMint = new PublicKey("AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp");
      let balance = 0;
        const tokenAccounts = await connection.getTokenAccountsByOwner(engine.getSessionPayer(), {
          mint: tokenMint,
        });
        console.log("tokenAccounts", tokenAccounts);
        if (tokenAccounts.value.length > 0) {
          const accountInfo = tokenAccounts.value[0].pubkey;
          const balanceInfo = await connection.getTokenAccountBalance(accountInfo);
          console.log("balanceInfo", balanceInfo.value.amount);
          balance = parseInt(balanceInfo.value.amount) || 0;
          setGemBalance(balance / 10 ** 9);
        }
        else{
          setGemBalance(0);
        }
    }

    fetchUserTokenBalance();
  }, [engine.getSessionPayer()]);

  useEffect(() => {
    const fetchPingData = async () => {
      setIsLoadingCurrentGames(true);
      try {
        const pingResults = await pingEndpoints();
        pingResultsRef.current = pingResults.pingResults;
        selectedServer.current = pingResults.lowestPingEndpoint.region;
        setSelectedEndpoint(pingResults.lowestPingEndpoint.endpoint);
        setIsLoadingCurrentGames(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchPingData();
  }, []);

  const checkActiveGamesLoaded = async (thisServer: string) => {
    if (checkActiveGamesLoadedCallCount.current >= 5) {
      console.error("checkActiveGamesLoaded called too many times.");
      setIsLoadingCurrentGames(false);
      return;
    }

    if (activeGamesRef.current.filter((row) => row.activeGame.isLoaded).length === 0) {
      await fetchAndLogMapData(engine, activeGamesRef.current, thisServer);

      checkActiveGamesLoadedCallCount.current++;
      checkActiveGamesLoadedWait.current *= 2;

      setTimeout(checkActiveGamesLoaded, checkActiveGamesLoadedWait.current);
    } else {
      setIsLoadingCurrentGames(false);
      checkActiveGamesLoadedCallCount.current = 0;
      checkActiveGamesLoadedWait.current = 500;
    }
  };

  useEffect(() => {
    const fetchGameData = async () => {
      const clearPingGames = [...activeGamesRef.current];
      for (let i = 0; i < clearPingGames.length; i++) {
        clearPingGames[i] = {
          ...clearPingGames[i],
          activeGame: {
            ...clearPingGames[i].activeGame,
            active_players: -1,
            isLoaded: false,
          },
        };
      }
      activeGamesRef.current = clearPingGames;
      setActiveGamesLoaded(clearPingGames);

      if (selectedEndpoint === "") {
        return;
      }
      console.log(`Fetching games in ${selectedEndpoint}`);
      const gamesCountInEndpoint = activeGamesRef.current.filter(
        (row) => row.activeGame.endpoint === selectedEndpoint,
      ).length;
      console.log("Number of games in endpoint", gamesCountInEndpoint);
      setNumberOfGamesInEndpoint(gamesCountInEndpoint);
      if (isLoadingCurrentGames === true || gamesCountInEndpoint === 0) {
        return;
      }
      try {
        setIsLoadingCurrentGames(true);
        await fetchAndLogMapData(engine, activeGamesRef.current, selectedEndpoint);
        setTimeout(
          checkActiveGamesLoaded,
          checkActiveGamesLoadedWait.current,
          selectedEndpoint,
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (activeGamesRef.current.filter((row) => row.activeGame.isLoaded).length > 0) {
          setIsLoadingCurrentGames(false);
          checkActiveGamesLoadedWait.current = 500;
          checkActiveGamesLoadedCallCount.current = 0;
        }
      }
    };
    fetchGameData();
  }, [selectedEndpoint]);

  const renderRegionButtons = () => {
    const selected = pingResultsRef.current.find(
      (item) => item.region === selectedServer.current
    );
    const others = pingResultsRef.current.filter(
      (item) => item.region !== selectedServer.current
    );
  
    return (
      <div>
        <div className="relative flex flex-col items-center group/hoverzone pb-8">
          <div className="flex flex-col-reverse gap-2 mb-2 z-10">
            {others.map((item, index) => (
              <button
                key={`region-${item.region}`}
                className={`
                  region-button text-white px-4 py-2 rounded-md border border-white/20
                  bg-[#444] hover:bg-[#555] transition-all duration-300 ease-out
                  transform translate-y-5 opacity-0
                  group-hover/hoverzone:translate-y-0 group-hover/hoverzone:opacity-100
                  ${isLoadingCurrentGames ? "cursor-not-allowed" : "cursor-pointer"}
                `}
                style={{ transitionDelay: `${index * 50}ms` }}
                onClick={async () => {
                  const clearPingGames = [...activeGamesRef.current];
                  for (let i = 0; i < clearPingGames.length; i++) {
                    clearPingGames[i] = {
                      ...clearPingGames[i],
                      activeGame: {
                        ...clearPingGames[i].activeGame,
                        active_players: -1,
                        isLoaded: false,
                      },
                    };
                  }
                  activeGamesRef.current = clearPingGames;
                  setActiveGamesLoaded(clearPingGames);
                  selectedServer.current = item.region;
                  setSelectedEndpoint(item.endpoint);
                }}
                disabled={isLoadingCurrentGames}
              >
                <div className="flex flex-row items-center gap-1">
                  <span>{item.region}</span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: getPingColor(item.pingTime),
                    }}
                  >
                    ({item.pingTime}ms)
                  </span>
                </div>
              </button>
            ))}
          </div>
  
          <button
            className={`region-button text-white px-4 py-2 rounded-md border border-white/20 bg-[#666] hover:bg-[#555] transition-colors ${
              isLoadingCurrentGames ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            disabled={isLoadingCurrentGames}
          >
            <div className="flex flex-row items-center gap-1">
              <span>{selected?.region}</span>
              <span
                style={{
                  fontSize: "10px",
                  color: getPingColor(selected?.pingTime || 0),
                }}
              >
                ({selected?.pingTime}ms)
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="main-container">
      <div
        className="game"
        style={{
          display: "block",
          position: "absolute",
          top: "0",
          left: "0",
          height: "100%",
          width: "100%",
          zIndex: "0",
        }}
      >
        <GameComponent
          players={[]}
          visibleFood={randomFood}
          currentPlayer={{
            name: "unnamed",
            authority: null,
            x: 2000,
            y: 2000,
            radius: 0,
            mass: 0,
            score: 0,
            speed: 0,
            removal: new BN(0),
            target_x: 0,
            target_y: 0,
          }}
          screenSize={{width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0, boost: false }}
          gameSize={4000}
        />
      </div>
      <MenuBar />
      <div style={{ position: "fixed", top: "3.5em", right: "3em", display: gemBalance > 0 ? "flex" : "none", flexDirection: "row" }}>
          <img  style={{ width: "20px", height: "20px", marginRight: "5px", marginTop: "1px" }} src={cachedTokenMetadata["AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp"].image} alt="Token Image" /> {gemBalance.toFixed(2)}
      </div>

      <div className="banner" style={{ position: "relative" }}>
      <svg width="160" height="160" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="64" r="64" fill="#1f67e0" />
      <circle cx="38.4" cy="51.2" r="12.8" fill="white" stroke="black" strokeWidth="2" />
      <circle cx="46.08" cy="51.2" r="5.12" fill="black" />
      <circle cx="89.6" cy="51.2" r="12.8" fill="white" stroke="black" strokeWidth="2" />
      <circle cx="97.28" cy="51.2" r="5.12" fill="black" />
      <path d="M 32 83.2 Q 64 89.6, 96 83.2" fill="none" stroke="black" strokeWidth="2" />
      </svg>

        <div className="banner-text">
          <h1 className="banner-title">Play Supersize, win <span style={{ color: "#00d37d" }}>SOL</span></h1>
          <p className="banner-description">
            Eat tokens and grow your blob. Eat other players to steal their tokens. Cash out your tokens anytime.{" "}
            <button
              onClick={() => navigate("/about")}
              style={{ textDecoration: "underline", color: "#00d37d" }}
            >
               <span className="desktop-only">Learn more</span>
               <span className="mobile-only">Learn more</span>            
              </button>
          </p>
        </div>
      </div>
      <div className="home-container" style={{ position: "relative" }}> 
        <div className="mobile-only mobile-alert">For the best experience, use a desktop or laptop.</div>
        <div className="table-container">
          <div className="filters-header">
            <input
              type="text"
              className="search-game-input"
              placeholder="Search Game by ID"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            ></input>
            <div className="flex flex-row desktop-only">
              <span style={{ opacity: isSearchingGame.current ? "1" : "0", alignSelf: "center", marginRight: "10px" }}>
                <Spinner />
              </span>
            </div>
          </div>
          <table className="lobby-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Creator</th>
                <th>Token</th>
                <th>Buy In</th>
                <th>Players</th>
                <th>Status</th>
                <th>
                  <button
                    data-tooltip-id="refresh-all-games"
                    data-tooltip-content="Refresh all games"
                    className="desktop-only"
                    onClick={async () => refreshAllGames()}
                  >
                    <img
                      src="/icons/arrows-rotate.svg"
                      width={18}
                      className={`${isLoadingCurrentGames && loadingGameNum == -1 ? "refresh-icon" : ""}`}
                    />
                  </button>
                  <Tooltip id="refresh-all-games" />
                </th>
              </tr>
            </thead>
            <tbody>
              {activeGamesLoaded.filter((row) => row.activeGame.isLoaded).length == 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", verticalAlign: "middle", lineHeight: "20px" }}>
                    {selectedServer.current !== "" && isLoadingCurrentGames === true && (
                      <>
                        <Spinner /> Loading {selectedServer.current} games, please wait...
                      </>
                    )}
                    {selectedServer.current === "" && (
                      <>
                        <Spinner /> Finding nearest server...
                      </>
                    )}
                    {numberOfGamesInEndpoint === 0 && isLoadingCurrentGames === false && (
                      <>
                        No whitelisted games in {selectedServer.current} right now.
                        <br />
                        Try selecting a different region or search game by ID.
                      </>
                    )}
                  </td>
                </tr>
              )}
              {activeGamesLoaded
                .map((row, idx) => (
                  <tr key={idx} style={{ display: !row.activeGame.isLoaded ? "none" : "table-row" }}>
                    <td>{row.activeGame.worldId.toString()}</td>
                    <td>
                      {row.activeGame.permissionless === true ? (
                        <span className="community-list">Community</span>
                      ) : (
                        <span className="strict-list">Supersize</span>
                      )}
                    </td>
                    <td>
                      {row.activeGame.isLoaded ? (
                        <>
                          <img src={row.activeGame.image} alt={row.activeGame.name} className="token-image" style={{ marginRight: "5px" }} />
                          <span>{row.activeGame.token}</span>
                        </>
                      ) : (
                        <Spinner />
                      )}
                    </td>
                    <td style={{ color: "#898989" }}>
                      {row.activeGame.isLoaded ? (
                        formatBuyIn(row.activeGame.buy_in / 10 ** row.activeGame.decimals)
                      ) : (
                        <Spinner />
                      )}
                    </td>
                    <td>
                      {row.activeGame.isLoaded && row.activeGame.active_players >= 0 ? (
                        row.activeGame.active_players + "/" + row.activeGame.max_players
                      ) : (
                        <Spinner />
                      )}
                    </td>

                    <td className="desktop-only">
                      <button
                        className="btn-play"
                        disabled={
                          !row.activeGame.isLoaded ||
                          row.activeGame.active_players < 0 ||
                          row.playerInfo.playerStatus == "error" ||
                          row.playerInfo.playerStatus == "Game Full" ||
                          engine.getWalletConnected() == false
                        }
                        onClick={() => {
                          handlePlayButtonClick(row);
                        }}
                        data-tooltip-id={`connect-wallet-${idx}`}
                        data-tooltip-content="Connect wallet to play"
                      >
                        {{
                          new_player: "Play",
                          cashing_out: "Cash Out",
                          in_game: "Resume",
                        }[row.playerInfo.playerStatus] || row.playerInfo.playerStatus}
                      </button>
                      {engine.getWalletConnected() == false && <Tooltip id={`connect-wallet-${idx}`} />}
                    </td>
                    <td className="desktop-only">
                      <button
                        data-tooltip-id={`refresh-game-${idx}`}
                        data-tooltip-content="Refresh game"
                        onClick={async () => {
                          try {
                            setLoadingGameNum(idx);
                            await handleRefresh(
                              engine,
                              activeGamesRef.current,
                              idx,
                            );
                            setLoadingGameNum(-1);
                          } catch (error) {
                            console.log("Error refreshing game:", error);
                            setLoadingGameNum(-1);
                          }
                        }}
                      >
                        <img
                          src="/icons/arrows-rotate.svg"
                          width={18}
                          className={`${loadingGameNum === idx ? "refresh-icon" : ""}`}
                        />
                      </button>
                      <Tooltip id={`refresh-game-${idx}`} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {(selectedGame && hasInsufficientTokenBalance) 
      && 
      <BalanceWarning 
        activeGame={selectedGame} 
        tokenBalance={tokenBalance}
        setHasInsufficientTokenBalance={setHasInsufficientTokenBalance}
        setTokenBalance={setTokenBalance}/>}
      <NotificationContainer />

      <div className="footerContainer" style={{ bottom: "5rem"}}>
        <div className="desktop-only" style={{ position: "fixed", right: "20px", width: "fit-content", height: "fit-content" }}>
          {renderRegionButtons()}
        </div>
        <FooterLink />
      </div>
    </div>
  );
};

export default Home;
