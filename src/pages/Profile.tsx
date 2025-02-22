import React, { useEffect, useRef, useState } from "react";
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
} from "@magicblock-labs/bolt-sdk";
import { ActiveGame } from "@utils/types";
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
import { endpoints, NETWORK, RPC_CONNECTION } from "@utils/constants";
import { Spinner } from "@components/util/Spinner";
import Graph from "../components/Graph";
import { Chart, LineElement, PointElement, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { getTopLeftCorner, getRegion } from "@utils/helper";
import { createTransferInstruction } from "@solana/spl-token";
import { gameSystemInitSection } from "@states/gameSystemInitSection";

// Register the components
Chart.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend);

export default function Profile() {
  const engine = useMagicBlockEngine();
  const [activeTab, setActiveTab] = useState<"general" | "quests" | "admin">("general");
  return (
    <div className="profile-page main-container">
      <MenuBar />
      <div className="profile-container">
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
  const { publicKey } = useWallet();
  const [username, setUsername] = useState<string>("");
  const [referrerInput, setReferrerInput] = useState<string>("");
  const { referrer, member } = useBuddyLink();
  const [joinedOrg, setJoinedOrg] = useState<boolean>(false);
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
    if (publicKey) {
      const retrievedUser = localStorage.getItem("user");
      const retrievedRefferal = localStorage.getItem("referrer");
      //console.log('retrieved', member[0], retrievedRefferal, retrievedUser);
      if (member) {
        if (member[0]) {
          const retrievedUser = localStorage.getItem("user");
          let user = { name: member[0].account.name, referrer: referrer, referral_done: true };
          if (retrievedUser) {
            let myusername = JSON.parse(retrievedUser).name;
            user = { name: myusername, referrer: referrer, referral_done: true };
            setUsername(myusername);
          } else {
            user = { name: member[0].account.name, referrer: referrer, referral_done: true };
            setUsername(member[0].account.name);
          }
          setReferrerInput(member[0].account.name);
          localStorage.setItem("user", JSON.stringify(user));
          setJoinedOrg(true);
        } else {
          if (!retrievedUser || retrievedRefferal !== null) {
            if (retrievedUser && JSON.parse(retrievedUser).name !== null && JSON.parse(retrievedUser).name !== "") {
              const user = { name: JSON.parse(retrievedUser).name, referrer: referrer, referral_done: false };
              localStorage.setItem("user", JSON.stringify(user));
            } else {
              const user = { name: publicKey.toString().slice(0, 12), referrer: referrer, referral_done: false };
              localStorage.setItem("user", JSON.stringify(user));
            }
            setJoinedOrg(false);
          }
        }
      } else {
        if (!retrievedUser || retrievedRefferal !== null) {
          if (retrievedUser && JSON.parse(retrievedUser).name !== null && JSON.parse(retrievedUser).name !== "") {
            const user = { name: JSON.parse(retrievedUser).name, referrer: referrer, referral_done: false };
            localStorage.setItem("user", JSON.stringify(user));
          } else {
            const user = { name: publicKey.toString().slice(0, 12), referrer: referrer, referral_done: false };
            localStorage.setItem("user", JSON.stringify(user));
          }
          setJoinedOrg(false);
        }
      }
    }
  }, [member]);

  return (
    <div className="general-tab">
      <MenuSession />

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

      <label className="input-label">Referral link</label>
      <div className="row-inline referral-row input-group">
        <input type="text" readOnly value={joinedOrg ? `https://supersize.gg/?r=${referrerInput}` : referrer} />
        {joinedOrg ? (
          <>
            <button className="btn-copy">
              <CopyLink handleCreateClick={() => {}} />
            </button>
          </>
        ) : (
          <button className="btn-create-referral">
            <Invite />
          </button>
        )}
      </div>
      <div className="info-box">
        <span>Receive a 0.2% fee from your referrals earnings in the game. </span>
        {joinedOrg && (
          <a
            href={`https://x.com/intent/tweet?text=Try out on-chain gaming with me on Supersize. https://supersize.gg/?r=${referrerInput}`}
            target="_blank"
            rel="noreferrer"
          >
            Share ref link on X
          </a>
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
  const [currentFoodToAdd, setCurrentFoodToAdd] = useState<number>(0);
  const [inspectAnteParsedData, setAnteParsedData] = useState("");
  const [inspectMapParsedData, setMapParsedData] = useState("");
  const [foodComponentCheck, setFoodComponentCheck] = useState<string>("");
  const [playerComponentCheck, setPlayerComponentCheck] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [referralProgramAccount, setReferralProgramAccount] = useState<string>("");
  const [depositValue, setDepositValue] = useState<string>("");
  const [decimals, setDecimals] = useState<number>(0);
  const [gameEndpoint, setGameEndpoint] = useState<string>("");
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
        const parsedData = await playerFetchOnChain(engine, playersComponentPda);
        let playerWallet = "";
        if(parsedData && parsedData.payoutTokenAccount) {
          const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(parsedData.payoutTokenAccount.toString()));
          playerWallet = tokenAccount.owner.toString();
        }
        let playerWalletEphem = "";
        if(playersParsedDataEphem && playersParsedDataEphem.payoutTokenAccount) {
          const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(playersParsedDataEphem.payoutTokenAccount.toString()));
          playerWalletEphem = tokenAccount.owner.toString();
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

  const handleUnclogPlayer = async (playerData: {
    seed: string;
    playersComponentPda: PublicKey;
    parsedData: any;
    playersParsedDataEphem: any;
  }, selectGameId: ActiveGame) => {
    try {
      const gameInfo = selectGameId;
      let maxplayer = 20;
  
      const mapEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      
      const playerEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(playerData.seed),
      });

      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });
      let map_size = 4000;
      const mapParsedData = await mapFetchOnEphem(engine, mapComponentPda);
      if (mapParsedData) {
        console.log("map size", mapParsedData.width);
        map_size = mapParsedData.width;
      }
  
      if (map_size == 4000) {
        maxplayer = 20;
      } else if (map_size == 6000) {
        maxplayer = 40;
      } else if (map_size == 10000) {
        maxplayer = 100;
      }

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
        let sender_token_account = playerData.parsedData.payoutTokenAccount;
        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
          vault_program_id,
        );

        const extraAccounts = [
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
        const cashouttx = new anchor.web3.Transaction().add(applyCashOutSystem.transaction);
        await engine.processWalletTransaction("playercashout", cashouttx);
    } 
    }catch (error) {
      console.error(`Error unclogging player ${playerData.seed}:`, error);
    }
  };

  useEffect(() => {
    const fetchGames = async () => {
      if (isLoading.current) return;
      isLoading.current = true;
      console.log("fetching games");
  
      const startIndices = { devnet: 1800, mainnet: 0 };
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
                base_buyin: mapParsedData.baseBuyin,
                min_buyin: mapParsedData.minBuyin,
                max_buyin: mapParsedData.maxBuyin,
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
    setCurrentFoodToAdd(0);
    setFoodComponentCheck("");
    setPlayerComponentCheck("");
    setGameOwner("");
    setGameWallet("");
    setGameTokenAccount("");
    setReferralProgramAccount("");
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
        const mapParsedData = await mapFetchOnSpecificEphem(engine, mapComponentPda, endpoint);
        return { endpoint, mapParsedData, mapComponentPda };
      });
      const endpointResults = await Promise.all(endpointPromises);
      const validEndpointResult = endpointResults.find((res) => res.mapParsedData);
      if (!validEndpointResult) {
        console.error("No valid endpoint found");
        return;
      }
      engine.setEndpointEphemRpc(validEndpointResult.endpoint);
      setGameEndpoint(validEndpointResult.endpoint);
      console.log("Using endpoint:", validEndpointResult.endpoint);
      
      const mapEntityPda = FindEntityPda({
        worldId: newGameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin"),
      });
      const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
      });

      const mapParsedData = await mapFetchOnSpecificEphem(engine, mapComponentPda, validEndpointResult.endpoint);
      const readableMapParsedData = `
        Name: ${mapParsedData?.name} |
        Authority: ${mapParsedData?.authority?.toString()} |
        Width: ${mapParsedData?.width} |
        Height: ${mapParsedData?.height} |
        Base Buyin: ${mapParsedData?.baseBuyin} |
        Min Buyin: ${mapParsedData?.minBuyin} |
        Max Buyin: ${mapParsedData?.maxBuyin} |
        Max Players: ${mapParsedData?.maxPlayers} |
        Total Active Buyins: ${mapParsedData?.totalActiveBuyins} |
        Total Food on Map: ${mapParsedData?.totalFoodOnMap} |
        Food Queue: ${mapParsedData?.foodQueue} 
      `;
      console.log("readableMapParsedData", readableMapParsedData);
      setMapParsedData(readableMapParsedData);


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

      const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
  
      const readableAnteParsedData = `
        Map: ${anteParsedData?.map?.toString()} |
        Base Buyin: ${anteParsedData?.baseBuyin} |
        Min Buyin: ${anteParsedData?.minBuyin} |
        Max Buyin: ${anteParsedData?.maxBuyin} |
        Token: ${anteParsedData?.token?.toString()} |
        Token Decimals: ${anteParsedData?.tokenDecimals} |
        Vault Token Account: ${anteParsedData?.vaultTokenAccount?.toString()} |
        Gamemaster Token Account: ${anteParsedData?.gamemasterTokenAccount?.toString()}
      `;
      console.log("readableAnteParsedData", readableAnteParsedData);
      setAnteParsedData(readableAnteParsedData);
      if (anteParsedData?.tokenDecimals) setDecimals(anteParsedData.tokenDecimals);
      if (anteParsedData?.token) setTokenAddress(anteParsedData.token.toString());
  
      if (
        anteParsedData &&
        anteParsedData.token &&
        anteParsedData.gamemasterTokenAccount &&
        anteParsedData.tokenDecimals
      ) {
        const mintOfToken = anteParsedData.token;
        const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(anteParsedData.gamemasterTokenAccount.toString()));
        console.log("Token Account Owner:", tokenAccount.owner.toString());
        setGameOwner(tokenAccount.owner.toString());
  
        const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda"), validEndpointResult.mapComponentPda.toBuffer()],
          new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr")
        );
        const tokenVault = await getAssociatedTokenAddress(mintOfToken, tokenAccountOwnerPda, true);
        setGameWallet(tokenAccountOwnerPda.toString());
        setGameTokenAccount(tokenVault.toString());
  
        try {
          const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(tokenVault.toString()));
          console.log("Balance:", tokenAccount.amount.toString());
          const readableBalance = Number(tokenAccount.amount) / 10 ** anteParsedData.tokenDecimals;
          setTokenBalance(readableBalance);
        } catch (error) {
          console.error("Error fetching token account balance:", error);
        }
  
        // Referral program PDA calculation
        const referralVaultProgramId = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
        const [referralTokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda"), mintOfToken.toBuffer()],
          referralVaultProgramId
        );
        setReferralProgramAccount(referralTokenAccountOwnerPda.toString());
  
        // Fetch token metadata if needed
        if (mintOfToken.toString() === "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn") {
          newGameInfo.image = `${process.env.PUBLIC_URL}/agld.jpg`;
          newGameInfo.token = "AGLD";
        } else {
          try {
            const { name, image } = await fetchTokenMetadata(mintOfToken.toString());
            newGameInfo.image = image;
            newGameInfo.token = name;
          } catch (error) {
            console.error("Error fetching token data:", error);
          }
        }
  
        // Update the game list, ensuring no duplicates
        setMyGames((prevMyGames) => {
          if (prevMyGames.some((game) => game.worldId === newGameInfo.worldId)) {
            return prevMyGames;
          }
          return [newGameInfo, ...prevMyGames];
        });
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
      const incorrectFoodEntities = foodResults
        .filter(({ foodParsedData, expectedX, expectedY, index }) => {
          if (!foodParsedData) return false;
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
      //const checkPlayers = await handleCleanupClick(newGameInfo, false);
      //console.log("checkPlayers", checkPlayers);
      //if (checkPlayers !== undefined) {
      //  setPlayerComponentCheck(checkPlayers);
      //}

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
              <p style={{ flex: "1 1 60%" }}>Token: {row.token.slice(0, 11)}</p>
              <p style={{ flex: "1 1 20%" }}>Base Buyin: {row.base_buyin}</p>
              <p style={{ flex: "1 1 20%" }}>Min Buyin: {row.min_buyin}</p>
              <p style={{ flex: "1 1 20%" }}>Max Buyin: {row.max_buyin}</p>
              <p style={{ flex: "1 1 50%", marginTop: "10px" }}>
                Game Owner: {" "} 
                <a href={`https://solscan.io/account/${gameOwner}`} target="_blank" rel="noopener noreferrer">
                  {gameOwner.slice(0, 3)}...{gameOwner.slice(-3)}
                </a>
              </p>
              <p style={{ flex: "1 1 50%", marginTop: "10px"  }}>
                Game Vault: {" "} 
                <a href={`https://solscan.io/account/${gameWallet}`} target="_blank" rel="noopener noreferrer">
                  {gameWallet.slice(0, 3)}...{gameWallet.slice(-3)}
                </a>
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
                <p style={{ flex: "1 1 10%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Token Balance: {getRoundedAmount(tokenBalance, row.base_buyin / 1000) }<br />
                </p>
                <input
                  type="text"
                  placeholder="deposit value"
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                  style={{ color: "black", marginLeft: "10px" }}
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
                <p style={{ margin: "10px" }}>Fees Earned: {cashoutStats.cashOutSum ? getRoundedAmount(cashoutStats.cashOutSum, row.base_buyin / 1000) : "Loading"}</p>
                <p style={{ margin: "10px" }}>Total Wagered: {cashoutStats.buyInSum ? getRoundedAmount(cashoutStats.buyInSum, row.base_buyin / 1000) : "Loading"}</p>
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
              <p style={{ margin: "10px" }}>
                Food unit value: {row.base_buyin / 1000} {row.token}
              </p>
              <p style={{ margin: "10px" }}>Current food in wallet: {getRoundedAmount(tokenBalance / (row.base_buyin / 1000), row.base_buyin / 1000)}</p>
              <p style={{ margin: "10px" }}>Current tax (max 10%): {Math.max(0, (100 - currentFoodToAdd) / 10)}% </p>
              <p style={{ margin: "10px" }}>Current food to add: {currentFoodToAdd}</p>
              <Graph
                maxPlayers={row.max_players}
                foodInWallet={(tokenBalance * 1000) / row.base_buyin}
                setCurrentFoodToAdd={setCurrentFoodToAdd}
              />
              <p style={{ margin: "10px" }}>
                *For base buy in or greater, if less than 100 food is available to add, 100 food is still added and the
                player is taxed the remainder. For less than base buy in, the amount of food added is proportional to
                the buy in.*
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
                                  {player.parsedData?.mass?.toNumber() === 0 && (
                                    <button
                                      className="btn-copy"
                                      style={{ maxHeight: "40px" }}
                                      onClick={() => handleUnclogPlayer(player, row)}
                                    >
                                      Force Exit
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
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Mass</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Score</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Buy in</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Authority</th>
                            <th style={{ padding: "5px", borderBottom: "1px solid #ccc" }}>Payout</th>
                          </tr>
                          <tr
                            style={{
                              borderBottom: "1px solid #ccc",
                              backgroundColor: (index + 1) % 2 === 0 ? "#C0C0C0" : "#A4A4A4",
                              textAlign: "center",
                            }}
                          >
                            <td style={{ padding: "5px", fontWeight: "bold" }}>mainnet</td>
                            <td style={{ padding: "5px" }}>
                              {player.parsedData?.mass ? parseInt(player.parsedData.mass).toString() : "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {player.parsedData?.score ? parseFloat(player.parsedData.score).toFixed(1) : "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {player.parsedData?.buyin ? parseFloat(player.parsedData.buyin).toFixed(1) : "N/A"}
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
                              backgroundColor: (index + 1) % 2 === 0 ? "#C0C0C0" : "#A4A4A4",
                              textAlign: "center",
                            }}
                          >
                            <td style={{ padding: "5px", fontWeight: "bold" }}>ephemeral</td>
                            <td style={{ padding: "5px" }}>
                              {parseInt(player.playersParsedDataEphem?.mass).toString() || "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {parseFloat(player.playersParsedDataEphem?.score).toFixed(1) || "N/A"}
                            </td>
                            <td style={{ padding: "5px" }}>
                              {parseFloat(player.playersParsedDataEphem?.buyin).toFixed(1) || "N/A"}
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
                <button className="btn-copy" style={{ flex: "1 1 10%", margin: "10px" }}>
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
