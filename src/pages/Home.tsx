import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FooterLink from "@components/Footer/Footer";
import "./Home.scss";
import { ActiveGame, Food } from "@utils/types";
import { cachedTokenMetadata, NETWORK, options } from "@utils/constants";
import { formatBuyIn, fetchTokenBalance, pingEndpoints, pingSpecificEndpoint, getMaxPlayers } from "@utils/helper";
import {
  FindEntityPda,
  FindComponentPda,
  FindWorldPda,
  createDelegateInstruction,
  BN,
} from "@magicblock-labs/bolt-sdk";
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

type ClaimStatus = {
  canClaim: boolean;
  message: string;
  nextClaimAvailableAt: string;
  secondsRemaining: number;
};

type homeProps = {
  selectedGame: ActiveGame | null;
  setSelectedGame: (game: ActiveGame | null) => void;
  setMyPlayerEntityPda: (pda: PublicKey | null) => void;
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: (games: FetchedGame[]) => void;
  randomFood: Food[];
};

const Home = ({
  selectedGame,
  setSelectedGame,
  setMyPlayerEntityPda,
  activeGamesLoaded,
  setActiveGamesLoaded,
  randomFood,
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
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [isClaimLoading, setIsClaimLoading] = useState(false);

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
    if (NETWORK === "mainnet") {
      engine.setChain();
      engine.setEndpointEphemRpc(thisEndpoint);
    } else {
      engine.setDevnet();
      engine.setEndpointEphemRpc(thisEndpoint);
    }
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
          const { gameInfo: updateGameInfo, anteroomData } = await getGameData(
            engine,
            worldId.worldId,
            thisEndpoint,
            newGameInfo.activeGame,
          );
          newGameInfo.activeGame = updateGameInfo;
          if (newGameInfo.activeGame.max_players > 0) {
            console.log("new game info", newGameInfo.activeGame.worldId, newGameInfo.activeGame.worldPda.toString());
            setSelectedGame(newGameInfo.activeGame);
            let updatedPlayerInfo = await updatePlayerInfo(
              engine,
              newGameInfo.activeGame.worldId,
              newGameInfo.activeGame.max_players,
              "new_player",
              new PublicKey(0),
              0,
              false,
              false,
              thisEndpoint,
            );
            newGameInfo.activeGame.active_players = updatedPlayerInfo.activeplayers;
            newGameInfo.activeGame.max_players = updatedPlayerInfo.max_players;

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

  const handleRefresh = async (engine: MagicBlockEngine, activeGamesLoaded: FetchedGame[], index: number) => {
    setIsLoadingCurrentGames(true);
    try {
      const refreshedGames = [...activeGamesLoaded];
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

      const server = activeGamesLoaded[index].activeGame.endpoint;
      console.log("server", server);
      let serverIndex = endpoints["devnet"].indexOf(server);
      if (serverIndex >= 0) {
        engine.setDevnet();
        engine.setEndpointEphemRpc(server);
      } else {
        engine.setChain();
        engine.setEndpointEphemRpc(server);
      }

      let max_players = getMaxPlayers(activeGamesLoaded[index].activeGame.size);
      let updatedPlayerInfo = await updatePlayerInfo(
        engine,
        activeGamesLoaded[index].activeGame.worldId,
        max_players,
        activeGamesLoaded[index].playerInfo.playerStatus,
        activeGamesLoaded[index].playerInfo.newplayerEntityPda,
        activeGamesLoaded[index].activeGame.active_players,
        activeGamesLoaded[index].playerInfo.need_to_delegate,
        activeGamesLoaded[index].playerInfo.need_to_undelegate,
        activeGamesLoaded[index].activeGame.endpoint,
      );
      const newgame: FetchedGame = {
        activeGame: {
          ...activeGamesLoaded[index].activeGame,
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
      setActiveGamesLoaded([...refreshedGames]);
      setIsLoadingCurrentGames(false);
    } catch (error) {
      console.log("Error refreshing games:", error);
      setIsLoadingCurrentGames(false);
    }
  };

  const fetchAndLogMapData = async (engine: MagicBlockEngine, activeGamesLoaded: FetchedGame[], server: string) => {
    let pingResults = await pingSpecificEndpoint(server);
    let pingTime = pingResults.pingTime;
    pingResultsRef.current = pingResultsRef.current.map((result) =>
      result.endpoint === server ? { ...result, pingTime: pingTime } : result,
    );
    console.log("activeGamesLoaded", activeGamesLoaded);

    const gameCopy = [...activeGamesLoaded];
    let filteredGames = gameCopy.filter((game) => {
      return server === game.activeGame.endpoint;
    });

    const serverIndex = endpoints[NETWORK].indexOf(server);

    if (NETWORK === "mainnet") {
      console.log(`Server index in mainnet endpoints: ${serverIndex}`);
      const gameCopy = [...activeGamesLoaded];
      filteredGames = gameCopy.filter((game) => {
        return server === game.activeGame.endpoint || game.activeGame.endpoint === endpoints["devnet"][serverIndex];
      });
    }
    console.log("filteredGames", filteredGames);
    for (let i = 0; i < filteredGames.length; i++) {
      let isDevnet = filteredGames[i].activeGame.endpoint === endpoints["devnet"][serverIndex];
      console.log("isDevnet", isDevnet);
      if (isDevnet) {
        engine.setDevnet();
        engine.setEndpointEphemRpc(endpoints["devnet"][serverIndex]);
      } else {
        engine.setChain();
        engine.setEndpointEphemRpc(endpoints[NETWORK][serverIndex]);
      }
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
        const { gameInfo: updateGameInfo, anteroomData } = await getGameData(
          engine,
          activeGameCopy.worldId,
          activeGameCopy.endpoint,
          activeGameCopy,
        );
        activeGameCopy = updateGameInfo;
        let max_players = getMaxPlayers(activeGameCopy.size);
        let updatedPlayerInfo = await updatePlayerInfo(
          engine,
          activeGameCopy.worldId,
          max_players,
          filteredGames[i].playerInfo.playerStatus,
          filteredGames[i].playerInfo.newplayerEntityPda,
          activeGameCopy.active_players,
          filteredGames[i].playerInfo.need_to_delegate,
          filteredGames[i].playerInfo.need_to_undelegate,
          activeGameCopy.endpoint,
        );
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
        console.log("filteredGames", filteredGames);
        activeGamesRef.current.forEach((game, index) => {
          if (game.activeGame.worldId.toString() === filteredGames[i].activeGame.worldId.toString()) {
            activeGamesRef.current[index] = filteredGames[i];
          }
        });
        setActiveGamesLoaded(mergedGames);
      } catch (error) {
        console.log(`Error fetching map data for game ID ${filteredGames[i].activeGame.worldId}:`, error);
      }
    }
  };

  const handlePlayButtonClick = async (game: FetchedGame) => {
    let serverIndex = endpoints["devnet"].indexOf(game.activeGame.endpoint);
    let isDevnet = serverIndex >= 0;
    console.log("serverIndex", serverIndex);
    if (isDevnet) {
      engine.setDevnet();
      engine.setEndpointEphemRpc(game.activeGame.endpoint);
    } else {
      engine.setChain();
      engine.setEndpointEphemRpc(game.activeGame.endpoint);
    }
    //engine.setEndpointEphemRpc(game.activeGame.endpoint);
    setSelectedGame(game.activeGame);

    if (game.playerInfo.playerStatus === "new_player") {
      const alertId = NotificationService.addAlert({
        type: "success",
        message: "submitting buy in...",
        shouldExit: false,
      });
      let max_players = getMaxPlayers(game.activeGame.size);
      let updatedPlayerInfo = await updatePlayerInfo(
        engine,
        game.activeGame.worldId,
        max_players,
        game.playerInfo.playerStatus,
        game.playerInfo.newplayerEntityPda,
        game.activeGame.active_players,
        game.playerInfo.need_to_delegate,
        game.playerInfo.need_to_undelegate,
        game.activeGame.endpoint,
      );
      if (updatedPlayerInfo.playerStatus == "Game Full" || updatedPlayerInfo.playerStatus == "error") {
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
      const { tokenBalance, hasInsufficientTokenBalance } = await fetchTokenBalance(engine, game.activeGame, isDevnet);
      setTokenBalance(tokenBalance);
      setHasInsufficientTokenBalance(hasInsufficientTokenBalance);

      const retrievedUser = localStorage.getItem("user");
      let myusername = "unnamed";
      if (retrievedUser) {
        myusername = JSON.parse(retrievedUser).name;
      }
      const result = await gameExecuteJoin(
        engine,
        game.activeGame,
        game.activeGame.buy_in,
        myusername,
        game.playerInfo,
        isDevnet,
        setMyPlayerEntityPda,
      );
      if (result.success) {
        navigate("/game");
      } else {
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
          isDevnet,
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
        } else {
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
    await fetchAndLogMapData(engine, activeGamesRef.current, selectedEndpoint);
    setIsLoadingCurrentGames(false);
  };

  const fetchUserTokenBalance = async () => {
    try {
      let connection = engine.getConnectionChainDevnet();
      const tokenMint = new PublicKey("8WQCnApczthptxS77aRQFzkrnXRjvGvfrateAK39PXpQ");
      let balance = 0;
      const tokenAccounts = await connection.getTokenAccountsByOwner(engine.getSessionPayer(), {
        mint: tokenMint,
      });
      if (tokenAccounts.value.length > 0) {
        const accountInfo = tokenAccounts.value[0].pubkey;
        const balanceInfo = await connection.getTokenAccountBalance(accountInfo);
        balance = parseInt(balanceInfo.value.amount) || 0;
        setGemBalance(balance / 10 ** 9);
      }
    } catch (error) {
      console.error("Error fetching gem balance:", error);
    }
  };

  const sessionPayerBase58 = useMemo(() => engine.getSessionPayer().toBase58(), [engine]);

  useEffect(() => {
    const fetchClaimStatus = async () => {
      try {
        const address = engine.getSessionPayer().toBase58();
        const res = await fetch(`https://supersize.miso.one/api/v1/airdrop/status?address=${address}`);
        const data: ClaimStatus = await res.json();
        setClaimStatus(data);
      } catch (error) {
        console.error("Error fetching claim status:", error);
      }
    };
    if (engine.getSessionPayer()) {
      console.log("Session keypair changed to", engine.getSessionPayer().toBase58());
      fetchClaimStatus();
      fetchUserTokenBalance();
    }
  }, [sessionPayerBase58]);

  const handleClaimGem = async () => {
    setIsClaimLoading(true);
    try {
      const address = engine.getSessionPayer().toBase58();
      const res = await fetch("https://supersize.miso.one/api/v1/airdrop/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (res.ok) {
        NotificationService.addAlert({
          type: "success",
          message: data.message || "Airdrop successful",
          shouldExit: true,
        });
        await fetchUserTokenBalance();
        const statusRes = await fetch(`https://supersize.miso.one/api/v1/airdrop/status?address=${address}`);
        const statusData: ClaimStatus = await statusRes.json();
        setClaimStatus(statusData);
      } else {
        NotificationService.addAlert({
          type: "error",
          message: data.message || "Airdrop failed",
          shouldExit: true,
        });
      }
    } catch (error) {
      console.error("Error claiming gem:", error);
      NotificationService.addAlert({
        type: "error",
        message: "Error claiming gem",
        shouldExit: true,
      });
    }
    setIsClaimLoading(false);
  };

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
        setTimeout(checkActiveGamesLoaded, checkActiveGamesLoadedWait.current, selectedEndpoint);
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
    const selected = pingResultsRef.current.find((item) => item.region === selectedServer.current);
    const others = pingResultsRef.current.filter((item) => item.region !== selectedServer.current);

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
                  if (selectedServer.current === item.region) {
                    let pingResults = await pingEndpoints();
                    pingResultsRef.current = pingResults.pingResults;
                    refreshAllGames();
                    return;
                  }

                  selectedServer.current = item.region;

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
          screenSize={{ width: window.innerWidth, height: window.innerHeight }}
          newTarget={{ x: 0, y: 0, boost: false }}
          gameSize={4000}
        />
      </div>
      <MenuBar />

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
          <h1 className="banner-title">
            Play Supersize, win <span style={{ color: "#00d37d" }}>SOL</span>
          </h1>
          <p className="banner-description">
            Eat tokens and grow your blob. Eat other players to steal their tokens. Cash out your tokens anytime.{" "}
            <button onClick={() => navigate("/about")} style={{ textDecoration: "underline", color: "#00d37d" }}>
              <span className="desktop-only">Learn more</span>
              <span className="mobile-only">Learn more</span>
            </button>
          </p>
        </div>
      </div>
      <div className="home-container" style={{ position: "relative" }}>
        <div className="mobile-only mobile-alert">For the best experience, use a desktop or laptop.</div>
        <div className="table-and-gems">
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
                <span
                  style={{ opacity: isSearchingGame.current ? "1" : "0", alignSelf: "center", marginRight: "10px" }}
                >
                  <Spinner />
                </span>
              </div>
            </div>
            <table className="lobby-table">
              <thead>
                <tr>
                  <th style={{ display: "none" }}>ID</th>
                  <th style={{ display: "none" }}>Creator</th>
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
                  .filter(
                    (row) =>
                      row.activeGame.endpoint === selectedEndpoint ||
                      row.activeGame.endpoint === endpoints["devnet"][endpoints[NETWORK].indexOf(selectedEndpoint)],
                  )
                  .map((row, idx) => (
                    <tr key={idx} style={{ display: !row.activeGame.isLoaded ? "none" : "table-row" }}>
                      <td style={{ display: "none" }}>{row.activeGame.worldId.toString()}</td>
                      <td style={{ display: "none" }}>
                        {row.activeGame.permissionless === true ? (
                          <span className="community-list">Community</span>
                        ) : (
                          <span className="strict-list">Supersize</span>
                        )}
                      </td>
                      <td>
                        {row.activeGame.isLoaded ? (
                          <>
                            <img
                              src={row.activeGame.image}
                              alt={row.activeGame.name}
                              className="token-image"
                              style={{ marginRight: "5px" }}
                            />
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
                              const serverIndex = endpoints[NETWORK].indexOf(selectedEndpoint);
                              await handleRefresh(
                                engine,
                                //activeGamesRef.current.filter((row) => row.activeGame.ping > 0),
                                activeGamesLoaded.filter(
                                  (row) =>
                                    row.activeGame.endpoint === selectedEndpoint ||
                                    row.activeGame.endpoint === endpoints["devnet"][serverIndex],
                                ),
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
          <div className="gem-balance-block">
            <div className="gem-balance-header">Your gems balance</div>
            <div className="gem-balance-amount">
              <span className="balance-text">{gemBalance.toFixed(2)}</span>
              <img src="/gem.png" alt="GEM" className="gem-icon" />
            </div>
            {claimStatus ? (
              claimStatus.canClaim ? (
                <button className="claim-gem-btn" onClick={handleClaimGem} disabled={isClaimLoading}>
                  {isClaimLoading ? "Claiming..." : "Claim 1 gem (8h)"}
                </button>
              ) : (
                <div className="claim-gem-info">
                  <p className="claim-message">You can claim free GEM once per 8h.</p>
                  {/* {claimStatus.secondsRemaining > 0 && (
                <> Time remaining: {claimStatus.secondsRemaining} seconds</>
              )} */}
                </div>
              )
            ) : (
              <div className="claim-gem-info">Loading claim status...</div>
            )}
          </div>
        </div>
      </div>
      {selectedGame && hasInsufficientTokenBalance && (
        <BalanceWarning
          activeGame={selectedGame}
          tokenBalance={tokenBalance}
          setHasInsufficientTokenBalance={setHasInsufficientTokenBalance}
          setTokenBalance={setTokenBalance}
        />
      )}
      <NotificationContainer />

      <div className="footerContainer" style={{ bottom: "5rem" }}>
        <div
          className="desktop-only"
          style={{ position: "fixed", right: "20px", width: "fit-content", height: "fit-content" }}
        >
          {renderRegionButtons()}
        </div>
        <FooterLink />
      </div>
    </div>
  );
};

export default Home;
