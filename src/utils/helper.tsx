import React from "react";
import { API_BASE_URL, cachedTokenMetadata, endpoints, NETWORK, options, RPC_CONNECTION } from "@utils/constants";
import { ActiveGame, Blob } from "@utils/types";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as crypto from "crypto-js";
import * as anchor from "@coral-xyz/anchor";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import { playerFetchOnChain, 
  playerFetchOnSpecificEphem, 
  playerFetchOnSpecificChain,
  mapFetchOnSpecificEphem, 
  anteroomFetchOnChain, 
  anteroomFetchOnSpecificChain,
  mapFetchOnChain } from "@states/gameFetch";
import { playerFetchOnEphem } from "@states/gameFetch";
import { FindEntityPda, FindWorldPda } from "@magicblock-labs/bolt-sdk";
import { COMPONENT_ANTEROOM_ID, COMPONENT_MAP_ID, COMPONENT_PLAYER_ID } from "@states/gamePrograms";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";
import { BN } from "@coral-xyz/anchor";
import { HELIUS_API_KEY } from "@utils/constants";
import { getAccount, NATIVE_MINT } from "@solana/spl-token";
import { Anteroom } from "@utils/types";

export function getCustomErrorCode(error: any): number | undefined {
  let parsed: any = error;

  if (error?.message) {
    try {
      parsed = JSON.parse(error.message);
    } catch (parseError) {
      parsed = error;
    }
  }

  const instructionError =
    parsed?.InstructionError ||
    parsed?.err?.InstructionError ||
    error?.InstructionError;
  
  if (Array.isArray(instructionError)) {
    return instructionError[1]?.Custom;
  }
  return undefined;
}

// UI helpers
export async function addTransaction(
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  id: string,
  status: string,
) {
  setTransactions((prev) => [...prev, { id, status }]);
}

export async function updateTransaction(
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  id: string,
  status: string,
) {
  setTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, status } : txn)));
}

export async function retryTransaction(
  transactionId: string,
  transactionFn: () => Promise<void>,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  let retry = true;
  while (retry) {
    try {
      await transactionFn();
      await updateTransaction(setTransactions, transactionId, "confirmed");
      retry = false;
    } catch (error) {
      await updateTransaction(setTransactions, transactionId, "failed");
      let message = "Unknown Error";
      if (error instanceof Error) {
        message = error.message;
      }
      retry = await showPrompt(`Transaction ${transactionId} failed: ${JSON.stringify(message)}`);
    }
  }
}

export async function executeStep(
  stepId: string,
  stepFn: () => Promise<void>,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
) {
  await addTransaction(setTransactions, stepId, "pending");
  await retryTransaction(stepId, stepFn, setTransactions, showPrompt);
}

export const stringToUint8Array = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

export const formatBuyIn = (amount: number): string => {
  if (amount < 1000) {
    return amount.toString();
  } else if (amount < 1000000) {
    return amount / 1000 + "K";
  } else if (amount < 1000000000) {
    return amount / 1000000 + "M";
  } else {
    return amount / 1000000000 + "B";
  }
};

export const getDecimals = (amount: number): number => {
  if (amount % 1 !== 0) {
    //return amount.toString().split(".")[1]?.length || 0;
    const amountStr = amount.toExponential();
    const decimalPart = amountStr.split("e-")[1];
    return decimalPart ? parseInt(decimalPart) : 0;
  } else {
    return 0;
  }
};

