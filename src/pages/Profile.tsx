import React, { useCallback, useEffect, useRef, useState } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import { MenuSession } from "@components/menu/MenuSession";
import FooterLink from "@components/Footer";
import "./Profile.scss";
import { getMemberPDA, useBuddyLink } from "buddy.link";
import { useWallet } from "@solana/wallet-adapter-react";
import Invite from "../components/buddyInvite";
import CopyLink from "../components/buddyReferral";
import {
  anchor,
  ApplySystem,
  createAddEntityInstruction,
  createDelegateInstruction,
  createUndelegateInstruction,
  FindComponentPda,
  FindWorldPda,
  InitializeComponent,
  DestroyComponent,
  BN,
} from "@magicblock-labs/bolt-sdk";
import { ActiveGame, Food } from "@utils/types";
import { FindEntityPda } from "@magicblock-labs/bolt-sdk";
import {
  COMPONENT_ANTEROOM_ID,
  COMPONENT_MAP_ID,
  COMPONENT_PLAYER_ID,
  COMPONENT_SECTION_ID,
  SYSTEM_CASH_OUT_ID,
} from "@states/gamePrograms";
import {
  anteroomFetchOnChain,
  mapFetchOnChain,
  mapFetchOnEphem,
  mapFetchOnSpecificEphem,
  playerFetchOnChain,
  playerFetchOnEphem,
  sectionFetchOnChain,
  sectionFetchOnEphem,
} from "@states/gameFetch";
import { useMagicBlockEngine } from "@engine/MagicBlockEngineProvider";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import { fetchTokenMetadata, getRoundedAmount, pingEndpoint, stringToUint8Array } from "@utils/helper";
import { AccountMeta, ComputeBudgetProgram, Connection, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { cachedTokenMetadata, endpoints, NETWORK, RPC_CONNECTION } from "@utils/constants";
import { Spinner } from "@components/util/Spinner";
import Graph from "../components/Graph";
import { Chart, LineElement, PointElement, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { getTopLeftCorner, getRegion } from "@utils/helper";
import { createTransferInstruction } from "@solana/spl-token";
import { gameSystemInitSection } from "@states/gameSystemInitSection";
import GameComponent from "@components/Game";

// Register the components
Chart.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend);

type profileProps = {
  randomFood: Food[];
};

export default function Profile({ randomFood }: profileProps ) {
  const engine = useMagicBlockEngine();
  const [activeTab, setActiveTab] = useState<"general" | "quests" | "admin">("general");
  return (
    <div className="profile-page main-container">
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
      <div className="profile-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="profile-tabs">
          <button className={activeTab === "general" ? "active" : ""} onClick={() => setActiveTab("general")}>
            General
          </button>
          <button className={activeTab === "quests" ? "active" : ""} onClick={() => setActiveTab("quests")}>
            Quests
          </button>
          <button className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}>
            Admin panel
          </button>
        </div>

        <div className="profile-content">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "quests" && <QuestsTab />}
          {activeTab === "admin" && <AdminTab engine={engine} />}
        </div>
      </div>

      <FooterLink />
    </div>
  );
}

function GeneralTab() {
  const engine = useMagicBlockEngine();
  const [gemBalance, setGemBalance] = useState(0);
  const [username, setUsername] = useState<string>("");
  const { referrer } = useBuddyLink();
  const [usernameSaved, setUsernameSaved] = useState(false);

  const setInputUsername = (inputUsername: React.SetStateAction<string>) => {
    const user = { name: inputUsername, referrer: referrer, referral_done: false };
    localStorage.setItem("user", JSON.stringify(user));
    setUsername(inputUsername);
    setUsernameSaved(true);
  };

  useEffect(() => {
    const retrievedUser = localStorage.getItem("user");
    if (retrievedUser) {
      let myusername = JSON.parse(retrievedUser).name;
      console.log("myusername", myusername);
      setUsername(myusername);
    }
  }, []);

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


  return (
    <div className="general-tab">
      <MenuSession />
      <div style={{ display: "flex" , flexDirection: "row", marginLeft: "1em" }}>
          Supersize Gems: <img  style={{ width: "20px", height: "20px", marginRight: "5px",marginTop: "1px", marginLeft: "5px"   }} src={cachedTokenMetadata["AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp"].image} alt="Token Image" /> {gemBalance.toFixed(2)}
      </div>
      
      <hr className="divider" />

      <label className="input-label">Username</label>
      <div className="row-inline input-group">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {!usernameSaved && (
          <button className="btn-save" onClick={() => setInputUsername(username)}>
            Save
          </button>
        )}
      </div>
    </div>
  );
}

function QuestsTab() {
  const { member } = useBuddyLink();

  const [joinedOrg, setJoinedOrg] = useState<boolean>(false);
  const BUDDY_LINK_PROGRAM_ID = new PublicKey("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5");
  let referral_vault_program_id = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
  const mainnet_connection = new Connection(RPC_CONNECTION["mainnet"]);

  useEffect(() => {
    const checkMembership = async () => {
      if (member) {
        if (member[0]) {
          const buddyMemberPdaAccount = getMemberPDA(BUDDY_LINK_PROGRAM_ID, "supersize", member[0].account.name);
          let [refferalPdaAccount] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("subsidize"),
              buddyMemberPdaAccount.toBuffer(),
              new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").toBuffer(),
            ],
            referral_vault_program_id,
          );
          console.log("refferalPdaAccount", refferalPdaAccount.toString());
          const accountInfo = await mainnet_connection.getAccountInfo(refferalPdaAccount);
          console.log("accountInfo", accountInfo);
          if (accountInfo && accountInfo.lamports > 0) {
            setJoinedOrg(true);
          }
        } else {
          setJoinedOrg(false);
        }
      } else {
        setJoinedOrg(false);
      }
    };

    checkMembership();
  }, [member]);

  return (
    <div className="quests-tab">
      <div className="quest-item">
        <span>Join referral program + play free USDC game</span>
        <button>{joinedOrg ? "Completed" : "Pending"}</button>
      </div>
    </div>
  );
}

