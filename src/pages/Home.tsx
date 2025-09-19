import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.scss";
import { ActiveGame } from "@utils/types";
import { NETWORK, openTimeHighStakesGames, API_URL, SLIME_CLAIM_INTERVAL_MS } from "@utils/constants";
import { formatBuyIn, fetchTokenBalance, pingSpecificEndpoint, getMaxPlayers, getNetwork } from "@utils/helper";
import { FindComponentPda, FindEntityPda, FindWorldPda } from "@magicblock-labs/bolt-sdk";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Tooltip } from "react-tooltip";
import { MenuBar } from "@components/menu/MenuBar";
import { Spinner } from "@components/util/Spinner";
import { gameExecuteJoin } from "@states/gameExecuteJoin";
import { COMPONENT_MAP_ID, COMPONENT_PLAYER_ID } from "../states/gamePrograms";
import { FetchedGame, PlayerInfo } from "@utils/types";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import { endpoints } from "@utils/constants";
import { createUnloadedGame } from "@utils/game";
import { getRegion, getGameData, updatePlayerInfo, areHighStakesGamesOpen } from "@utils/helper";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import { SupersizeVaultClient } from "../engine/SupersizeVaultClient";
import NotificationContainer from "@components/notification/NotificationContainer";
import NotificationService from "@components/notification/NotificationService";
import BalanceWarning from "@components/notification/BalanceWarning";
import Footer from "../components/Footer/Footer";
import { getHighStakesGamesOpenTime, isGamePaused, stringToUint8Array } from "../utils/helper";
import axios from "axios";
import { useBalance } from "../context/BalanceContext";