export const getRoundedAmount = (amount: number, foodUnitValue: number): string => {
  const decimals = getDecimals(foodUnitValue);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const calculateK = (z: number, epsilon: number): number => {
  const numerator = epsilon / (100.0 - 0.6);
  const logValue = Math.log(numerator);
  return -logValue / (z * 1000.0);
};

export const calculateY = (x: number, k: number): number => {
  const exponent = -(k / 25.0) * x;
  const y = 100.0 - (100.0 - 0.6) * Math.exp(exponent);
  return y * (0.6 / 1000.0);
};

export const getMaxPlayers = (size: number): number => {
  if (size === 4000) return 10;
  if (size === 6000) return 20;
  if (size === 8000) return 40;
  return 0;
}

export const deriveSeedFromPublicKey = (userPublicKey: PublicKey): Uint8Array => {
  const salt = "supersizeSalt";
  const hash = crypto.SHA256(userPublicKey.toBuffer().toString() + salt);
  const hashArray = new Uint8Array(Buffer.from(hash.toString(crypto.enc.Hex), "hex"));
  return hashArray.slice(0, 32);
};

export const deriveKeypairFromPublicKey = (userPublicKey: PublicKey): Keypair => {
  const seed = deriveSeedFromPublicKey(userPublicKey);
  const keypair = Keypair.fromSeed(seed);
  return keypair;
};

export const updateWins = async (walletAddress: string, updateId: number, amount: number) => {
  const response = await fetch(`${API_BASE_URL}/updateWins`, {
    method: "POST",
    body: JSON.stringify({ walletAddress, updateId, amount }),
  });

  const resData = await response.json();
  if (!resData.success) {
    throw new Error("Failed to update wins");
  }
  return resData;
};

export const getTopLeftCorner = (index: number, mapSize: number): { x: number; y: number } => {
  const sectionSize = 1000;
  const sectionsPerRow = mapSize / sectionSize;
  const mapSectionCount = sectionsPerRow * sectionsPerRow;
  const wrappedIndex = index % mapSectionCount;
  const row = Math.floor(wrappedIndex / sectionsPerRow);
  const col = wrappedIndex % sectionsPerRow;
  const x = col * sectionSize;
  const y = row * sectionSize;

  return { x, y };
};

export function getPingColor(ping: number) {
  if (ping < 0) return "red";
  if (ping <= 100) return "#00d37d"; // green
  if (ping <= 800) return "yellow";
  return "red";
}

export const pingEndpoint = async (url: string): Promise<number> => {
  const startTime = performance.now();
  try {
    await fetch(url, { method: "OPTIONS" });
  } catch (error) {
    console.error(`Failed to ping ${url}:`, error);
    return -1;
  }
  const endTime = performance.now();
  return Math.round(endTime - startTime);
};

export const pingEndpoints = async () => {
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

export const pingSpecificEndpoint = async (endpoint: string) => {
  const pingTimes = await Promise.all([pingEndpoint(endpoint), pingEndpoint(endpoint), pingEndpoint(endpoint)]);
  const bestPingTime = Math.min(...pingTimes);
  return { endpoint: endpoint, pingTime: bestPingTime, region: options[endpoints[NETWORK].indexOf(endpoint)] };
};

export const getValidEndpoint = async (engine: MagicBlockEngine, mapComponentPda: PublicKey) => {
  return Promise.any(
    endpoints[NETWORK].map(async (endpoint) => {
        const mapParsedData = await mapFetchOnSpecificEphem(engine, mapComponentPda, endpoint);
        if (!mapParsedData) {
          throw new Error("Invalid mapParsedData");
        }
        return endpoint;
    })
  );
};

export const checkTransactionStatus = async (
  connection: anchor.web3.Connection,
  signature: string,
): Promise<boolean> => {
  try {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (status && status.value && status.value.confirmationStatus === "confirmed" && status.value.err === null) {
      return true;
    } else {
      console.warn("Transaction still pending or failed:", signature);
      return false;
    }
  } catch (error) {
    console.error("Error checking transaction status:", error);
    return false;
  }
};

export const waitSignatureConfirmation = async (
  signature: string,
  connection: anchor.web3.Connection,
  commitment: anchor.web3.Commitment,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    connection.onSignature(
      signature,
      (result) => {
        if (result.err) {
          reject(result.err);
        } else {
          setTimeout(() => resolve(), 1000);
        }
      },
      commitment,
    );
  });
};