function AdminTab({ engine }: { engine: MagicBlockEngine }) {
  const isLoading = useRef(false);
  const [myGames, setMyGames] = useState<ActiveGame[]>([]);
  const [openPanelIndex, setOpenPanelIndex] = useState<number | null>(null);
  const [gameOwner, setGameOwner] = useState<string>("");
  const [gameWallet, setGameWallet] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [gameTokenAccount, setGameTokenAccount] = useState<string>("");
  const [inspectAnteParsedData, setAnteParsedData] = useState("");
  const [inspectMapParsedData, setMapParsedData] = useState("");
  const [foodComponentCheck, setFoodComponentCheck] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [depositValue, setDepositValue] = useState<string>("");
  const [decimals, setDecimals] = useState<number>(0);
  const [currentFoodToAdd, setCurrentFoodToAdd] = useState<number>(0);
  const [gameEndpoint, setGameEndpoint] = useState<string>("");
  const decimalsRef = useRef<number>(0);
  const [cashoutStats, setCashoutStats] = useState<{
    cashOutSum: number | null,
    buyInSum: number | null,
    buyInCount: number | null,
  }>({
    cashOutSum: null,
    buyInSum: null,
    buyInCount: null,
  });
  const [incorrectFoodEntities, setIncorrectFoodEntities] = useState<{ x: number; y: number; foodEntityPda: PublicKey; foodComponentPda: PublicKey; seed: string }[]>([]);
  const [players, setPlayers] = useState<
    {
      seed: string;
      playerEntityPda: PublicKey;
      playersComponentPda: PublicKey;
      parsedData: any;
      playersParsedDataEphem: any;
      delegated: boolean;
      playerWallet: string;
      playerWalletEphem: string;
    }[]
  >([]);


  // New helper function to fetch players for a given game
  const fetchPlayers = async (gameInfo: ActiveGame) => {
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

    // Use gameInfo.max_players if available; otherwise, compute based on map size.
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
        console.log("playersParsedDataEphem", playersParsedDataEphem?.score.toNumber());
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
    setPlayers(playersArr);
  };

  const handleCashout = async (playerData: {
    seed: string;
    playersComponentPda: PublicKey;
    parsedData: any;
    playersParsedDataEphem: any;
  }, selectGameId: ActiveGame, withdraw: number = -1) => {
    try {
      const gameInfo = selectGameId;
      console.log("gameInfo", playerData, selectGameId);
      const mapEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      
      let seed = "player1";
      let sender_token_account = new PublicKey(0);

      console.log("playerData.seed", playerData);
      if (playerData){
        seed = playerData.seed;
        sender_token_account = playerData.parsedData.payoutTokenAccount;
      }
      const playerEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(seed),
      });

      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });

      console.log("cashout player");
      if(withdraw == -1) {
        const undelegateIx = createUndelegateInstruction({
          payer: engine.getSessionPayer(),
          delegatedAccount: playerData.playersComponentPda,
          componentPda: COMPONENT_PLAYER_ID,
        });
        const tx = new anchor.web3.Transaction().add(undelegateIx);
        tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
        tx.feePayer = engine.getSessionPayer();
        try {
          const playerundelsignature = await engine.processSessionEphemTransaction(
            "undelPlayer:" + playerData.playersComponentPda.toString(),
            tx,
          );
          console.log("undelegate", playerundelsignature);
        } catch (error) {
            console.log("Error undelegating:", error);
        }
      }

      const anteseed = "ante";
      const anteEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(anteseed),
      });
      const anteComponentPda = FindComponentPda({
        componentId: COMPONENT_ANTEROOM_ID,
        entity: anteEntityPda,
      });
      const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);

      let supersize_token_account = new PublicKey(0);
      let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

      if (anteParsedData) {
        let vault_token_account = anteParsedData.vaultTokenAccount;
        let mint_of_token_being_sent = anteParsedData.token;
        let owner_token_account = anteParsedData.gamemasterTokenAccount;
        if (!mint_of_token_being_sent) {
          return;
        }
        //supersize_token_account = anteParsedData.gamemasterTokenAccount;
        supersize_token_account = await getAssociatedTokenAddress(
          mint_of_token_being_sent,
          new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB"),
        );
        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
          vault_program_id,
        );

        let extraAccounts = [
          {
            pubkey: vault_token_account,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: sender_token_account,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: owner_token_account,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: supersize_token_account,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: tokenAccountOwnerPda,
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: engine.getWalletPayer(),
            isWritable: true,
            isSigner: false,
          },
          {
            pubkey: SystemProgram.programId,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: TOKEN_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: SYSVAR_RENT_PUBKEY,
            isWritable: false,
            isSigner: false,
          },
        ];

        const cashouttx = new anchor.web3.Transaction()
        if(withdraw == -1) {
          const applyCashOutSystem = await ApplySystem({
              authority: engine.getWalletPayer(),
              world: gameInfo.worldPda,
              entities: [
              {
                entity: playerEntityPda,
                components: [{ componentId: COMPONENT_PLAYER_ID }],
              },
              {
                entity: anteEntityPda,
                components: [{ componentId: COMPONENT_ANTEROOM_ID }],
              },
            ],
            systemId: SYSTEM_CASH_OUT_ID,
            args: {
              referred: false,
            },
            extraAccounts: extraAccounts as AccountMeta[],
          });
          cashouttx.add(applyCashOutSystem.transaction);
        }else{
            extraAccounts[1] = {
              pubkey: supersize_token_account,
              isWritable: true,
              isSigner: false,
            }
            
            const applyCashOutSystem = await ApplySystem({
              authority: engine.getWalletPayer(),
              world: gameInfo.worldPda,
              entities: [
              {
                entity: playerEntityPda,
                components: [{ componentId: COMPONENT_PLAYER_ID }],
              },
              {
                entity: anteEntityPda,
                components: [{ componentId: COMPONENT_ANTEROOM_ID }],
              },
            ],
            systemId: SYSTEM_CASH_OUT_ID,
            args: {
              referred: false,
              widthdrawl_amount: withdraw,
            },
            extraAccounts: extraAccounts as AccountMeta[],
          });
          cashouttx.add(applyCashOutSystem.transaction);
        }
        
        const cashoutsignature = await engine.processWalletTransaction("playercashout", cashouttx);
        console.log("cashoutsignature", cashoutsignature);
    } 
    }catch (error) {
      console.error(`Error unclogging player:`, error);
    }
  };

  useEffect(() => {
    const fetchGames = async () => {
      if (isLoading.current) return;
      isLoading.current = true;
      console.log("fetching games");
  
      const startIndices = { devnet: 1970, mainnet: 0 };
      const startIndex = startIndices[NETWORK];
  
      // Create an array of promises for fetching each game
      const gamePromises = Array.from({ length: 100 }, (_, idx) => {
        const i = startIndex + idx;
        return (async () => {
          console.log(`Fetching game #${i}`);
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
                  ping: 0,
                  isLoaded: true,
                  permissionless: false,
                };
  
              setMyGames((prevGames) => {
                const updatedGames = prevGames.some((game) => game.worldId === newGameInfo.worldId)
                  ? prevGames
                  : [newGameInfo, ...prevGames];
                return updatedGames.sort((a, b) => b.worldId.cmp(a.worldId));
              });
            }
          } catch (error) {
            console.log("error", error);
          }
        })();
      });
  
      await Promise.allSettled(gamePromises);
      isLoading.current = false;
    };
  
    fetchGames();
  }, []);

  const handleUndelegatePlayer = async (playerData: {
    seed: string;
    playersComponentPda: PublicKey;
    parsedData: any;
    playersParsedDataEphem: any;
  }) => {
    console.log("cashout player");
    const undelegateIx = createUndelegateInstruction({
      payer: engine.getSessionPayer(),
      delegatedAccount: playerData.playersComponentPda,
      componentPda: COMPONENT_PLAYER_ID,
    });
    const tx = new anchor.web3.Transaction().add(undelegateIx);
    tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
    tx.feePayer = engine.getSessionPayer();
    try {
      const playerundelsignature = await engine.processSessionEphemTransaction(
        "undelPlayer:" + playerData.playersComponentPda.toString(),
        tx,
      );
      console.log("undelegate", playerundelsignature);
    } catch (error) {
      console.log("Error undelegating:", error);
    }
  };

  const handleDelegatePlayer = async (playerData: {
    seed: string;
    playersComponentPda: PublicKey;
    parsedData: any;
    playersParsedDataEphem: any;
  }, selectGameId: ActiveGame) => {
    try {
      const playersEntityPda = FindEntityPda({
        worldId: selectGameId.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(playerData.seed),
      });
      const playerdelegateIx = createDelegateInstruction({
        entity: playersEntityPda,
        account: playerData.playersComponentPda,
        ownerProgram: COMPONENT_PLAYER_ID,
        payer: engine.getWalletPayer(),
      });
      const deltx = new anchor.web3.Transaction().add(playerdelegateIx);
      const playerdelsignature = await engine.processWalletTransaction("playerdelegate", deltx);
      console.log(`delegation signature: ${playerdelsignature}`);
    } catch (error) {
      console.log("Error delegating:", error);
    }
  };

  const handlePanelOpen = async (engine: MagicBlockEngine, newGameInfo: ActiveGame) => {
    setTokenBalance(0);
    setPlayers([]);
    setAnteParsedData("");
    setMapParsedData("");
    setFoodComponentCheck("");
    setGameOwner("");
    setGameWallet("");
    setGameTokenAccount("");
    setGameEndpoint("");
    setCashoutStats({ cashOutSum: null, buyInSum: null, buyInCount: null });
  
    try {
      const endpointPromises = endpoints[NETWORK].map(async (endpoint) => {
        const mapEntityPda = FindEntityPda({
          worldId: newGameInfo.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array("origin"),
        });
        const mapComponentPda = FindComponentPda({
          componentId: COMPONENT_MAP_ID,
          entity: mapEntityPda,
        });
        console.log("mapComponentPda", endpoint, mapComponentPda.toString());
        try {
          const mapParsedData = await mapFetchOnSpecificEphem(engine, mapComponentPda, endpoint);
          console.log("mapParsedData", mapParsedData);
          return { endpoint, mapParsedData, mapComponentPda };
        } catch (error) {
          console.log("error", error);
          return null;
        }
      });
      const endpointResults = await Promise.all(endpointPromises);
      const validEndpointResult = endpointResults.find((res) => res?.mapParsedData);
      if (!validEndpointResult) {
        console.error("No valid endpoint found");
        return;
      }
      engine.setEndpointEphemRpc(validEndpointResult.endpoint);
      setGameEndpoint(validEndpointResult.endpoint);
      console.log("Using endpoint:", validEndpointResult.endpoint);

      // Compute PDAs for map and ante data
      const mapEntityPda = FindEntityPda({
        worldId: newGameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });

      const anteseed = "ante";
      const anteEntityPda = FindEntityPda({
        worldId: newGameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(anteseed),
      });
      const anteComponentPda = FindComponentPda({
        componentId: COMPONENT_ANTEROOM_ID,
        entity: anteEntityPda,
      });

      // Fetch ante room data first (needed for token operations)
      const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
      const readableAnteParsedData = `
        Map: ${anteParsedData?.map?.toString()} |
        Buy in: ${anteParsedData?.buyIn} |
        Token: ${anteParsedData?.token?.toString()} |
        Token Decimals: ${anteParsedData?.tokenDecimals} |
        Vault Token Account: ${anteParsedData?.vaultTokenAccount?.toString()} |
        Gamemaster Token Account: ${anteParsedData?.gamemasterTokenAccount?.toString()} |
        Total Active Buyins: ${anteParsedData?.totalActiveBuyins.toNumber()}
      `;
      console.log("readableAnteParsedData", readableAnteParsedData);
      setAnteParsedData(readableAnteParsedData);
      if (anteParsedData?.tokenDecimals) {
        setDecimals(anteParsedData.tokenDecimals);
        decimalsRef.current = anteParsedData.tokenDecimals;
      }
      if (anteParsedData?.token) setTokenAddress(anteParsedData.token.toString());

      // If valid ante data exists, proceed with concurrent operations:
      if (
        anteParsedData &&
        anteParsedData.token &&
        anteParsedData.gamemasterTokenAccount &&
        anteParsedData.tokenDecimals
      ) {
        const mintOfToken = anteParsedData.token;

        // Prepare token account and vault related promises...
        const tokenAccountPromise = getAccount(
          engine.getConnectionChain(),
          new PublicKey(anteParsedData.gamemasterTokenAccount.toString())
        );

        const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda"), validEndpointResult.mapComponentPda.toBuffer()],
          new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr")
        );
        const tokenVaultPromise = getAssociatedTokenAddress(mintOfToken, tokenAccountOwnerPda, true);

        const tokenMetadataPromise =
          mintOfToken.toString() !== "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn"
            ? fetchTokenMetadata(mintOfToken.toString(), NETWORK)
            : Promise.resolve(null);

        // Also run mapFetchOnSpecificEphem concurrently
        const mapFetchPromise = mapFetchOnSpecificEphem(engine, mapComponentPda, validEndpointResult.endpoint);

        // Execute all concurrently:
        const [tokenAccount, tokenVault, tokenMetadata, mapParsedData] = await Promise.all([
          tokenAccountPromise,
          tokenVaultPromise,
          tokenMetadataPromise,
          mapFetchPromise,
        ]);

        if (tokenMetadata) {
          const { name, image } = tokenMetadata;
          newGameInfo.image = image;
          newGameInfo.token = name;
        } else {
          // Special case for the known token
          newGameInfo.image = `${process.env.PUBLIC_URL}/agld.jpg`;
          newGameInfo.token = "AGLD";
        }

        // Update the game list, ensuring no duplicates
        setMyGames((prevMyGames) => {
          if (prevMyGames.some((game) => game.worldId === newGameInfo.worldId)) {
            return prevMyGames;
          }
          return [newGameInfo, ...prevMyGames];
        });

        // Process and set map data
        const readableMapParsedData = `
          Name: ${mapParsedData?.name} |
          Authority: ${mapParsedData?.authority?.toString()} |
          Width: ${mapParsedData?.width} |
          Height: ${mapParsedData?.height} |
          Buy in: ${mapParsedData?.buyIn} |
          Max Players: ${mapParsedData?.maxPlayers} |
          Wallet Balance: ${mapParsedData?.walletBalance.toNumber()} |
        `;
        console.log("readableMapParsedData", readableMapParsedData);
        setMapParsedData(readableMapParsedData);

        // Process token account info
        console.log("Token Account Owner:", tokenAccount.owner.toString());
        setGameOwner(tokenAccount.owner.toString());
        setGameWallet(tokenAccountOwnerPda.toString());
        setGameTokenAccount(tokenVault.toString());

        // Now fetch the vault account (dependent on tokenVault)
        const vaultAccount = await getAccount(engine.getConnectionChain(), new PublicKey(tokenVault.toString()));
        console.log("Balance:", vaultAccount.amount.toString());
        const readableBalance =
          Number(vaultAccount.amount) -
          anteParsedData.totalActiveBuyins.toNumber() * anteParsedData.buyIn.toNumber();
        setTokenBalance(readableBalance);
      }

  
      let foodcomponents = 32;
      const mapSize = newGameInfo.size;
      if (mapSize === 4000) {
        foodcomponents = 16 * 2;
      } else if (mapSize === 6000) {
        foodcomponents = 36 * 2;
      } else if (mapSize === 8000) {
        foodcomponents = 64 * 2;
      }
  
      // Create an array to fetch all food section data concurrently.
      const foodPromises = Array.from({ length: foodcomponents }, (_, idx) => {
        const index = idx + 1; // to match original numbering
        const foodseed = "food" + index.toString();
        const foodEntityPda = FindEntityPda({
          worldId: newGameInfo.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array(foodseed),
        });
        const foodComponentPda = FindComponentPda({
          componentId: COMPONENT_SECTION_ID,
          entity: foodEntityPda,
        });
        return sectionFetchOnEphem(engine, foodComponentPda).then((foodParsedData) => {
          // Use (idx) as the original code did (i-1)
          const { x, y } = getTopLeftCorner(idx, newGameInfo.size);
          return { index, foodParsedData, foodEntityPda, foodComponentPda, seed: foodseed, expectedX: x, expectedY: y };
        });
      });
      const foodResults = await Promise.all(foodPromises);
      //console.log("foodResults", foodcomponents, foodResults);
      const incorrectFoodEntities = foodResults
        .filter(({ foodParsedData, expectedX, expectedY, index }) => {
          if (!foodParsedData) return true;
          if (foodParsedData.topLeftX !== expectedX || foodParsedData.topLeftY !== expectedY) {
            console.error(
              `Food section ${index} has incorrect top left coordinates: (${foodParsedData.topLeftX}, ${foodParsedData.topLeftY})`
            );
            return true;
          }
          console.log(
            `Food section ${index} has correct top left coordinates: (${foodParsedData.topLeftX}, ${foodParsedData.topLeftY})`
          );
          return false;
        })
        .map(({ foodEntityPda, foodComponentPda, seed, expectedX, expectedY }) => ({
          x: expectedX,
          y: expectedY,
          foodEntityPda,
          foodComponentPda,
          seed,
        }));
      setIncorrectFoodEntities(incorrectFoodEntities);
      const sectionMessage = incorrectFoodEntities.length > 0 ? "section incorrect" : "success";
      console.log("sectionMessage", sectionMessage);
      setFoodComponentCheck(sectionMessage);
  
      await fetchPlayers(newGameInfo);

      const account = anteComponentPda.toString();
      const balanceData = await calculateTokenBalances(account);
      setCashoutStats({
        cashOutSum: balanceData.cashOutSum,
        buyInSum: balanceData.buyInSum,
        buyInCount: balanceData.buyInCount,
      });

    } catch (error) {
      console.error("Error in handlePanelOpen:", error);
    }
  };

  const handleDeleteGame = async (gameInfo: ActiveGame) => {
    console.log("delete game", gameInfo.worldId.toString());
    let maxplayer = 10;
    let foodcomponents = 32;

    const anteEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("ante"),
    });

    const mapEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });

    const anteComponentPda = FindComponentPda({
      componentId: COMPONENT_ANTEROOM_ID,
      entity: anteEntityPda,
    });

    const mapComponentPda = FindComponentPda({
      componentId: COMPONENT_MAP_ID,
      entity: mapEntityPda,
    });

    let destroyAnteComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: anteEntityPda, componentId: COMPONENT_ANTEROOM_ID, receiver: engine.getSessionPayer(), seed: "ante"});
    let destroyAnteComponentTx = await engine.processSessionChainTransaction("destroy:ante", destroyAnteComponentSig.transaction).catch((error) => {
      console.log("Error destroying:", error);
    });
    console.log("destroyAnteComponentTx", destroyAnteComponentTx);

    const undelegateIx = createUndelegateInstruction({
      payer: engine.getSessionPayer(),
      delegatedAccount: mapComponentPda,
      componentPda: COMPONENT_MAP_ID,
    });
    const tx = new anchor.web3.Transaction().add(undelegateIx);
    tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
    tx.feePayer = engine.getSessionPayer();
    try {
      const undelsignature = await engine.processSessionEphemTransaction(
        "undelmap:" + mapComponentPda.toString(),
        tx,
      );
      console.log("undelegate", undelsignature);
    } catch (error) {
        console.log("Error undelegating:", error);
    }
    let destroyMapComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: mapEntityPda, componentId: COMPONENT_MAP_ID, receiver: engine.getSessionPayer(), seed: "origin"});
    let destroyMapComponentTx = await engine.processSessionChainTransaction("destroy:origin", destroyMapComponentSig.transaction).catch((error) => {
      console.log("Error destroying:", error);
    });
    console.log("destroyMapComponentTx", destroyMapComponentTx);

    if (gameInfo.size == 4000) {
      maxplayer = 10;
      foodcomponents = 16 * 2;
    } else if (gameInfo.size == 6000) {
      maxplayer = 20;
      foodcomponents = 36 * 2;
    } else if (gameInfo.size == 8000) {
      maxplayer = 40;
      foodcomponents = 64 * 2;
    }

    for (let i = 1; i < foodcomponents + 1; i++) {
      const foodseed = "food" + i.toString();
      const foodEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(foodseed),
      });
      const foodComponenti = FindComponentPda({
        componentId: COMPONENT_SECTION_ID,
        entity: foodEntityPda,
      });

      const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: foodComponenti,
        componentPda: COMPONENT_SECTION_ID,
      });
      const tx = new anchor.web3.Transaction().add(undelegateIx);
      tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
      tx.feePayer = engine.getSessionPayer();
      try {
        const undelsignature = await engine.processSessionEphemTransaction(
          "undelfood:" + foodComponenti.toString(),
          tx,
        );
        console.log("undelegate", undelsignature);
      } catch (error) {
          console.log("Error undelegating:", error);
      }

      let destroyFoodComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: foodEntityPda, componentId: COMPONENT_SECTION_ID, receiver: engine.getSessionPayer(), seed: foodseed});
      let destroyFoodComponentTx = await engine.processSessionChainTransaction("destroy:" + foodseed, destroyFoodComponentSig.transaction).catch((error) => {
        console.log("Error destroying:", error);
      });
      console.log("destroyFoodComponentTx", destroyFoodComponentTx);
    }
    /*
      (alias) function DestroyComponent({ authority, entity, componentId, receiver, seed, }: {
        authority: anchor.web3.PublicKey;
        entity: anchor.web3.PublicKey;
        componentId: anchor.web3.PublicKey;
        receiver: anchor.web3.PublicKey;
        seed?: string;
    } */

    for (let i = 1; i < maxplayer + 1; i++) {
      const playerentityseed = "player" + i.toString();
      const playerEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(playerentityseed),
      });
      const playersComponentPda = FindComponentPda({
        componentId: COMPONENT_PLAYER_ID,
        entity: playerEntityPda,
      });

      const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: playersComponentPda,
        componentPda: COMPONENT_PLAYER_ID,
      });
      const tx = new anchor.web3.Transaction().add(undelegateIx);
      tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
      tx.feePayer = engine.getSessionPayer();
      try {
        const undelsignature = await engine.processSessionEphemTransaction(
          "undelPlayer:" + playersComponentPda.toString(),
          tx,
        );
        console.log("undelegate", undelsignature);
      } catch (error) {
          console.log("Error undelegating:", error);
      }

      let destroyPlayerComponentSig = await DestroyComponent({authority: engine.getSessionPayer(), entity: playerEntityPda, componentId: COMPONENT_PLAYER_ID, receiver: engine.getSessionPayer(), seed: playerentityseed});
      let destroyPlayerComponentTx = await engine.processSessionChainTransaction("destroy:" + playerentityseed, destroyPlayerComponentSig.transaction).catch((error) => {
        console.log("Error destroying:", error);
      });
      console.log("destroyPlayerComponentTx", destroyPlayerComponentTx);
    }
  };

  const handleReinitializeClick = async (gameInfo: ActiveGame, foodEntityPda: PublicKey, foodComponentPda: PublicKey, x: number, y: number, seed: string): Promise<void> => {
    const mapEntityPda = FindEntityPda({
      worldId: gameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });
    //console.log("reinitialize", foodEntityPda.toString(), mapEntityPda.toString(), foodComponentPda.toString(), x, y, seed);
      console.log("init food", foodEntityPda.toString(), x, y);
      const tx = new Transaction();
      const delegateInstruction = createDelegateInstruction({
        entity: foodEntityPda,
        account: foodComponentPda,
        ownerProgram: COMPONENT_SECTION_ID,
        payer: engine.getSessionPayer(),
      });
      tx.add(delegateInstruction);
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
      try {
        const delSig = await engine.processSessionChainTransaction("redelegate", tx);
        console.log(`Delegated food batch: ${delSig}`);
      } catch (e) {
        // @ts-ignore
        if (e.message.includes("ExternalAccountLamportSpend")) {
          console.log(e);
        } else {
          throw e;
        }
      } 
      
      const initFoodSig = await gameSystemInitSection(
        engine,
        gameInfo.worldPda,
        foodEntityPda,
        mapEntityPda,
        x,
        y,
      );
      console.log("initFoodSig", initFoodSig);
  };

  async function calculateTokenBalances(account: string) {
    const accountPubkey = new PublicKey(account);

    const signatures = await engine.getConnectionChain().getSignaturesForAddress(accountPubkey, { limit: 1000 });

    let cashOutSum = 0;
    let buyInSum = 0;
    let buyInCount = 0;

    for (const signatureInfo of signatures) {
      const transactionDetails = await engine.getConnectionChain().getTransaction(signatureInfo.signature, {
        commitment: "confirmed",
      });

      if (transactionDetails) {
        const { meta } = transactionDetails;
        if (meta && meta.preTokenBalances && meta.postTokenBalances) {
          //if supersize wallet receives tokens its a cash out -> amount recieved by supersize goes to fee (unless only supersize, then no fee)
          //otherwise its a buy in -> add amount sent to buy in sum, increment buy in count
          const tokenPreAccountIndex = meta.preTokenBalances.findIndex(
            (token) => token.owner === "DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB",
          );
          const tokenPostAccountIndex = meta.postTokenBalances.findIndex(
            (token) => token.owner === "DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB",
          );
          if (tokenPreAccountIndex !== -1 && tokenPostAccountIndex !== -1) {
            const preBalance = meta.preTokenBalances[tokenPreAccountIndex]?.uiTokenAmount.uiAmount || 0;
            const postBalance = meta.postTokenBalances[tokenPostAccountIndex]?.uiTokenAmount.uiAmount || 0;
            const balanceChange = postBalance - preBalance;
            if (balanceChange > 0) {
              if (meta.preTokenBalances.length > 2) {
                cashOutSum += balanceChange;
              }
            }
          } else {
            const preBalance = meta.preTokenBalances[0]?.uiTokenAmount.uiAmount || 0;
            const postBalance = meta.postTokenBalances[0]?.uiTokenAmount.uiAmount || 0;
            const balanceChange = postBalance - preBalance;
            buyInSum += Math.abs(balanceChange);
            buyInCount++;
          }
        }
      }
    }

    return { cashOutSum, buyInSum, buyInCount };
  }
  
  const deposit = async (
    amount: number,
    gameWallet: PublicKey,
    mint_of_token_being_sent: PublicKey,
    decimals: number,
  ) => {
    if (amount <= 0) {
      console.error("Deposit amount must be greater than zero.");
      return;
    }
    try {
      const transaction = new anchor.web3.Transaction();
      let usertokenAccountInfo = await getAssociatedTokenAddress(
        new PublicKey(mint_of_token_being_sent),
        engine.getWalletPayer(),
      );
      console.log("usertokenAccountInfo", usertokenAccountInfo.toString(), gameWallet.toString(), engine.getWalletPayer().toString(), amount * 10 ** decimals);
      const transferIx = createTransferInstruction(
        usertokenAccountInfo,
        gameWallet,
        engine.getWalletPayer(),
        amount * 10 ** decimals,
        [],
        TOKEN_PROGRAM_ID,
      );
      transaction.add(transferIx);
      const desposittx = await engine.processWalletTransaction("deposit", transaction);
      console.log("Deposit successful, transaction signature:", desposittx);
    } catch (error) {
      console.error("Error during deposit:", error);
    }
  };
  
  const DepositInput = React.memo(UncontrolledDepositInput);
  const handleDepositChange = useCallback(
    (e: any) => {
      setDepositValue(e.target.value);
    },
    [setDepositValue]
  );
  
  return (
    <div className="admin-tab">
      {isLoading.current === true ? (
        <div className="loading-container">
          <Spinner /> <span>Loading games you own...</span>
        </div>
      ) : (
        <></>
      )}
      <div className="game-stack" style={{ overflowY: "scroll", maxHeight: "70vh", width: "600px" }}>
        {myGames.map((row, idx) => (
          <CollapsiblePanel
            key={idx}
            title={row.isLoaded ? row.name + " " + `(${row.worldId.toString()})` : <Spinner />}
            onOpen={() => {
              setOpenPanelIndex(idx);
              handlePanelOpen(engine, row);
            }}
            defaultOpen={openPanelIndex === idx}
          >
            <div className="game-details" style={{ display: "flex", flexWrap: "wrap" }}>
              <p style={{ flex: "1 1 30%" }}>Game Id: {row.worldId.toString()}</p>
              <p style={{ flex: "1 1 30%" }}>Server: {getRegion(gameEndpoint)}</p>
              <p style={{ flex: "1 1 30%" }}>Max Players: {row.max_players}</p>
              <p style={{ flex: "1 1 30%" }}>Size: {row.size}</p>
              <p style={{ flex: "1 1 30%" }}>Token: {row.token.slice(0, 11)}</p>
              <p style={{ flex: "1 1 30%" }}>Buy in: {row.buy_in / 10 ** decimals}</p>
              <p style={{ flex: "1 1 100%", marginTop: "10px" }}>
                Game Owner: {" "} 
                <a href={`https://solscan.io/account/${gameOwner}`} target="_blank" rel="noopener noreferrer">
                  {gameOwner.slice(0, 3)}...{gameOwner.slice(-3)}
                </a>
              </p>
              <p style={{ flex: "1 1 30%" }}>
                Game Vault: {" "} 
                <a href={`https://solscan.io/account/${gameWallet}`} target="_blank" rel="noopener noreferrer">
                  {gameWallet.slice(0, 3)}...{gameWallet.slice(-3)}
                </a>
              </p>
              <p style={{ flex: "1 1 30%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Token Balance: {getRoundedAmount(tokenBalance / 10 ** decimals, row.buy_in / (1000 * 10 ** decimals) )}<br />
                </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UncontrolledDepositInput
                  defaultValue={depositValue}
                  onCommit={(value) => {
                    setDepositValue(value);
                    // Optionally perform additional actions when the value is committed.
                  }}
                />
                <button
                  className="btn-copy"
                  style={{ flex: "1 1 10%", margin: "10px" }}
                  onClick={() =>
                    deposit(parseFloat(depositValue), new PublicKey(gameTokenAccount), new PublicKey(tokenAddress), decimals)
                  }
                >
                  Deposit{" "}
                </button>
                <button
                  className="btn-copy"
                  style={{ flex: "1 1 10%", margin: "10px" }}
                  onClick={() =>
                    handleCashout(players[players.length - 1], row, parseFloat(depositValue) * 10 ** decimals)
                  }
                >
                  Withdraw{" "}
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p style={{ margin: "10px" }}>Fees Earned: {cashoutStats.cashOutSum ? getRoundedAmount(cashoutStats.cashOutSum, row.buy_in / 1000) : "Loading"}</p>
                <p style={{ margin: "10px" }}>Total Wagered: {cashoutStats.buyInSum ? getRoundedAmount(cashoutStats.buyInSum, row.buy_in / 1000) : "Loading"}</p>
                <p style={{ margin: "10px" }}>Total Plays: {cashoutStats.buyInCount ? cashoutStats.buyInCount : "Loading"}</p>
              </div>
              {/*
              <p style={{ flex: "1 1 100%" }}>
                Referral Program Account (optional):{" "}
                <a
                  href={`https://solscan.io/account/${referralProgramAccount}?cluster=mainnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {referralProgramAccount}
                </a>
              </p>
              */}
              <p style={{ margin: "10px"}}>
                Gold food value: {row.buy_in / (1000 * 10 ** decimals)}
              </p>
              <p style={{ margin: "10px"}}>
                Green - Purple food value: {row.buy_in / (200000 * 10 ** decimals)} - {(row.buy_in * 7) / (200000 * 10 ** decimals)}
              </p>              
              <Graph 
                maxPlayers={row.max_players}
                foodInWallet={Math.floor(tokenBalance / row.buy_in) * 1000}
                setCurrentFoodToAdd={setCurrentFoodToAdd}
                buyIn={row.buy_in}
                decimals={decimals}
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
              <p
                style={{
                  flex: "1 1 100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "10px",
                }}
              >
                {foodComponentCheck !== "success" ? (
                  <>
                    {foodComponentCheck !== "section not found" && foodComponentCheck !== "section incorrect" ? (
                      <>
                        Food components check
                        <svg
                          className="inline ml-[5px] mt-[2px] h-[20px] w-[20px] stroke-[white]"
                          width="52"
                          height="52"
                          viewBox="0 0 38 38"
                          xmlns="http://www.w3.org/2000/svg"
                      >
                        <g fill="none" fillRule="evenodd">
                          <g transform="translate(1 1)" strokeWidth="2">
                            <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                            <path d="M36 18c0-9.94-8.06-18-18-18">
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from="0 18 18"
                                to="360 18 18"
                                dur="1s"
                                repeatCount="indefinite"
                              />
                            </path>
                          </g>
                        </g>
                      </svg>
                      </>
                    ) : (
                      <div style={{  alignItems: "center", justifyContent: "center"}}>
                        {incorrectFoodEntities.map((entityPda, idx) => (
                          <>
                          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                            <a href={`https://explorer.solana.com/address/${entityPda.foodComponentPda.toString()}?cluster=custom&customUrl=https%3A%2F%2F${gameEndpoint.replace("https://", "")}`} target="_blank" rel="noopener noreferrer">
                              Incorrect food section: {entityPda.foodComponentPda.toString().slice(0, 3)}...{entityPda.foodComponentPda.toString().slice(-3)}
                            </a>
                            <button
                              key={idx}
                              className="btn-copy"
                              onClick={() => handleReinitializeClick(row, entityPda.foodEntityPda, entityPda.foodComponentPda, entityPda.x, entityPda.y, entityPda.seed)}
                            >
                              Reinitialize
                            </button>
                          </div>
                          </>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    Food components check
                    <svg
                      className="w-5 h-5 rounded-full inline-block stroke-[2px] stroke-[#15bd12] stroke-miter-10 shadow-inner ml-[5px] mt-[2px]"
                      style={{
                        animation: "fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;",
                      }}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 52 52"
                    >
                      <circle
                        className="stroke-[2px] stroke-[#15bd12] stroke-miter-10 fill-[#15bd12]"
                        style={{
                          strokeDasharray:
                            "166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;",
                        }}
                        cx="26"
                        cy="26"
                        r="25"
                        fill="none"
                      />
                      <path
                        className="stroke-[white] stroke-dasharray-[48] stroke-dashoffset-[48] transform-origin-[50%_50%] animation-stroke"
                        fill="none"
                        d="M14.1 27.2l7.1 7.2 16.7-16.8"
                      />
                    </svg>
                  </>
                )}
              </p>
                <p
                  style={{
                    width: "100%",
                  }}
                >
                  <CollapsiblePanel title="Players" defaultOpen={true}>
                  <p style={{ margin: "5px" }}>* if someone is playing, the player should be delegated</p>
                  <div style={{ overflowY: "scroll", maxHeight: "200px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {players.map((player, index) => (
                        <React.Fragment key={index}>
                          <tr
                            style={{
                              borderBottom: "1px solid #ccc",
                              backgroundColor: (index + 1) % 2 === 0 ? "#C0C0C0" : "#A4A4A4",
                            }}
                          >
                            <td colSpan={6} style={{ padding: "5px", textAlign: "center" }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-around",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <a
                                    href={`https://solscan.io/account/${
                                      player.playersComponentPda ? player.playersComponentPda.toString() : "null"
                                    }`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {player.seed}
                                  </a>
                                </div>
                                <div style={{ fontSize: "14px" }}>
                                  {player.delegated ? "Delegated" : "Undelegated"}
                                </div>
                                <div>
                                  {((!player.delegated && player.parsedData?.status === "exited") || (player.delegated && player.playersParsedDataEphem?.status === "exited")) 
                                  && (
                                    <button
                                      className="btn-copy"
                                      style={{ maxHeight: "40px" }}
                                      onClick={() => handleCashout(player, row)}
                                    >
                                      Cash Out
                                    </button>
                                  )}
                                </div>
                                <div>
                                  {player.delegated ? (
                                    <button
                                      className="btn-copy"
                                      style={{ maxHeight: "40px" }}
                                      onClick={() => handleUndelegatePlayer(player)}
                                    >
                                      Undelegate
                                    </button>
                                  ) : (
                                    <button
                                      className="btn-copy"
                                      style={{ maxHeight: "40px" }}
                                      onClick={() => handleDelegatePlayer(player, row)}
                                    >
                                      Delegate
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                          <tr
                            style={{
                              backgroundColor: (index + 1) % 2 === 0 ? "#C0C0C0" : "#A4A4A4",
                              borderBottom: "1px solid #ccc",
                            }}
                          >
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Network</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Status</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Mass</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Score</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Authority</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Payout</th>
                          </tr>
                          <tr
                            style={{
                              borderBottom: "1px solid #ccc",
                              backgroundColor: !player.delegated ? ((index + 1) % 2 === 0 ? "#CAD6CD" : "#BCC8BF") : (index + 1) % 2 === 0 ? "#C0C0C0" : "#A4A4A4",
                              textAlign: "center",
                            }}
                          >
                            <td style={{ padding: "5px", fontWeight: "bold" }}>mainnet</td>
                            <td style={{ padding: "5px" }}>
                              {player.parsedData?.status ? player.parsedData.status : "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {player.parsedData?.mass ? parseInt(player.parsedData.mass).toString() : "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {typeof player.playersParsedDataEphem?.score.toNumber() === "number"
                                ? (player.playersParsedDataEphem.score / 10 ** decimals).toFixed(1)
                                : "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {player.parsedData?.authority?.toString().slice(0, 3)}...
                              {player.parsedData?.authority?.toString().slice(-3)}
                            </td>
                            <td style={{ padding: "5px" }}>
                              <a
                                href={`https://solscan.io/account/${player.playerWallet?.toString()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {player.playerWallet?.toString().slice(0, 3)}...
                                {player.playerWallet?.toString().slice(-3)}
                              </a>
                            </td>
                          </tr>
                          <tr
                            style={{
                              borderBottom: "1px solid #ccc",
                              backgroundColor: player.delegated ? ((index + 1) % 2 === 0 ? "#CAD6CD" : "#BCC8BF") : (index + 1) % 2 === 0 ? "#C0C0C0" : "#A4A4A4",
                              textAlign: "center",
                            }}
                          >
                            <td style={{ padding: "5px", fontWeight: "bold" }}>ephemeral</td>
                            <td style={{ padding: "5px" }}>
                              {player.playersParsedDataEphem?.status}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {parseInt(player.playersParsedDataEphem?.mass).toString() || "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {typeof player.playersParsedDataEphem?.score.toNumber() === "number"
                                ? (player.playersParsedDataEphem.score / 10 ** decimals).toFixed(1)
                                : "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {player.playersParsedDataEphem?.authority?.toString().slice(0, 3)}...
                              {player.playersParsedDataEphem?.authority?.toString().slice(-3)}
                            </td>
                            <td style={{ padding: "5px" }}>
                              <a
                                href={`https://solscan.io/account/${player.playerWalletEphem?.toString()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {player.playerWalletEphem?.toString().slice(0, 3)}...
                                {player.playerWalletEphem?.toString().slice(-3)}
                              </a>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                </CollapsiblePanel>
                </p>
              </div>
              <CollapsiblePanel title="Anteroom component" defaultOpen={true}>
                <p style={{ flex: "1 1 100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {inspectAnteParsedData}
                </p>
              </CollapsiblePanel>
              <CollapsiblePanel title="Map component" defaultOpen={true}>
                <p style={{ flex: "1 1 100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {inspectMapParsedData}
                </p>
              </CollapsiblePanel>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p style={{ flex: "1 1 10%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Close game accounts, reclaim SOL
                </p>
                <button className="btn-copy" style={{ flex: "1 1 10%", margin: "10px" }}
                    onClick={() => handleDeleteGame(row)}>
                  Delete Game
                </button>
              </div>
            </div>
          </CollapsiblePanel>
        ))}
      </div>
    </div>
  );
}

interface UncontrolledDepositInputProps {
  defaultValue?: string;
  onCommit: (value: string) => void;
}

const UncontrolledDepositInput: React.FC<UncontrolledDepositInputProps> = React.memo(
  ({ defaultValue = "", onCommit }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder="tokens to deposit"
        style={{ color: "black", marginLeft: "10px" }}
        ref={inputRef}
        onBlur={() => {
          if (inputRef.current) {
            onCommit(inputRef.current.value);
          }
        }}
      />
    );
  }
);

function CollapsiblePanel({
  title,
  children,
  onOpen,
  defaultOpen,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  onOpen?: () => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    if (!isOpen && onOpen) {
      onOpen();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="collapsible-panel">
      <div className="panel-header" onClick={handleToggle}>
        {title} {isOpen ? "▲" : "▼"}
      </div>
      {isOpen && <div className="panel-content">{children}</div>}
    </div>
  );
}
