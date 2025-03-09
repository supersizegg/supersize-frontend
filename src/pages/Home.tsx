import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import FooterLink from "@components/Footer";

import "./Home.scss";

import { ActiveGame } from "@utils/types";
import { cachedTokenMetadata, NETWORK, options } from "@utils/constants";

import { fetchTokenMetadata, getMyPlayerStatus, formatBuyIn } from "@utils/helper";
import { FindEntityPda, FindComponentPda, FindWorldPda, createDelegateInstruction, createUndelegateInstruction } from "@magicblock-labs/bolt-sdk";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Tooltip } from "react-tooltip";

import { MenuBar } from "@components/menu/MenuBar";
import BuyInModal from "@components/buyInModal";
import { Spinner } from "@components/util/Spinner";
import { gameExecuteJoin } from "@states/gameExecuteJoin";

import { COMPONENT_MAP_ID, COMPONENT_ANTEROOM_ID, COMPONENT_PLAYER_ID } from "../states/gamePrograms";
import { FetchedGame, PlayerInfo } from "@utils/types";
import { anteroomFetchOnChain, mapFetchOnChain, mapFetchOnSpecificEphem, playerFetchOnEphem, playerFetchOnSpecificEphem } from "../states/gameFetch";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import { endpoints } from "@utils/constants";
import { createUnloadedGame } from "@utils/game";
import { stringToUint8Array, getRegion, getCustomErrorCode } from "@utils/helper";
import { gameSystemJoin } from "@states/gameSystemJoin";
import { gameSystemCashOut } from "@states/gameSystemCashOut";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import Alert from "@components/Alert";

function getPingColor(ping: number) {
  if (ping < 0) return "red";
  if (ping <= 100) return "#00d37d"; // green
  if (ping <= 800) return "yellow";
  return "red";
}

type homeProps = {
  selectedGame: ActiveGame | null;
  setSelectedGame: (game: ActiveGame | null) => void;
  setMyPlayerEntityPda: (pda: PublicKey | null) => void;
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: (games: FetchedGame[]) => void;
};