export async function fetchTokenBalance(engine: MagicBlockEngine, activeGame: ActiveGame, isDevnet: boolean) : Promise<{
  tokenBalance: number,
  hasInsufficientTokenBalance: boolean,
}> {
  if (!activeGame || !activeGame.tokenMint) return { tokenBalance: 0, hasInsufficientTokenBalance: true };
  let connection = engine.getConnectionChain();
  let wallet = engine.getWalletPayer();

  if (isDevnet){
    connection = engine.getConnectionChainDevnet();
    wallet = engine.getSessionPayer();
  }
  if (!wallet) return { tokenBalance: 0, hasInsufficientTokenBalance: true };

  try {
    if (!activeGame.tokenMint) return { tokenBalance: 0, hasInsufficientTokenBalance: true };
    const tokenMint = new PublicKey(activeGame.tokenMint);
    let balance = 0;
    let denominator = 0;
    if (tokenMint.equals(NATIVE_MINT)) {
      const balanceInfo = await connection.getBalance(wallet);
      balance = balanceInfo;
      denominator = LAMPORTS_PER_SOL;
    } else {
      const tokenAccounts = await connection.getTokenAccountsByOwner(wallet, {
        mint: tokenMint,
      });
      if (tokenAccounts.value.length > 0) {
        const accountInfo = tokenAccounts.value[0].pubkey;
        const balanceInfo = await connection.getTokenAccountBalance(accountInfo);
        balance = parseInt(balanceInfo.value.amount) || 0;
        denominator = 10 ** activeGame.decimals
      }
    }

    if (balance < activeGame.buy_in) {
      return { tokenBalance: balance / denominator, hasInsufficientTokenBalance: true };
    } else {
      return { tokenBalance: balance / denominator, hasInsufficientTokenBalance: false };
    }
  } catch (error) {
    console.log("Error fetching token balance:", error);
    return { tokenBalance: 0, hasInsufficientTokenBalance: true };
  }
}