const fmtHM = (totalMinutes: number) => {
  const m = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h} hour${h !== 1 ? "s" : ""} and ${r} minute${r !== 1 ? "s" : ""}`;
};

const SLIME_REWARD_AMOUNT = 60;

interface SlimeBalanceResponse {
  wallet: string;
  exists: boolean;
  slime_balance: number;
  last_claimed_at: string | null;
  can_claim: boolean;
}

interface SlimeClaimResponse {
  wallet: string;
  can_claim: boolean;
  slime_balance: number;
  last_claimed_at: string | null;
  next_claim_at: string | null;
  claimed_amount?: number;
  error?: string;
}

type SlimeRewardState = {
  loading: boolean;
  claiming: boolean;
  canClaim: boolean;
  lastClaimedAt: string | null;
  nextClaimAt: string | null;
  sessionWallet: string | null;
  error: string | null;
};

const formatCountdownLabel = (msRemaining: number): string => {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString();
  //.padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  return `${hours}h ${minutes}m`;
};

type homeProps = {
  selectedGame: ActiveGame | null;
  setSelectedGame: (game: ActiveGame | null) => void;
  setMyPlayerEntityPda: (pda: PublicKey | null) => void;
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: (games: FetchedGame[]) => void;
  sessionWalletInUse: boolean;
  username: string;
};

const Home = ({
  selectedGame,
  setSelectedGame,
  setMyPlayerEntityPda,
  activeGamesLoaded,
  setActiveGamesLoaded,
  sessionWalletInUse,
  username,
}: homeProps) => {
  const navigate = useNavigate();
  const { engine, preferredRegion, endpointReady, invalidateEndpointCache } = useMagicBlockEngine();
  const { refreshBalance } = useBalance();
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
  const [tokenBalance, setTokenBalance] = useState(0);
  const [hasInsufficientTokenBalance, setHasInsufficientTokenBalance] = useState(false);
  const [highStakesGamesOpen, setHighStakesGamesOpen] = useState(false);
  const [highStakesGamesOpenTime, setHighStakesGamesOpenTime] = useState(0);
  const walletConnected = engine?.getWalletConnected() ?? false;
  const sessionWalletAddress = engine?.getSessionPayer()?.toString() ?? null;
  const [slimeReward, setSlimeReward] = useState<SlimeRewardState>({
    loading: true,
    claiming: false,
    canClaim: false,
    lastClaimedAt: null,
    nextClaimAt: null,
    sessionWallet: null,
    error: null,
  });
  const [nextClaimCountdown, setNextClaimCountdown] = useState("00:00");
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchClaimStatusRef = useRef<(() => Promise<void>) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  const scheduleCountdown = useCallback((nextClaimAt: string | null) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (!nextClaimAt) {
      if (mountedRef.current) setNextClaimCountdown("00:00");
      return;
    }

    const updateCountdown = () => {
      if (!mountedRef.current) return;
      const diff = new Date(nextClaimAt).getTime() - Date.now();
      if (diff <= 0) {
        setNextClaimCountdown("00:00");
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        if (fetchClaimStatusRef.current) {
          fetchClaimStatusRef.current();
        }
        return;
      }
      setNextClaimCountdown(formatCountdownLabel(diff));
    };

    updateCountdown();
    countdownTimerRef.current = setInterval(updateCountdown, 60_000);
  }, []);

  const fetchClaimStatus = useCallback(async () => {
    if (!engine) {
      scheduleCountdown(null);
      return;
    }

    const sessionWallet = engine.getSessionPayer()?.toString() ?? null;
    if (!sessionWallet) {
      if (mountedRef.current) {
        setSlimeReward({
          loading: false,
          claiming: false,
          canClaim: false,
          lastClaimedAt: null,
          nextClaimAt: null,
          sessionWallet: null,
          error: null,
        });
        setNextClaimCountdown("00:00");
      }
      scheduleCountdown(null);
      return;
    }

    if (mountedRef.current) {
      setSlimeReward((prev) => ({
        ...prev,
        loading: true,
        sessionWallet,
        error: null,
      }));
    }

    try {
      const { data } = await axios.get<SlimeBalanceResponse>(`${API_URL}/api/v1/slime`, {
        params: { wallet: sessionWallet },
      });

      if (!mountedRef.current) return;

      const nextClaimAt =
        data.can_claim || !data.last_claimed_at
          ? null
          : new Date(new Date(data.last_claimed_at).getTime() + SLIME_CLAIM_INTERVAL_MS).toISOString();

      setSlimeReward({
        loading: false,
        claiming: false,
        canClaim: data.can_claim,
        lastClaimedAt: data.last_claimed_at,
        nextClaimAt,
        sessionWallet,
        error: null,
      });
      scheduleCountdown(nextClaimAt);
    } catch (error) {
      console.error("Failed to fetch slime reward status", error);
      if (!mountedRef.current) return;

      setSlimeReward({
        loading: false,
        claiming: false,
        canClaim: false,
        lastClaimedAt: null,
        nextClaimAt: null,
        sessionWallet,
        error: "Unable to check reward right now.",
      });
      scheduleCountdown(null);
    }
  }, [engine, scheduleCountdown]);

  useEffect(() => {
    fetchClaimStatusRef.current = fetchClaimStatus;
  }, [fetchClaimStatus]);

  useEffect(() => {
    fetchClaimStatus();
  }, [fetchClaimStatus, walletConnected, sessionWalletAddress]);

  const handleClaim = useCallback(async () => {
    if (!engine) return;

    const sessionWallet = engine.getSessionPayer()?.toString() ?? null;
    if (!sessionWallet) {
      NotificationService.addAlert({ type: "error", message: "Session wallet not found." });
      return;
    }

    if (slimeReward.claiming) return;

    if (mountedRef.current) {
      setSlimeReward((prev) => ({
        ...prev,
        claiming: true,
        error: null,
        sessionWallet,
      }));
    }

    try {
      const { data } = await axios.post<SlimeClaimResponse>(`${API_URL}/api/v1/slime/claim`, {
        wallet: sessionWallet,
      });

      if (!mountedRef.current) return;

      const nextClaimAt =
        data.next_claim_at ||
        (data.last_claimed_at
          ? new Date(new Date(data.last_claimed_at).getTime() + SLIME_CLAIM_INTERVAL_MS).toISOString()
          : null);

      setSlimeReward({
        loading: false,
        claiming: false,
        canClaim: data.can_claim,
        lastClaimedAt: data.last_claimed_at,
        nextClaimAt,
        sessionWallet,
        error: null,
      });
      scheduleCountdown(nextClaimAt);
      NotificationService.addAlert({ type: "success", message: `Claimed ${SLIME_REWARD_AMOUNT} slime!` });
      await refreshBalance();
      fetchClaimStatusRef.current?.();
    } catch (error) {
      console.error("Failed to claim slime reward", error);
      if (!mountedRef.current) return;

      if (axios.isAxiosError(error) && error.response) {
        const { status, data } = error.response;
        const response = data as SlimeClaimResponse;
        const nextClaimAt =
          response?.next_claim_at ||
          (response?.last_claimed_at
            ? new Date(new Date(response.last_claimed_at).getTime() + SLIME_CLAIM_INTERVAL_MS).toISOString()
            : null);
        setSlimeReward((prev) => ({
          ...prev,
          claiming: false,
          canClaim: false,
          lastClaimedAt: response?.last_claimed_at ?? prev.lastClaimedAt,
          nextClaimAt,
          error:
            status === 429
              ? "Reward already claimed. Come back soon!"
              : response?.error || "Unable to claim reward right now.",
        }));
        scheduleCountdown(nextClaimAt);
        if (status !== 429) {
          NotificationService.addAlert({ type: "error", message: response?.error || "Unable to claim reward." });
        }
      } else {
        setSlimeReward((prev) => ({
          ...prev,
          claiming: false,
          error: "Unable to claim reward right now.",
        }));
        NotificationService.addAlert({ type: "error", message: "Unable to claim reward right now." });
      }
    }
  }, [engine, refreshBalance, scheduleCountdown, slimeReward.claiming]);

  const claimButtonDisabled =
    !slimeReward.sessionWallet || !slimeReward.canClaim || slimeReward.claiming || slimeReward.loading;
  const claimButtonLabel = slimeReward.claiming ? "Claiming..." : "Claim";

  const rewardStatusMessage = (() => {
    if (slimeReward.error) return slimeReward.error;
    if (slimeReward.loading) return "Free slime reward"; // "Checking reward...";
    if (!slimeReward.sessionWallet) return "Wallet not found";
    if (slimeReward.canClaim) return "Free slime reward";
    return `Next reward in ${nextClaimCountdown}`;
  })();
  const rewardStatusClassName = `reward-status${slimeReward.error ? " error" : ""}`;

  useEffect(() => {
    const timeZone = getRegion(selectedEndpoint);
    if (!timeZone) return;

    const tick = () => {
      const open = areHighStakesGamesOpen(openTimeHighStakesGames, timeZone);
      setHighStakesGamesOpen(open);
      const minutes = getHighStakesGamesOpenTime(openTimeHighStakesGames, timeZone);
      setHighStakesGamesOpenTime(minutes);
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [selectedEndpoint]);

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
    const thisEndpoint = engine.getEndpointEphemRpc();
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
          const { gameInfo: updateGameInfo } = await getGameData(
            engine,
            worldId.worldId,
            thisEndpoint,
            newGameInfo.activeGame,
          );
          newGameInfo.activeGame = updateGameInfo;
          if (newGameInfo.activeGame.max_players > 0) {
            console.log(
              "new game info",
              newGameInfo,
              updateGameInfo,
              newGameInfo.activeGame.worldId,
              newGameInfo.activeGame.worldPda.toString(),
            );
            setSelectedGame(newGameInfo.activeGame);
            let updatedPlayerInfo = await updatePlayerInfo(
              engine,
              newGameInfo.activeGame.worldId,
              newGameInfo.activeGame.max_players,
              "new_player",
              new PublicKey(0),
              0,
              thisEndpoint,
            );

            const mapEntityPda = FindEntityPda({
              worldId: newGameInfo.activeGame.worldId,
              entityId: new anchor.BN(0),
              seed: stringToUint8Array("origin"),
            });
            const mapComponentPda = FindComponentPda({
              componentId: COMPONENT_MAP_ID,
              entity: mapEntityPda,
            });
            /* const isPaused = await isGamePaused(engine, mapComponentPda, thisEndpoint);
            let final_active_players = -2;
            if (!isPaused) {
              final_active_players = updatedPlayerInfo.activeplayers;
            } */
            newGameInfo.activeGame.isLoaded = true;
            newGameInfo.activeGame.active_players = updatedPlayerInfo.activeplayers;

            activeGamesRef.current = [
              ...activeGamesRef.current,
              {
                activeGame: newGameInfo.activeGame,
                playerInfo: {
                  playerStatus: updatedPlayerInfo.playerStatus,
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
                  newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
                },
              },
            ]);
          }
        } catch (error) {
          console.log("Error fetching map data:", error);
        }
      } catch (error) {
        console.log("Invalid PublicKey:", error);
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
      let updatedPlayerInfo = await updatePlayerInfo(
        engine,
        activeGames[index].activeGame.worldId,
        max_players,
        activeGames[index].playerInfo.playerStatus,
        activeGames[index].playerInfo.newplayerEntityPda,
        activeGames[index].activeGame.active_players,
        activeGames[index].activeGame.endpoint,
      );

      const mapEntityPda = FindEntityPda({
        worldId: activeGames[index].activeGame.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });

      /* const isPaused = await isGamePaused(engine, mapComponentPda, activeGames[index].activeGame.endpoint);

      let final_active_players = -2;
      if (!isPaused) {
        final_active_players = updatedPlayerInfo.activeplayers;
      } */
      const newgame: FetchedGame = {
        activeGame: {
          ...activeGames[index].activeGame,
          isLoaded: true,
          active_players: updatedPlayerInfo.activeplayers,
        } as ActiveGame,
        playerInfo: {
          playerStatus: updatedPlayerInfo.playerStatus,
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

  const fetchAndLogMapData = async (engine: MagicBlockEngine, activeGames: FetchedGame[], server: string) => {
    let pingResults = await pingSpecificEndpoint(server);
    let pingTime = pingResults.pingTime;
    pingResultsRef.current = pingResultsRef.current.map((result) =>
      result.endpoint === server ? { ...result, pingTime: pingTime } : result,
    );
    let filteredGames = [...activeGames];
    for (let i = 0; i < filteredGames.length; i++) {
      //if not on server, set isloaded to false

      const mapEntityPda = FindEntityPda({
        worldId: filteredGames[i].activeGame.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });

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
      if (server !== filteredGames[i].activeGame.endpoint) {
        preNewGame.activeGame.isLoaded = false;
        preMergedGames[i] = preNewGame;
        filteredGames = preMergedGames;
        activeGamesRef.current[i] = preNewGame;
        setActiveGamesLoaded(preMergedGames);
        continue;
      }
      try {
        preMergedGames[i] = preNewGame;
        filteredGames = preMergedGames;
        setActiveGamesLoaded(preMergedGames);

        let activeGameCopy = filteredGames[i].activeGame;
        const { gameInfo: updateGameInfo } = await getGameData(
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
          activeGameCopy.endpoint,
        );

        /* const isPaused = await isGamePaused(engine, mapComponentPda, server);
        let final_active_players = -2;
        if (!isPaused) {
          final_active_players = updatedPlayerInfo.activeplayers;
        } */

        const newgame: FetchedGame = {
          activeGame: {
            ...activeGameCopy,
            active_players: updatedPlayerInfo.activeplayers,
          } as ActiveGame,
          playerInfo: {
            playerStatus: updatedPlayerInfo.playerStatus,
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
  };

  const handlePlayButtonClick = async (game: FetchedGame) => {
    let networkType = getNetwork(game.activeGame.endpoint);
    engine.setChain(networkType);
    setSelectedGame(game.activeGame);

    const isFree = !!game.activeGame.is_free;

    if (engine.getWalletConnected()) {
      let fixingId;
      try {
        const vault = new SupersizeVaultClient(engine);
        fixingId = NotificationService.addAlert({
          type: "success",
          message: "Checking your vault delegation…",
          shouldExit: false,
        });
        const fix = await vault.ensureConsistentDelegationForJoin(game.activeGame.tokenMint!);
        NotificationService.updateAlert(fixingId, {
          type: "success",
          message: fix.changed ? "Vault delegation fixed. Continuing…" : "Vault looks good. Continuing…",
          shouldExit: true,
          timeout: 2000,
        });
      } catch (e) {
        if (fixingId) NotificationService.updateAlert(fixingId, { shouldExit: true });
        NotificationService.addAlert({
          type: "error",
          message: "Couldn't prepare your vault. Please try in profile.",
          // shouldExit: true,
          timeout: 4000,
        });
        return;
      }
    }

    if (game.playerInfo.playerStatus === "new_player") {
      const alertId = NotificationService.addAlert({
        type: "success",
        message: "Submitting buy-in…",
        shouldExit: false,
      });

      const max_players = getMaxPlayers(game.activeGame.size);
      const updatedPlayerInfo = await updatePlayerInfo(
        engine,
        game.activeGame.worldId,
        max_players,
        game.playerInfo.playerStatus,
        game.playerInfo.newplayerEntityPda,
        game.activeGame.active_players,
        game.activeGame.endpoint,
      );

      if (updatedPlayerInfo.playerStatus === "Game Full" || updatedPlayerInfo.playerStatus === "error") {
        NotificationService.updateAlert(alertId, { shouldExit: true });
        const exitAlertId = NotificationService.addAlert({
          type: "error",
          message: updatedPlayerInfo.playerStatus,
          shouldExit: false,
        });
        setTimeout(() => {
          NotificationService.updateAlert(exitAlertId, { shouldExit: true });
        }, 3000);
        return;
      }

      game.playerInfo = {
        playerStatus: updatedPlayerInfo.playerStatus,
        newplayerEntityPda: updatedPlayerInfo.newPlayerEntityPda,
      };

      if (!isFree) {
        try {
          const vault = new SupersizeVaultClient(engine);
          const balance = await vault.getVaultBalance(game.activeGame.tokenMint!);
          setTokenBalance(balance);
          const insufficientBalance = balance < game.activeGame.buy_in / 10 ** game.activeGame.decimals;
          setHasInsufficientTokenBalance(insufficientBalance);
          if (insufficientBalance) {
            NotificationService.updateAlert(alertId, { shouldExit: true });
            return;
          }
        } catch (error) {
          console.log("Error fetching token balance:", error);
          setHasInsufficientTokenBalance(false);
        }
      }

      const result = await gameExecuteJoin(
        preferredRegion,
        engine,
        game.activeGame,
        game.activeGame.is_free ? game.activeGame.slime_buy_in : game.activeGame.buy_in,
        username,
        game.playerInfo,
        networkType == "devnet" || sessionWalletInUse,
        setMyPlayerEntityPda,
      );

      NotificationService.updateAlert(alertId, { shouldExit: true });

      if (result.success) {
        navigate("/game");
      } else {
        const exitAlertId = NotificationService.addAlert({
          type: "error",
          message: result.error || "Error submitting buyin",
          shouldExit: false,
        });
        setTimeout(() => {
          NotificationService.updateAlert(exitAlertId, { shouldExit: true });
        }, 3000);
      }
    }

    if (game.playerInfo.playerStatus === "in_game") {
      setMyPlayerEntityPda(game.playerInfo.newplayerEntityPda);
      navigate(`/game`);
    }
  };

  const refreshAllGames = async () => {
    console.log(`Refreshing games in ${selectedEndpoint}`);
    setIsLoadingCurrentGames(true);
    await fetchAndLogMapData(engine, activeGamesRef.current, selectedEndpoint);
    setIsLoadingCurrentGames(false);
  };

  useEffect(() => {
    if (!endpointReady) return;

    const endpoint = engine.getEndpointEphemRpc();
    const region = preferredRegion || getRegion(endpoint);

    selectedServer.current = region;
    setSelectedEndpoint(endpoint);
    setIsLoadingCurrentGames(false);
  }, [endpointReady, engine, preferredRegion]);

  const checkActiveGamesLoaded = async (thisServer: string) => {
    if (checkActiveGamesLoadedCallCount.current >= 5) {
      setIsLoadingCurrentGames(false);
      return;
    }

    if (activeGamesRef.current.filter((row) => row.activeGame.isLoaded).length === 0) {
      await fetchAndLogMapData(engine, activeGamesRef.current, thisServer);

      checkActiveGamesLoadedCallCount.current++;
      checkActiveGamesLoadedWait.current *= 2;

      setTimeout(() => checkActiveGamesLoaded(selectedEndpoint), checkActiveGamesLoadedWait.current);
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
      console.log("Number of games in endpoint", gamesCountInEndpoint, isLoadingCurrentGames);
      setNumberOfGamesInEndpoint(gamesCountInEndpoint);
      if (gamesCountInEndpoint === 0) {
        return;
      }
      try {
        setIsLoadingCurrentGames(true);
        await fetchAndLogMapData(engine, activeGamesRef.current, selectedEndpoint);
        setTimeout(() => checkActiveGamesLoaded(selectedEndpoint), checkActiveGamesLoadedWait.current);
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

  return (
    <div className="home-page">
      <MenuBar />

      <div className="home-container">
        <div className="home-content">
          <div className="main-content">
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
              </div>
              <table className="lobby-table">
                <thead>
                  <tr>
                    {/* <th>ID</th> */}
                    {/* <th>Creator</th> */}
                    <th>Reward</th>
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
                          {/*
                            No whitelisted games in {selectedServer.current} right now.
                            <br />
                            Try selecting a different region or search game by ID.
                          */}

                          Games are currently under maintenance. New updates will be available tomorrow.
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                  {activeGamesLoaded.map((row, idx) => (
                    <tr key={idx} className={!row.activeGame.isLoaded ? "row-hidden" : ""}>
                      {/* <td data-label="Game ID">
                        {row.activeGame.worldId.toString()}
                      </td> */}
                      {/* <td data-label="Creator">
                        {row.activeGame.permissionless === true ? (
                          <span className="community-list">Community</span>
                        ) : (
                          <span className="strict-list">Slimecoin</span>
                        )}
                      </td> */}
                      <td data-label="Reward">
                        <img
                          src={
                            row.activeGame.is_free && row.activeGame.slime_buy_in != 2500
                              ? "/slimetoken.png"
                              : row.activeGame.image
                          }
                          alt={row.activeGame.is_free ? "Slime" : row.activeGame.name}
                          className="token-image"
                          style={{ marginRight: "5px", display: "inline" }}
                        />
                      </td>
                      <td data-label="Buy In">
                        <div className="token-cell-content">
                          {row.activeGame.isLoaded ? (
                            <>
                              {row.activeGame.isLoaded && row.activeGame.is_free ? (
                                <img src="/slimejar.png" width="18" alt="SLIME" />
                              ) : (
                                <img src="/slime.png" width="22" alt="SLIMECOIN" />
                              )}
                              <b>
                                {row.activeGame.isLoaded ? (
                                  row.activeGame.is_free ? (
                                    row.activeGame.slime_buy_in // formatBuyIn(row.activeGame.slime_buy_in)
                                  ) : (
                                    parseInt(formatBuyIn(row.activeGame.buy_in / 10 ** row.activeGame.decimals), 10)
                                  )
                                ) : (
                                  <Spinner />
                                )}
                              </b>
                            </>
                          ) : (
                            <Spinner />
                          )}
                        </div>
                      </td>

                      <td data-label="Players">
                        {row.activeGame.isLoaded && row.activeGame.active_players >= 0 ? (
                          row.activeGame.active_players + "/" + row.activeGame.max_players
                        ) : (
                          <Spinner />
                        )}
                      </td>

                      <td className="">
                        <button
                          className="btn-play"
                          disabled={
                            !row.activeGame.isLoaded ||
                            row.activeGame.active_players < 0 ||
                            row.playerInfo.playerStatus == "error" ||
                            row.playerInfo.playerStatus == "Game Full"
                            // engine.getWalletConnected() == false
                          }
                          onClick={() => {
                            handlePlayButtonClick(row);
                          }}
                          data-tooltip-id={`connect-wallet-${idx}`}
                          data-tooltip-content="Play as guest"
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
                              await handleRefresh(engine, activeGamesRef.current, idx);
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
            <div className="desktop-only mobile-status-bar">
              Playing Blob Battle | Connected to {selectedServer.current || preferredRegion}
            </div>
          </div>
          <aside className="right-sidebar">
            {/* {!highStakesGamesOpen && (
              <div className="high-stakes-countdown">
                <h4>Next high-stakes game opens:</h4>
                <p className="countdown-text">{fmtHM(highStakesGamesOpenTime)}</p>
              </div>
            )}
            {highStakesGamesOpen && (
              <div className="high-stakes-countdown">
                <h4>High stakes games close:</h4>
                <p className="countdown-text">{fmtHM(highStakesGamesOpenTime)}</p>
              </div>
            )} */}

            <div className="sidebar-card slime-reward-card">
              <div className="reward-left">
                <div className="reward-icon-wrapper">
                  <img src="/slimejar.png" alt="Slime reward" />
                </div>
                <span className="reward-amount">{SLIME_REWARD_AMOUNT}</span>
              </div>
              <div className="reward-right">
                <div className={rewardStatusClassName}>{rewardStatusMessage}</div>
                <button type="button" className="reward-claim-btn" disabled={claimButtonDisabled} onClick={handleClaim}>
                  {claimButtonLabel}
                </button>
              </div>
            </div>

            <div className="sidebar-card magicblock-banner">
              <div className="banner-content">
                <img src="/magicblock-logo.jpg" alt="Magic Block" className="banner-logo" />
                <div className="banner-text">
                  <div className="banner-title">Earn Magic Block points</div>
                  <div className="banner-sub">playing Slimecoin games</div>
                </div>
              </div>
              <a
                className="btn-banner"
                href="https://app.galxe.com/quest/ZR4NdFULbMVAy49k22Sqzk/GCkSct6rF3"
                target="_blank"
                rel="noreferrer noopener"
              >
                Sign up on Galxe
              </a>
            </div>
          </aside>
        </div>
      </div>
      {selectedGame && hasInsufficientTokenBalance && (
        <BalanceWarning tokenBalance={tokenBalance} setHasInsufficientTokenBalance={setHasInsufficientTokenBalance} />
      )}
      <NotificationContainer />

      <Footer engine={engine} preferredRegion={preferredRegion} />
    </div>
  );
};

export default Home;