const Home = ({
  selectedGame,
  setSelectedGame,
  setMyPlayerEntityPda,
  activeGamesLoaded,
  setActiveGamesLoaded,
}: homeProps) => {
  const navigate = useNavigate();
  const engine = useMagicBlockEngine();
  const activeGamesRef = useRef<FetchedGame[]>(activeGamesLoaded);
  const [inputValue, setInputValue] = useState<string>("");
  const [isBuyInModalOpen, setIsBuyInModalOpen] = useState(false);
  const [selectedGamePlayerInfo, setSelectedGamePlayerInfo] = useState<PlayerInfo>({
    playerStatus: "new_player",
    need_to_delegate: false,
    need_to_undelegate: false,
    newplayerEntityPda: new PublicKey(0),
  });
  const pingResultsRef = useRef<{ endpoint: string; pingTime: number; region: string }[]>(
    endpoints[NETWORK].map((endpoint) => ({ endpoint: endpoint, pingTime: 0, region: getRegion(endpoint) })),
  );
  const isSearchingGame = useRef(false);
  const selectedServer = useRef<string>("");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [isLoadingCurrentGames, setIsLoadingCurrentGames] = useState(true);
  const [loadingGameNum, setLoadingGameNum] = useState(-1);
  const [cashoutTx, setCashoutTx] = useState<string>("");
  const checkActiveGamesLoadedCallCount = useRef(0);
  const checkActiveGamesLoadedWait = useRef(500);
  const [numberOfGamesInEndpoint, setNumberOfGamesInEndpoint] = useState<null | number>(null);
  const [hasInsufficientTokenBalance, setHasInsufficientTokenBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(-1);
  const [submittingBuyIn, setSubmittingBuyIn] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };
  const handleEnterKeyPress = async (inputValue: string) => {
    console.log("Searching game", inputValue);
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
          const mapEntityPda = FindEntityPda({
            worldId: worldId.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array("origin"),
          });
          const mapComponentPda = FindComponentPda({
            componentId: COMPONENT_MAP_ID,
            entity: mapEntityPda,
          });
          const thisEndpoint = endpoints[NETWORK][options.indexOf(selectedServer.current)];
          const mapParsedData = await mapFetchOnSpecificEphem(engine, mapComponentPda, thisEndpoint);
          if (mapParsedData) {
            newGameInfo.activeGame.endpoint = thisEndpoint;
            newGameInfo.activeGame.name = mapParsedData.name;
            newGameInfo.activeGame.max_players = mapParsedData.maxPlayers;
            newGameInfo.activeGame.size = mapParsedData.width;
            newGameInfo.activeGame.buy_in = mapParsedData.buyIn.toNumber();
            newGameInfo.activeGame.isLoaded = true;

            const pingTime = await pingEndpoint(thisEndpoint);
            newGameInfo.activeGame.ping = pingTime;
            const anteseed = "ante";
            const anteEntityPda = FindEntityPda({
              worldId: worldId.worldId,
              entityId: new anchor.BN(0),
              seed: stringToUint8Array(anteseed),
            });
            const anteComponentPda = FindComponentPda({
              componentId: COMPONENT_ANTEROOM_ID,
              entity: anteEntityPda,
            });
            const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
            let mint_of_token_being_sent = new PublicKey(0);
            if (anteParsedData && anteParsedData.token) {
              newGameInfo.activeGame.decimals = anteParsedData.tokenDecimals;
              mint_of_token_being_sent = anteParsedData.token;
              try {
                const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
                newGameInfo.activeGame.image = image;
                newGameInfo.activeGame.token = name;
                newGameInfo.activeGame.tokenMint = mint_of_token_being_sent;
              } catch (error) {
                console.error("Error fetching token data:", error);
              }
            }
            console.log("new game info", newGameInfo.activeGame.worldId, newGameInfo.activeGame.worldPda.toString());
            newGameInfo.activeGame.isLoaded = true;
            setSelectedGame(newGameInfo.activeGame);

            const result = await getMyPlayerStatus(
              engine,
              newGameInfo.activeGame.worldId,
              mapParsedData.maxPlayers,
              thisEndpoint,
            );
            let activeplayers = 0;
            let need_to_delegate = false;
            let need_to_undelegate = false;
            let newplayerEntityPda = new PublicKey(0);
            let playerStatus = "new_player";
            let max_players = mapParsedData.maxPlayers;

            if (isPlayerStatus(result)) {
              if (result.playerStatus == "error") {
                console.log("Error fetching player status");
                activeplayers = result.activeplayers;
                max_players = result.max_players;
                if (activeplayers == mapParsedData.maxPlayers) {
                  playerStatus = "Game Full";
                } else {
                  playerStatus = result.playerStatus;
                }
              } else {
                activeplayers = result.activeplayers;
                need_to_delegate = result.need_to_delegate;
                need_to_undelegate = result.need_to_undelegate;
                newplayerEntityPda = result.newplayerEntityPda;
                playerStatus = result.playerStatus;
                max_players = result.max_players;
              }
            } else {
              console.error("Error fetching player status");
            }

            newGameInfo.activeGame.active_players = activeplayers;
            newGameInfo.activeGame.max_players = max_players;

            setActiveGamesLoaded([
              ...activeGamesLoaded,
              {
                activeGame: newGameInfo.activeGame,
                playerInfo: {
                  playerStatus: playerStatus,
                  need_to_delegate: need_to_delegate,
                  need_to_undelegate: need_to_undelegate,
                  newplayerEntityPda: newplayerEntityPda,
                },
              },
            ]);
            activeGamesRef.current = [
              ...activeGamesRef.current,
              {
                activeGame: newGameInfo.activeGame,
                playerInfo: {
                  playerStatus: playerStatus,
                  need_to_delegate: need_to_delegate,
                  need_to_undelegate: need_to_undelegate,
                  newplayerEntityPda: newplayerEntityPda,
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
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleEnterKeyPress(inputValue);
    }
  };

  const pingEndpoint = async (url: string): Promise<number> => {
    const startTime = performance.now();
    try {
      await fetch(url, { method: "OPTIONS" });
    } catch (error) {
      console.error(`Failed to ping ${url}:`, error);
      // -1 indicates an error/timeout
      return -1;
    }
    const endTime = performance.now();
    return Math.round(endTime - startTime);
  };

  function isPlayerStatus(
    result:
      | {
          playerStatus: string;
          need_to_delegate: boolean;
          need_to_undelegate: boolean;
          newplayerEntityPda: PublicKey;
          activeplayers: number;
          max_players: number;
        }
      | "error",
  ) {
    return typeof result === "object" && "activeplayers" in result;
  }

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

      let activeplayers = 0;
      let need_to_delegate = false;
      let need_to_undelegate = false;
      let newplayerEntityPda = new PublicKey(0);
      let playerStatus = "new_player";
      let max_players = activeGamesLoaded[index].activeGame.max_players;
      const result = await getMyPlayerStatus(
        engine,
        activeGamesLoaded[index].activeGame.worldId,
        activeGamesLoaded[index].activeGame.max_players,
        activeGamesLoaded[index].activeGame.endpoint,
      );
      if (isPlayerStatus(result)) {
        if (result.playerStatus == "error") {
          console.log("Error fetching player status");
          activeplayers = result.activeplayers;
          max_players = result.max_players;
          if (activeplayers == activeGamesLoaded[index].activeGame.max_players) {
            playerStatus = "Game Full";
          } else {
            playerStatus = result.playerStatus;
          }
        } else {
          need_to_delegate = result.need_to_delegate;
          need_to_undelegate = result.need_to_undelegate;
          playerStatus = result.playerStatus;
          activeplayers = result.activeplayers;
          newplayerEntityPda = result.newplayerEntityPda;
          max_players = result.max_players;
        }
      } else {
        console.log("Error fetching player status");
      }

      const newgame: FetchedGame = {
        activeGame: {
          ...activeGamesLoaded[index].activeGame,
          isLoaded: true,
          active_players: activeplayers,
          max_players: max_players,
        } as ActiveGame,
        playerInfo: {
          playerStatus: playerStatus,
          need_to_delegate: need_to_delegate,
          need_to_undelegate: need_to_undelegate,
          newplayerEntityPda: newplayerEntityPda,
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

  const fetchAndLogMapData = async (
    engine: MagicBlockEngine,
    activeGamesLoaded: FetchedGame[],
    server: string,
    firstLoad: boolean = false,
  ) => {
    let pingResults = await pingSpecificEndpoint(server);
    let pingTime = pingResults.pingTime;
    pingResultsRef.current = pingResultsRef.current.map((result) =>
      result.endpoint === server ? { ...result, pingTime: pingTime } : result
    );
    
    const gameCopy = [...activeGamesLoaded];
    let filteredGames = gameCopy.filter((game) => {
      return server === game.activeGame.endpoint;
    });

    for (let i = 0; i < filteredGames.length; i++) {
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

        const mapseed = "origin";
        const mapEntityPda = FindEntityPda({
          worldId: filteredGames[i].activeGame.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array(mapseed),
        });
        const mapComponentPda = FindComponentPda({
          componentId: COMPONENT_MAP_ID,
          entity: mapEntityPda,
        });

        try {
          let token_image = `${process.env.PUBLIC_URL}/token.png`;
          let token_name = "LOADING";
          let token_mint = new PublicKey(0);
          let buy_in = 0;
          let decimals = 0;
          const anteseed = "ante";
          const anteEntityPda = FindEntityPda({
            worldId: filteredGames[i].activeGame.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(anteseed),
          });
          const anteComponentPda = FindComponentPda({
            componentId: COMPONENT_ANTEROOM_ID,
            entity: anteEntityPda,
          });
          const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
          let mint_of_token_being_sent = new PublicKey(0);
          if (anteParsedData && anteParsedData.token) {
            mint_of_token_being_sent = anteParsedData.token;
            buy_in = anteParsedData.buyIn.toNumber();
            try {
              const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
              token_image = image;
              token_name = name;
              token_mint = mint_of_token_being_sent;
              decimals = anteParsedData.tokenDecimals;
            } catch (error) {
              console.error("Error fetching token data:", error);
            }
          }
          const mapParsedData = await mapFetchOnChain(engine, mapComponentPda);
          if (mapParsedData) {
            let activeplayers = 0;
            let need_to_delegate = false;
            let need_to_undelegate = false;
            let newplayerEntityPda: PublicKey | null = new PublicKey(0);
            let playerStatus = "new_player";
            let max_players = mapParsedData.maxPlayers;

            const result = await getMyPlayerStatus(
              engine,
              filteredGames[i].activeGame.worldId,
              mapParsedData.maxPlayers,
              server,
            );
            if (isPlayerStatus(result)) {
              //console.log("result", result);
              if (result.playerStatus == "error") {
                console.log("Error fetching player status");
                activeplayers = result.activeplayers;
                max_players = result.max_players;
                if (activeplayers == mapParsedData.maxPlayers) {
                  playerStatus = "Game Full";
                } else {
                  playerStatus = result.playerStatus;
                }
              } else {
                activeplayers = result.activeplayers;
                need_to_delegate = result.need_to_delegate;
                need_to_undelegate = result.need_to_undelegate;
                newplayerEntityPda = result.newplayerEntityPda;
                playerStatus = result.playerStatus;
                max_players = result.max_players;
              }
            } else {
              console.log("Error fetching player status");
            }
            const newgame: FetchedGame = {
              activeGame: {
                ...filteredGames[i].activeGame,
                isLoaded: true,
                name: mapParsedData.name,
                active_players: activeplayers,
                max_players: max_players,
                size: mapParsedData.width,
                image: token_image,
                token: token_name,
                tokenMint: token_mint,
                buy_in: buy_in,
                decimals: decimals,
                endpoint: filteredGames[i].activeGame.endpoint,
                ping: pingTime  || 0,
              } as ActiveGame,
              playerInfo: {
                playerStatus: playerStatus,
                need_to_delegate: need_to_delegate,
                need_to_undelegate: need_to_undelegate,
                newplayerEntityPda: newplayerEntityPda,
              } as PlayerInfo,
            };

            const mergedGames = [...filteredGames];
            mergedGames[i] = newgame;
            filteredGames = mergedGames;
            activeGamesRef.current.forEach((game, index) => {
              if (game.activeGame.worldId.toString() === filteredGames[i].activeGame.worldId.toString()) {
                if (
                  // (filteredGames[i].activeGame.ping == 0 && !firstLoad) ||
                  (activeGamesRef.current[i].activeGame.ping == 0 && firstLoad)
                ) {
                  activeGamesRef.current[index] = filteredGames[i];
                }
              }
            });
            setActiveGamesLoaded(mergedGames);
          }
        } catch (error) {
          console.log(`Error fetching map data for game ID ${filteredGames[i].activeGame.worldId}:`, error);
        }
      } catch (error) {
        console.log("Error fetching map data:", error);
      }
    }
  };

  const fetchTokenBalance = async (activeGame: ActiveGame) => {
    if (!activeGame || !activeGame.tokenMint) return;
    const connection = engine.getConnectionChain();
    const wallet = engine.getWalletPayer();
    if (!wallet) return;

    try {
      if (!activeGame.tokenMint) return;
      const tokenMint = new PublicKey(activeGame.tokenMint);

      const tokenAccounts = await connection.getTokenAccountsByOwner(wallet, {
        mint: tokenMint,
      });
      let balance = 0;
      if (tokenAccounts.value.length > 0) {
        const accountInfo = tokenAccounts.value[0].pubkey;
        const balanceInfo = await connection.getTokenAccountBalance(accountInfo);
        console.log("balanceInfo", balanceInfo);
        balance = parseInt(balanceInfo.value.amount) || 0;
        setTokenBalance(balance);
      }
      if (balance < activeGame.buy_in) {
        setHasInsufficientTokenBalance(true);
      } else {
        setHasInsufficientTokenBalance(false);
      }
    } catch (error) {
      console.log("Error fetching token balance:", error);
    }
  };
  
  const BalanceWarning: React.FC<{ activeGame: ActiveGame }> = ({ activeGame }) => {
    const tokenMint = activeGame.tokenMint?.toString();
    const tokenMetadata = tokenMint ? cachedTokenMetadata[tokenMint] : null;

    let swapLink = "";
    let swapText = "";

    if (tokenMint) {
      if (tokenMetadata?.raydium) {
        swapLink = `https://raydium.io/swap/?inputMint=sol&outputMint=${tokenMint}`;
        swapText = "Buy some on Raydium.";
      } else {
        swapLink = `https://jup.ag/swap/SOL-${tokenMint}`;
        swapText = "Buy some on Jupiter.";
      }
    }

    const [opacity, setOpacity] = React.useState(100);

    React.useEffect(() => {
      const fadeOutTimer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          setHasInsufficientTokenBalance(false);
          setTokenBalance(-1);
        }, 1000);
      }, 4000);

      return () => {
        clearTimeout(fadeOutTimer);
      };
    }, []);

    return (
      <div
        className={`balance-warning fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[900]`}
        style={{ opacity: opacity, transition: "opacity 1s ease-in-out" }}
      >
        Your token balance <b>{tokenBalance >= 0 ? tokenBalance : ""}</b> is below the buy-in amount.{" "}
        {swapLink && (
          <a href={swapLink} target="_blank" rel="noopener noreferrer">
            {swapText}
          </a>
        )}
      </div>
    );
  };

  const handlePlayButtonClick = async (game: FetchedGame) => {
    engine.setEndpointEphemRpc(game.activeGame.endpoint);
    setSelectedGame(game.activeGame);
    setSelectedGamePlayerInfo(game.playerInfo);

    if (game.playerInfo.playerStatus === "new_player") {
      setSubmittingBuyIn(true);
      const statusCheck = await getMyPlayerStatus(
        engine,
        game.activeGame.worldId,
        game.activeGame.max_players,
        game.activeGame.endpoint,
      );
      if (isPlayerStatus(statusCheck)) {
        let activeplayers = 0;
        let need_to_delegate = false;
        let need_to_undelegate = false;
        let newplayerEntityPda = new PublicKey(0);
        let playerStatus = "new_player";
        if (statusCheck.playerStatus == "error") {
          console.log("Error fetching player status");
          activeplayers = statusCheck.activeplayers;
          if (activeplayers == game.activeGame.max_players) {
            playerStatus = "Game Full";
          } else {
            playerStatus = statusCheck.playerStatus;
          }
        } else {  
          need_to_delegate = statusCheck.need_to_delegate;
          need_to_undelegate = statusCheck.need_to_undelegate;
          newplayerEntityPda = statusCheck.newplayerEntityPda;
          playerStatus = statusCheck.playerStatus;
        }
        game.playerInfo = {
          playerStatus: playerStatus,
          need_to_delegate: need_to_delegate,
          need_to_undelegate: need_to_undelegate,
          newplayerEntityPda: newplayerEntityPda,
        };
      }
      fetchTokenBalance(game.activeGame);
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
        setMyPlayerEntityPda,
      );
      setSubmittingBuyIn(false);
      if (result.success) { 
        navigate("/game"); 
      }
    }
    if (game.playerInfo.playerStatus === "cashing_out") {
      try {
        const anteEntityPda = FindEntityPda({
          worldId: game.activeGame.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array("ante"),
        });
        const cashoutFeedback = await gameSystemCashOut(
          engine,
          game.activeGame,
          anteEntityPda,
          game.playerInfo.newplayerEntityPda,
        );
        if (cashoutFeedback) {
          setCashoutTx("cashout success");
        }
      } catch (cashoutError) {
        setCashoutTx("cashout failed");
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

  const pingEndpoints = async () => {
    const pingResults = await Promise.all(
      endpoints[NETWORK].map(async (endpoint) => {
        const pingTimes = await Promise.all([pingEndpoint(endpoint), pingEndpoint(endpoint), pingEndpoint(endpoint)]);
        const bestPingTime = Math.min(...pingTimes);
        return { endpoint: endpoint, pingTime: bestPingTime, region: options[endpoints[NETWORK].indexOf(endpoint)] };
      }),
    );
    const lowestPingEndpoint = pingResults.reduce((a, b) => (a.pingTime < b.pingTime ? a : b));
    return { pingResults: pingResults, lowestPingEndpoint: lowestPingEndpoint };
  };

  const pingSpecificEndpoint = async (endpoint: string) => {
    const pingTimes = await Promise.all([pingEndpoint(endpoint), pingEndpoint(endpoint), pingEndpoint(endpoint)]);
    const bestPingTime = Math.min(...pingTimes);
    return { endpoint: endpoint, pingTime: bestPingTime, region: options[endpoints[NETWORK].indexOf(endpoint)] };
  };

  const checkActiveGamesLoaded = async (thisServer: string) => {
    if (checkActiveGamesLoadedCallCount.current >= 5) {
      console.error("checkActiveGamesLoaded called too many times.");
      setIsLoadingCurrentGames(false);
      return;
    }

    if (activeGamesRef.current.filter((row) => row.activeGame.ping > 0).length === 0) {
      await fetchAndLogMapData(engine, activeGamesRef.current, thisServer, true);

      checkActiveGamesLoadedCallCount.current++;
      checkActiveGamesLoadedWait.current *= 2;

      setTimeout(checkActiveGamesLoaded, checkActiveGamesLoadedWait.current);
    } else {
      setIsLoadingCurrentGames(false);
      checkActiveGamesLoadedCallCount.current = 0;
      checkActiveGamesLoadedWait.current = 500;
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
        await fetchAndLogMapData(engine, activeGamesRef.current, selectedEndpoint, true);
        setTimeout(
          checkActiveGamesLoaded,
          checkActiveGamesLoadedWait.current,
          selectedEndpoint,
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (activeGamesRef.current.filter((row) => row.activeGame.ping > 0).length > 0) {
          setIsLoadingCurrentGames(false);
          checkActiveGamesLoadedWait.current = 500;
          checkActiveGamesLoadedCallCount.current = 0;
        }
      }
    };
    fetchGameData();
  }, [selectedEndpoint]);

  const renderRegionButtons = () => {
    return (
      <div className="region-buttons flex flex-row flex-start w-[fit-content] h-[100%] items-center justify-center">
        {pingResultsRef.current.map((item) => (
          <button
            key={`region-${item.region}`}
            className={`region-button mr-1 ml-1 text-white pl-2 pr-2 py-1 rounded-md ${
              isLoadingCurrentGames ? "cursor-not-allowed" : "cursor-pointer"
            } transition-colors ${
              selectedServer.current === item.region ? "bg-[#666] hover:bg-[#555]" : "bg-[#444] hover:bg-[#555]"
            }`}
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
                const prewnewgame: FetchedGame = {
                  activeGame: {
                    ...clearPingGames[i].activeGame,
                    active_players: -1,
                    ping: 0,
                  } as ActiveGame,
                  playerInfo: {
                    ...clearPingGames[i].playerInfo,
                  } as PlayerInfo,
                };
                clearPingGames[i] = prewnewgame;
              }
              activeGamesRef.current = clearPingGames;
              setActiveGamesLoaded(clearPingGames);
              const thisEndpoint = item.endpoint;
              setSelectedEndpoint(thisEndpoint);
            }}
            disabled={isLoadingCurrentGames}
          >
            <div>
              <span>{item.region} </span>{" "}
              <span style={{ fontSize: "10px", color: getPingColor(item.pingTime) }}>({item.pingTime}ms)</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="main-container">
      <MenuBar />

      <div className="banner">
        <img
          src="https://d23exngyjlavgo.cloudfront.net/solana_DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
          alt="BONK Logo"
          className="banner-logo"
        />
        <div className="banner-text">
          <h1 className="banner-title">BONK Pre‑season is live!</h1>
          <p className="banner-description">
            The top 10 players will share a <span className="highlight">150,000,000 BONK</span> prize pool. The
            leaderboard snapshot will be taken at 00:00 UTC on March 5.{" "}
            <a
              href="https://x.com/supersizegg/status/1894802350646403538"
              style={{ textDecoration: "underline", color: "#ffa500" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read more
            </a>
          </p>
        </div>
      </div>

      {isBuyInModalOpen && selectedGame && (
        <BuyInModal
          setIsBuyInModalOpen={setIsBuyInModalOpen}
          activeGame={selectedGame}
          setMyPlayerEntityPda={setMyPlayerEntityPda}
          selectedGamePlayerInfo={selectedGamePlayerInfo}
        />
      )}
      <div className="home-container">
        <div className="mobile-only mobile-alert">For the best experience, use a desktop or laptop.</div>
        <div className="home-header">
          <div>{renderRegionButtons()}</div>
          <div className="header-buttons desktop-only">
            <button className="btn-outlined btn-orange" onClick={() => navigate("/about")}>
              <span className="desktop-only">How to Play</span>
              <span className="mobile-only">About</span>
            </button>
            <button className="btn-outlined btn-green" onClick={() => navigate("/create-game")}>
              + Create Game
            </button>
          </div>
        </div>

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
              {activeGamesLoaded.filter((row) => row.activeGame.ping > 0).length == 0 && (
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
                .filter((row) => row.activeGame.endpoint === selectedEndpoint)
                .map((row, idx) => (
                  <tr key={idx} style={{ display: row.activeGame.ping <= 0 ? "none" : "table-row" }}>
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
                          <img src={row.activeGame.image} alt={row.activeGame.name} className="token-image" />
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
                          row.activeGame.ping < 0 ||
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
                              //activeGamesRef.current.filter((row) => row.activeGame.ping > 0),
                              activeGamesLoaded.filter((row) => row.activeGame.endpoint === selectedEndpoint),
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
      {cashoutTx != "" && (
        <Alert
          type={cashoutTx.includes("failed") ? "error" : "success"}
          message={cashoutTx}
          onClose={() => {
            setCashoutTx("");
          }}
        />
      )}
      {(selectedGame && selectedGame.buy_in && (hasInsufficientTokenBalance || (tokenBalance !== -1 && tokenBalance < selectedGame.buy_in))) 
      && 
      <BalanceWarning 
        activeGame={selectedGame} />}
      {(submittingBuyIn && selectedGame && selectedGame.buy_in && (!hasInsufficientTokenBalance || tokenBalance >= selectedGame.buy_in)) 
      && 
      <><div className={`text-[#FFD700] fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[900]`}>Submitting buy in...</div> </>}
      <FooterLink />
    </div>
  );
};

export default Home;