export async function fetchTokenMetadata(tokenAddress: string, network: string) {
  if (cachedTokenMetadata[tokenAddress]) {
    return { name: cachedTokenMetadata[tokenAddress].symbol, image: cachedTokenMetadata[tokenAddress].image };
  }

  try {
    const response = await fetch(`https://${network || "devnet"}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1, 
        method: "getAsset",
        params: [tokenAddress], 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error fetching asset:", errorText);
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.result?.content;
    if (!content) {
      throw new Error("Content not found in response");
    }
    const jsonUri = content.json_uri;
    if (jsonUri) {
      const metadataResponse = await fetch(jsonUri);
      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        console.error("Error fetching metadata from json_uri:", errorText);
        throw new Error(`HTTP Error: ${metadataResponse.status} ${metadataResponse.statusText}`);
      }
      const metadataJson = await metadataResponse.json();
      return {
        name: metadataJson.name || "Unknown",
        image: metadataJson.image || "",
      };
    }
    const name = content.metadata?.symbol || "Unknown";
    const image = content.links?.image || content.files?.[0]?.uri || "https://supersize.gg/coin.png";

    if (!image) {
      throw new Error("Image URI not found");
    }

    return { name, image };
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    throw error;
  }
}

export function getRegion(endpoint: string): string {
  if (endpoint === endpoints[NETWORK][0]) return "europe";
  if (endpoint === endpoints[NETWORK][1]) return "america";
  if (endpoint === endpoints[NETWORK][2]) return "asia";
  return "unknown";
}

export const getSectionIndex = (x: number, y: number, mapSize: number, duplicateEncodings: number = 1): number => {
  const sectionSize = 1000;
  const sectionsPerRow = mapSize / sectionSize;
  const mapSectionCount = sectionsPerRow * sectionsPerRow;
  const adjustedX = Math.min(x, mapSize - 1);
  const adjustedY = Math.min(y, mapSize - 1);
  const row = Math.floor(adjustedY / sectionSize);
  const col = Math.floor(adjustedX / sectionSize);
  const baseIndex = row * sectionsPerRow + col;
  return baseIndex + (duplicateEncodings - 1) * mapSectionCount;
};

export const getClampedFoodPosition = (
  player_x: number,
  player_y: number,
  target_x: number,
  target_y: number,
  player_radius: number,
  map_width: number,
  map_height: number,
): { food_x: number; food_y: number } => {
  const dx = target_x - player_x;
  const dy = target_y - player_y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const unit_x = dx / dist;
  const unit_y = dy / dist;
  const pseudo_random_float_x = 1.5;
  const pseudo_random_float_y = 1.5;
  const offset_x = -unit_x * player_radius * pseudo_random_float_x;
  const offset_y = -unit_y * player_radius * pseudo_random_float_y;
  const food_x = Math.round(player_x + offset_x);
  const food_y = Math.round(player_y + offset_y);
  const clamped_food_x = Math.min(Math.max(food_x, 0), map_width);
  const clamped_food_y = Math.min(Math.max(food_y, 0), map_height);
  return { food_x: clamped_food_x, food_y: clamped_food_y };
};

export const checkPlayerDistances = (
  visiblePlayers: Blob[],
  currentPlayer: Blob,
) => {
  if (currentPlayer?.radius && currentPlayer?.authority) {
    const left = currentPlayer.x - currentPlayer.radius * 2;
    const right = currentPlayer.x + currentPlayer.radius * 2;
    const top = currentPlayer.y - currentPlayer.radius * 2;
    const bottom = currentPlayer.y + currentPlayer.radius * 2;

    for (const player of visiblePlayers) {
      if (player.x >= left && player.x <= right && player.y >= top && player.y <= bottom) {
        return player.authority;
      }
    }
  }
  return null;
};

export const findListIndex = (pubkey: PublicKey, players: Blob[]): number | null => {
  const index = players.findIndex((player) => player.authority?.toString() === pubkey.toString());
  return index !== -1 ? index : null;
};

export const decodeFood = (data: Uint8Array) => {
  if (!(data instanceof Uint8Array) || data.length !== 4) {
    throw new Error("Invalid food data format. Expected a Uint8Array of length 4.");
  }
  const buffer = data.buffer;
  const packed = new DataView(buffer).getUint32(data.byteOffset, true); // Little-endian
  const x = packed & 0x1FFF;          // 13 bits
  const y = (packed >> 13) & 0x1FFF;  // 13 bits
  const food_value = (packed >> 26) & 0x07;  // 3 bits
  const food_multiple_encoded = (packed >> 29) & 0x07;  // 3 bits
  const food_multiple_map = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
  const food_multiple = food_multiple_map[food_multiple_encoded];

  return { x, y, food_value, food_multiple };
};

export function isPlayerStatus(
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

export const getNetwork = (thisEndpoint: string): string => {
  if(NETWORK !== "mainnet")return "devnet";
  let serverIndex = endpoints["devnet"].indexOf(thisEndpoint);
  return serverIndex >= 0 ? "devnet" : "mainnet";
};

export const updatePlayerInfo = async (
  engine: MagicBlockEngine,
  worldId: BN,
  max_players: number,
  playerStatus: string,
  newPlayerEntityPda: PublicKey,
  activeplayers: number,
  need_to_delegate: boolean,
  need_to_undelegate: boolean,
  thisEndpoint: string,
): Promise<{
  playerStatus: string,
  activeplayers: number,
  need_to_delegate: boolean,
  need_to_undelegate: boolean,
  newPlayerEntityPda: PublicKey,
  max_players: number,
}> => {
  let network = getNetwork(thisEndpoint)
  const result = await getMyPlayerStatus(
    engine,
    worldId,
    max_players,
    thisEndpoint,
    network
  );
  if (isPlayerStatus(result)) {
    if (result.playerStatus == "error") {
      console.log("Error fetching player status");
      activeplayers = result.activeplayers;
      if (activeplayers == max_players && max_players !== 0) {
        playerStatus = "Game Full";
      } else {
        playerStatus = result.playerStatus;
      }
    } else {
      activeplayers = result.activeplayers;
      need_to_delegate = result.need_to_delegate;
      need_to_undelegate = result.need_to_undelegate;
      newPlayerEntityPda = result.newplayerEntityPda;
      playerStatus = result.playerStatus;
      max_players = result.max_players;
    }
  } else {
    console.error("Error fetching player status");
  }
  return {
    playerStatus: playerStatus,
    activeplayers: activeplayers,
    need_to_delegate: need_to_delegate,
    need_to_undelegate: need_to_undelegate,
    newPlayerEntityPda: newPlayerEntityPda,
    max_players: max_players,
  }
}

export const getGameData = async (
  engine: MagicBlockEngine,
  worldId: BN,
  thisEndpoint: string,
  gameInfo: ActiveGame,
): Promise<{gameInfo: ActiveGame, anteroomData: Anteroom | null}> => {
  const mapEntityPda = FindEntityPda({
    worldId: worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array("origin"),
  });
  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: mapEntityPda,
  });
  const anteseed = "ante";
  const anteEntityPda = FindEntityPda({
    worldId: worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(anteseed),
  });
  const anteComponentPda = FindComponentPda({
    componentId: COMPONENT_ANTEROOM_ID,
    entity: anteEntityPda,
  });
  let network = getNetwork(thisEndpoint)

  let mapParsedDataPromise = mapFetchOnChain(engine, mapComponentPda);
  if(thisEndpoint !== ""){
    mapParsedDataPromise = mapFetchOnSpecificEphem(engine, mapComponentPda, thisEndpoint);
  }
  const [mapParsedData, anteParsedData] = await Promise.all([
    mapParsedDataPromise,
    anteroomFetchOnSpecificChain(engine, anteComponentPda, network)
  ]);

  if (! mapParsedData) { return {gameInfo, anteroomData: null}; }
  gameInfo.endpoint = thisEndpoint;
  gameInfo.name = mapParsedData.name;
  gameInfo.max_players = mapParsedData.maxPlayers;
  gameInfo.size = mapParsedData.width;
  gameInfo.buy_in = mapParsedData.buyIn.toNumber();
  gameInfo.isLoaded = true;
  let anteroomData: Anteroom = {buyIn: 0, token: new PublicKey(0), tokenDecimals: 0, vaultTokenAccount: new PublicKey(0), gamemasterTokenAccount: new PublicKey(0), totalActiveBuyins: 0};
  let mint_of_token_being_sent = new PublicKey(0);
  if (anteParsedData && anteParsedData.token && anteParsedData.vaultTokenAccount && anteParsedData.gamemasterTokenAccount) {
    anteroomData.buyIn = anteParsedData.buyIn.toNumber();
    anteroomData.token = anteParsedData.token;
    anteroomData.tokenDecimals = anteParsedData.tokenDecimals;
    anteroomData.vaultTokenAccount = anteParsedData.vaultTokenAccount;
    anteroomData.gamemasterTokenAccount = anteParsedData.gamemasterTokenAccount;
    anteroomData.totalActiveBuyins = anteParsedData.totalActiveBuyins.toNumber();
    gameInfo.decimals = anteParsedData.tokenDecimals;
    mint_of_token_being_sent = anteParsedData.token;
    try {
      const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString(), network);
      gameInfo.image = image;
      gameInfo.token = name;
      gameInfo.tokenMint = mint_of_token_being_sent;
    } catch (error) {
      console.error("Error fetching token data:", error);
    }
  }
  
  return {gameInfo, anteroomData};
}

export const getMyPlayerStatus = async (
  engine: MagicBlockEngine,
  worldId: BN,
  maxplayer: number,
  endpoint: string,
  network: string,
): Promise<
  | {
      playerStatus: string;
      need_to_delegate: boolean;
      need_to_undelegate: boolean;
      newplayerEntityPda: PublicKey;
      activeplayers: number;
      max_players: number;
    }
  | "error"
> => {
  const playerEntityPdas: PublicKey[] = [];
  let newplayerEntityPda: PublicKey | null = null;
  let playerStatus = "new_player";
  let need_to_undelegate = false;
  let need_to_delegate = false;
  let activeplayers = 0;
  let max_players = maxplayer;
  const fetchPromises = [];
  for (let i = 1; i < maxplayer + 1; i++) {
    const playerentityseed = "player" + i.toString();
    const playerEntityPda = FindEntityPda({
      worldId: worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array(playerentityseed),
    });
    playerEntityPdas.push(playerEntityPda);

    const playersComponentPda = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: playerEntityPda,
    });
    
    fetchPromises.push(
      Promise.all([
        engine.getChainAccountInfoProcessed(playersComponentPda, network),
        playerFetchOnSpecificChain(engine, playersComponentPda, network),
        playerFetchOnSpecificEphem(engine, playersComponentPda, endpoint),
      ]).then(([playersacc, playersParsedData, playersParsedDataER]) => ({
        playersComponentPda,
        playersacc,
        playersParsedData,
        playersParsedDataER,
        playerEntityPda,
      })),
    );
  }

  const results = await Promise.all(fetchPromises);
  for (const { playersComponentPda, playersacc, playersParsedData, playersParsedDataER, playerEntityPda } of results) {
    if (!playersacc || !playersParsedData) {
      continue;
    }

    if (playersacc.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
      if ( playersParsedDataER) {
        if(
          playersParsedDataER.status == "in_game"
        ){
          activeplayers += 1;
        }
        if(
          playersParsedDataER.status == "exited"
        ){
          max_players = max_players - 1;
        }
      }
      if(playersParsedDataER && playersParsedDataER.authority && (playersParsedDataER.authority.toString() == engine.getSessionPayer().toString())){
        newplayerEntityPda = playerEntityPda;
        if(playersParsedDataER.status == "in_game"){
          need_to_undelegate = false;
          need_to_delegate = false;
          playerStatus = "in_game";
        }
        if(playersParsedDataER.status == "exited"){
          need_to_undelegate = true;
          need_to_delegate = false;
          playerStatus = "cashing_out";
        }
      }else{
        if(playersParsedDataER && (playersParsedDataER.status == "eaten" || playersParsedDataER.status == "ready") 
          && newplayerEntityPda == null){
          need_to_undelegate = true;
          need_to_delegate = false;
          newplayerEntityPda = playerEntityPda;
        }
      }
    } else {
      if ( playersParsedData) {
        if(
          playersParsedData.status == "in_game"
        ){
          activeplayers += 1;
        }
        if(
          playersParsedData.status == "exited"
        ){
          max_players = max_players - 1;
        }
      }
      if(playersParsedData && playersParsedData.authority && (playersParsedData.authority.toString() == engine.getSessionPayer().toString())){
        newplayerEntityPda = playerEntityPda;
        if(playersParsedData.status == "in_game"){
          need_to_undelegate = false;
          need_to_delegate = true;
          playerStatus = "in_game";
        }
        if(playersParsedData.status == "exited"){
          need_to_undelegate = false;
          need_to_delegate = false;
          playerStatus = "cashing_out";
        }
      }else{
        if(playersParsedData && (playersParsedData.status == "eaten" || playersParsedData.status == "ready")
           && newplayerEntityPda == null){
          need_to_undelegate = false;
          need_to_delegate = false;
          newplayerEntityPda = playerEntityPda;
        }
      }
    }
  }

  if (newplayerEntityPda == null)
    return {
      playerStatus: "error",
      need_to_delegate: false,
      need_to_undelegate: false,
      newplayerEntityPda: new PublicKey(0),
      activeplayers: activeplayers,
      max_players: max_players,
    };
  return {
    playerStatus: playerStatus,
    need_to_delegate: need_to_delegate,
    need_to_undelegate: need_to_undelegate,
    newplayerEntityPda: newplayerEntityPda,
    activeplayers: activeplayers,
    max_players: max_players,
  };
};


export const fetchPlayers = async (engine: MagicBlockEngine, gameInfo: ActiveGame) => {
  const playersArr: {
    seed: string;
    playerEntityPda: PublicKey;
    playersComponentPda: PublicKey;
    parsedData: any;
    playersParsedDataEphem: any;
    delegated: boolean;
    playerWallet: string;
    playerWalletEphem: string;
  }[] = [];

  const maxPlayers = gameInfo.max_players || 20;
  const playerPromises = Array.from({ length: maxPlayers }, async (_, i) => {
    const playerSeed = "player" + (i + 1).toString();
    const playerEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array(playerSeed),
    });
    const playersComponentPda = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: playerEntityPda,
    });
    const accountInfo = await engine.getChainAccountInfo(playersComponentPda);
    if (accountInfo) {
      let delegated = false;
      if (accountInfo.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
        delegated = true;
      } 
      const playersParsedDataEphem = await playerFetchOnEphem(engine, playersComponentPda);
      const parsedData = await playerFetchOnChain(engine, playersComponentPda);
      let playerWallet = "";
      if(parsedData && parsedData.payoutTokenAccount) {
        playerWallet = parsedData.payoutTokenAccount.toString();
        try {
          const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(parsedData.payoutTokenAccount.toString()));
          playerWallet = tokenAccount.owner.toString();
        } catch (error) {
          console.log("Error getting token account:", error);
        }
      }
      let playerWalletEphem = "";
      if(playersParsedDataEphem && playersParsedDataEphem.payoutTokenAccount) {
        playerWalletEphem = playersParsedDataEphem.payoutTokenAccount.toString();
        try {
          const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(playersParsedDataEphem.payoutTokenAccount.toString()));
          playerWalletEphem = tokenAccount.owner.toString();
        } catch (error) {
          console.log("Error getting token account:", error);
        }
      }

      return {
        seed: playerSeed,
        playerEntityPda,
        playersComponentPda,
        parsedData,
        playersParsedDataEphem,
        delegated,
        playerWallet,
        playerWalletEphem
      };
    }
    return null;
  });

  const resolvedPlayers = await Promise.all(playerPromises);
  playersArr.push(...resolvedPlayers.filter(player => player !== null));
  return playersArr;
};

export const fetchGames = async (engine: MagicBlockEngine, myGames: ActiveGame[]) => {
  const startIndices = { devnet: 2044, mainnet: 25 };
  const startIndex = startIndices[NETWORK];
  let newGames: ActiveGame[] = myGames;
  const gamePromises = Array.from({ length: 100 }, (_, idx) => {
    const i = startIndex + idx;
    return (async () => {
      try {
        const worldId = { worldId: new anchor.BN(i) };
        const worldPda = await FindWorldPda(worldId);
        
        const mapEntityPda = FindEntityPda({
          worldId: worldId.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array("origin"),
        });
        
        const mapComponentPda = FindComponentPda({
          componentId: COMPONENT_MAP_ID,
          entity: mapEntityPda,
        });
        
        const mapParsedData = await mapFetchOnChain(engine, mapComponentPda);
        if (mapParsedData?.authority && 
            mapParsedData.authority.toString() === engine.getSessionPayer().toString()) {
            const newGameInfo: ActiveGame = {
              worldId: worldId.worldId,
              worldPda,
              name: mapParsedData.name,
              active_players: 0,
              max_players: mapParsedData.maxPlayers,
              size: mapParsedData.width,
              image: "",
              token: "",
              buy_in: mapParsedData.buyIn.toNumber(),
              decimals: 0,
              endpoint: "",
              isLoaded: true,
              permissionless: false,
            };

            newGames = newGames.some((game) => game.worldId === newGameInfo.worldId)
          ? [...newGames] 
          : [newGameInfo, ...newGames];          
        }
      } catch (error) {
        console.log("error", error);
      }
    })();
  });

  await Promise.allSettled(gamePromises);
  return [...newGames].sort((a, b) => b.worldId.cmp(a.worldId));;
};