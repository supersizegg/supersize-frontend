import React, { useEffect, useState } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import { MenuSession } from "@components/menu/MenuSession";
import FooterLink from "@components/Footer/Footer";
import "./Profile.scss";
import { anchor, BN, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { ActiveGame, Food } from "@utils/types";
import { COMPONENT_ANTEROOM_ID, COMPONENT_MAP_ID, COMPONENT_SECTION_ID } from "@states/gamePrograms";
import { sectionFetchOnEphem } from "@states/gameFetch";
import { useMagicBlockEngine } from "@engine/MagicBlockEngineProvider";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import {
  calculateK,
  calculateY,
  fetchGames,
  fetchPlayers,
  getGameData,
  getRoundedAmount,
  getValidEndpoint,
  stringToUint8Array,
} from "@utils/helper";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { cachedTokenMetadata } from "@utils/constants";
import { Spinner } from "@components/util/Spinner";
import Graph from "../components/util/Graph";
import { Chart, LineElement, PointElement, LinearScale, Title, Tooltip, Legend } from "chart.js";
import { getTopLeftCorner, getRegion } from "@utils/helper";
import GameComponent from "@components/Game/Game";
import {
  handleCashout,
  handleUndelegatePlayer,
  handleDelegatePlayer,
  handleDeleteGame,
  handleReinitializeClick,
  calculateGameplayStats,
  deposit,
} from "@states/adminFunctions";
import DepositInput from "@components/util/DepositInput";
import CollapsiblePanel from "@components/util/CollapsiblePanel";

Chart.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend);

type profileProps = {
  randomFood: Food[];
};

export default function Profile({ randomFood }: profileProps) {
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
          screenSize={{ width: window.innerWidth, height: window.innerHeight }}
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
  const [usernameSaved, setUsernameSaved] = useState(false);

  const setInputUsername = (inputUsername: React.SetStateAction<string>) => {
    const user = { name: inputUsername, referrer: "", referral_done: false };
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
      } else {
        setGemBalance(0);
      }
    };

    fetchUserTokenBalance();
  }, [engine.getSessionPayer()]);

  return (
    <div className="general-tab">
      <MenuSession />
      {/* <div style={{ display: "flex" , flexDirection: "row", marginLeft: "1em" }}>
          Supersize Gems: <img  style={{ width: "20px", height: "20px", marginRight: "5px",marginTop: "1px", marginLeft: "5px"   }} src={cachedTokenMetadata["AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp"].image} alt="Token Image" /> {gemBalance.toFixed(2)}
      </div> */}

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
  return (
    <div className="quests-tab">
      <div className="quest-item">
        <span>Play 10 games</span>
        <button>{"5 GEM"}</button>
      </div>
      <div className="quest-item">
        <span>Eat 25 players</span>
        <button>{"50 GEM"}</button>
      </div>
      <div className="quest-item">
        <span>Eat 100K food</span>
        <button>{"100 GEM"}</button>
      </div>
      <div className="quest-item">
        <span>Follow on X</span>
        <button>{"Pending"}</button>
      </div>
    </div>
  );
}

function AdminTab({ engine }: { engine: MagicBlockEngine }) {
  const [isLoading, setIsLoading] = useState(false);
  const [myGames, setMyGames] = useState<ActiveGame[]>([]);
  const [openPanelIndex, setOpenPanelIndex] = useState<number | null>(null);
  const [gameOwner, setGameOwner] = useState<string>("");
  const [gameWallet, setGameWallet] = useState<string>("");
  const [gameTokenAccount, setGameTokenAccount] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [inspectAnteParsedData, setAnteParsedData] = useState("");
  const [foodComponentCheck, setFoodComponentCheck] = useState<string>("");
  const [depositValue, setDepositValue] = useState<string>("");
  const [currentFoodToAdd, setCurrentFoodToAdd] = useState<number>(0);
  const [cashoutStats, setCashoutStats] = useState<{
    cashOutSum: number | null;
    buyInSum: number | null;
    buyInCount: number | null;
  }>({
    cashOutSum: null,
    buyInSum: null,
    buyInCount: null,
  });
  const [incorrectFoodEntities, setIncorrectFoodEntities] = useState<
    { x: number; y: number; foodEntityPda: PublicKey; foodComponentPda: PublicKey; seed: string }[]
  >([]);
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

  useEffect(() => {
    const runFetchGames = async () => {
      if (isLoading) return;
      setIsLoading(true);
      console.log("fetching games");
      let newGames = await fetchGames(engine, myGames);
      setMyGames(newGames);
      setIsLoading(false);
    };
    runFetchGames();
  }, []);

  const handlePanelOpen = async (engine: MagicBlockEngine, newGameInfo: ActiveGame) => {
    // Reset states
    setTokenBalance(0);
    setPlayers([]);
    setAnteParsedData("");
    setFoodComponentCheck("");
    setGameOwner("");
    setGameWallet("");
    setCashoutStats({ cashOutSum: null, buyInSum: null, buyInCount: null });

    const mapEntityPda = FindEntityPda({
      worldId: newGameInfo.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array("origin"),
    });
    const mapComponentPda = FindComponentPda({
      componentId: COMPONENT_MAP_ID,
      entity: mapEntityPda,
    });

    try {
      // p1: Process game and anteroom data
      const processGameData = async () => {
        const { gameInfo: updatedGameInfo, anteroomData } = await getGameData(
          engine,
          newGameInfo.worldId,
          "",
          newGameInfo,
        );
        if (!anteroomData) {
          throw new Error("anteroomData missing");
        }
        console.log("updatedGameInfo", updatedGameInfo);
        setGameTokenAccount(anteroomData.vaultTokenAccount.toString());

        const readableAnteroomData = `
          Buy in: ${anteroomData.buyIn} |
          Token: ${anteroomData.token.toString()} |
          Decimals: ${anteroomData.tokenDecimals} |
          Vault token account: ${anteroomData.vaultTokenAccount.toString()} |
          Gamemaster token account: ${anteroomData.gamemasterTokenAccount.toString()} |
          Total Active Buyins: ${anteroomData.totalActiveBuyins}
        `;
        console.log("readableAnteroomData", readableAnteroomData);
        setAnteParsedData(readableAnteroomData);

        const [tokenAccount, vaultAccount] = await Promise.all([
          getAccount(engine.getConnectionChain(), anteroomData.gamemasterTokenAccount),
          getAccount(engine.getConnectionChain(), anteroomData.vaultTokenAccount),
        ]);
        const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
          new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr"),
        );
        console.log("Token Account Owner:", tokenAccount.owner.toString());
        setGameOwner(tokenAccount.owner.toString());
        setGameWallet(tokenAccountOwnerPda.toString());
        console.log("Balance:", vaultAccount.amount.toString());
        const readableBalance = Number(vaultAccount.amount) - anteroomData.totalActiveBuyins * anteroomData.buyIn;
        setTokenBalance(readableBalance);
        const k = calculateK(updatedGameInfo.max_players, 0.01);
        const foodInWallet = Math.floor(tokenBalance / anteroomData.buyIn) * 1000;
        const currentFoodToAdd = Math.max(0.5, Math.floor(calculateY(foodInWallet, k) * 100));
        setCurrentFoodToAdd(currentFoodToAdd);

        return updatedGameInfo;
      };

      // p2: Process food component sections
      const processFoodComponents = async () => {
        let foodcomponents = 32;
        const mapSize = newGameInfo.size;
        if (mapSize === 4000) {
          foodcomponents = 16 * 2;
        } else if (mapSize === 6000) {
          foodcomponents = 36 * 2;
        } else if (mapSize === 8000) {
          foodcomponents = 64 * 2;
        }
        const foodPromises = Array.from({ length: foodcomponents }, (_, idx) => {
          const index = idx + 1;
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
            const { x, y } = getTopLeftCorner(idx, newGameInfo.size);
            return {
              index,
              foodParsedData,
              foodEntityPda,
              foodComponentPda,
              seed: foodseed,
              expectedX: x,
              expectedY: y,
            };
          });
        });
        const foodResults = await Promise.all(foodPromises);
        const incorrectFoodEntities = foodResults
          .filter(({ foodParsedData, expectedX, expectedY, index }) => {
            if (!foodParsedData) return true;
            if (foodParsedData.topLeftX !== expectedX || foodParsedData.topLeftY !== expectedY) {
              console.error(
                `Food section ${index} has incorrect top left coordinates: (${foodParsedData.topLeftX}, ${foodParsedData.topLeftY})`,
              );
              return true;
            }
            console.log(
              `Food section ${index} has correct top left coordinates: (${foodParsedData.topLeftX}, ${foodParsedData.topLeftY})`,
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
      };

      // p3: Process players
      const processPlayers = async () => {
        const players = await fetchPlayers(engine, newGameInfo);
        setPlayers(players);
      };

      // p4: Process ante token balances
      const processAnteTokenBalances = async () => {
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
        const account = anteComponentPda.toString();
        const balanceData = await calculateGameplayStats(engine, account);
        setCashoutStats({
          cashOutSum: balanceData.cashOutSum,
          buyInSum: balanceData.buyInSum,
          buyInCount: balanceData.buyInCount,
        });
      };

      let updatedGameInfo;
      let validEndpointResult;
      [updatedGameInfo, validEndpointResult] = await Promise.all([
        processGameData(),
        getValidEndpoint(engine, mapComponentPda),
      ]);
      updatedGameInfo.endpoint = validEndpointResult;
      setMyGames((prevMyGames) => {
        if (prevMyGames.some((game) => game.worldId === updatedGameInfo.worldId)) {
          return prevMyGames;
        }
        return [updatedGameInfo, ...prevMyGames];
      });
      engine.setEndpointEphemRpc(validEndpointResult);
      await Promise.all([processFoodComponents(), processPlayers(), processAnteTokenBalances()]);
    } catch (error) {
      console.error("Error in handlePanelOpen:", error);
    }
  };

  return (
    <div className="admin-tab">
      {isLoading === true ? (
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
              console.log("onOpen", row);
              setOpenPanelIndex(idx);
              handlePanelOpen(engine, row);
            }}
            defaultOpen={openPanelIndex === idx}
          >
            <div className="game-details" style={{ display: "flex", flexWrap: "wrap" }}>
              <p style={{ flex: "1 1 30%" }}>Game Id: {row.worldId.toString()}</p>
              <p style={{ flex: "1 1 30%" }}>Server: {getRegion(row.endpoint)}</p>
              <p style={{ flex: "1 1 30%" }}>Max Players: {row.max_players}</p>
              <p style={{ flex: "1 1 30%" }}>Size: {row.size}</p>
              <p style={{ flex: "1 1 30%" }}>Token: {row.token.slice(0, 11)}</p>
              <p style={{ flex: "1 1 30%" }}>Buy in: {row.buy_in / 10 ** row.decimals}</p>
              <p style={{ flex: "1 1 100%", marginTop: "10px" }}>
                Game Owner:{" "}
                <a href={`https://solscan.io/account/${gameOwner}`} target="_blank" rel="noopener noreferrer">
                  {gameOwner.slice(0, 3)}...{gameOwner.slice(-3)}
                </a>
              </p>
              <p style={{ flex: "1 1 30%" }}>
                Game Vault:{" "}
                <a href={`https://solscan.io/account/${gameWallet}`} target="_blank" rel="noopener noreferrer">
                  {gameWallet.slice(0, 3)}...{gameWallet.slice(-3)}
                </a>
              </p>
              <p style={{ flex: "1 1 30%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Token Balance:{" "}
                {getRoundedAmount(tokenBalance / 10 ** row.decimals, row.buy_in / (1000 * 10 ** row.decimals))}
                <br />
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
                <DepositInput
                  defaultValue={depositValue}
                  onCommit={(value) => {
                    setDepositValue(value);
                  }}
                />
                <button
                  className="btn-copy"
                  style={{ flex: "1 1 10%", margin: "10px" }}
                  onClick={() => {
                    if (row.tokenMint) {
                      deposit(
                        engine,
                        parseFloat(depositValue),
                        new PublicKey(gameTokenAccount),
                        row.tokenMint,
                        row.decimals,
                      );
                    }
                  }}
                >
                  Deposit{" "}
                </button>
                <button
                  className="btn-copy"
                  style={{ flex: "1 1 10%", margin: "10px" }}
                  onClick={() =>
                    handleCashout(
                      engine,
                      players[players.length - 1],
                      row,
                      parseFloat(depositValue) * 10 ** row.decimals,
                    )
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
                <p style={{ margin: "10px" }}>
                  Fees Earned:{" "}
                  {cashoutStats.cashOutSum ? getRoundedAmount(cashoutStats.cashOutSum, row.buy_in / 1000) : "Loading"}
                </p>
                <p style={{ margin: "10px" }}>
                  Total Wagered:{" "}
                  {cashoutStats.buyInSum ? getRoundedAmount(cashoutStats.buyInSum, row.buy_in / 1000) : "Loading"}
                </p>
                <p style={{ margin: "10px" }}>
                  Total Plays: {cashoutStats.buyInCount ? cashoutStats.buyInCount : "Loading"}
                </p>
              </div>
              <p style={{ margin: "10px" }}>Food value multiplier: {currentFoodToAdd}</p>
              <p style={{ margin: "10px" }}>
                Green - Purple food value: {(row.buy_in * currentFoodToAdd) / (200000 * 10 ** row.decimals)} -{" "}
                {(row.buy_in * 7 * currentFoodToAdd) / (200000 * 10 ** row.decimals)}
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
                <CollapsiblePanel title="Food Value Curve" defaultOpen={false}>
                  <Graph
                    maxPlayers={row.max_players}
                    foodInWallet={Math.floor(tokenBalance / row.buy_in) * 1000}
                    buyIn={row.buy_in}
                    decimals={row.decimals}
                  />
                </CollapsiblePanel>
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
                        <div style={{ alignItems: "center", justifyContent: "center" }}>
                          {incorrectFoodEntities.map((entityPda, idx) => (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: "10px",
                                }}
                              >
                                <a
                                  href={`https://explorer.solana.com/address/${entityPda.foodComponentPda.toString()}?cluster=custom&customUrl=https%3A%2F%2F${row.endpoint.replace("https://", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Incorrect food section: {entityPda.foodComponentPda.toString().slice(0, 3)}...
                                  {entityPda.foodComponentPda.toString().slice(-3)}
                                </a>
                                <button
                                  key={idx}
                                  className="btn-copy"
                                  onClick={() =>
                                    handleReinitializeClick(
                                      engine,
                                      row,
                                      entityPda.foodEntityPda,
                                      entityPda.foodComponentPda,
                                      entityPda.x,
                                      entityPda.y,
                                      entityPda.seed,
                                    )
                                  }
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
                                      {((!player.delegated && player.parsedData?.status === "exited") ||
                                        (player.delegated && player.playersParsedDataEphem?.status === "exited")) && (
                                        <button
                                          className="btn-copy"
                                          style={{ maxHeight: "40px" }}
                                          onClick={() => handleCashout(engine, player, row)}
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
                                          onClick={() => handleUndelegatePlayer(engine, player)}
                                        >
                                          Undelegate
                                        </button>
                                      ) : (
                                        <button
                                          className="btn-copy"
                                          style={{ maxHeight: "40px" }}
                                          onClick={() => handleDelegatePlayer(engine, player)}
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
                                  backgroundColor: !player.delegated
                                    ? (index + 1) % 2 === 0
                                      ? "#CAD6CD"
                                      : "#BCC8BF"
                                    : (index + 1) % 2 === 0
                                      ? "#C0C0C0"
                                      : "#A4A4A4",
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
                                    ? (player.playersParsedDataEphem.score / 10 ** row.decimals).toFixed(1)
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
                                  backgroundColor: player.delegated
                                    ? (index + 1) % 2 === 0
                                      ? "#CAD6CD"
                                      : "#BCC8BF"
                                    : (index + 1) % 2 === 0
                                      ? "#C0C0C0"
                                      : "#A4A4A4",
                                  textAlign: "center",
                                }}
                              >
                                <td style={{ padding: "5px", fontWeight: "bold" }}>ephemeral</td>
                                <td style={{ padding: "5px" }}>{player.playersParsedDataEphem?.status}</td>
                                <td style={{ padding: "5px" }}>
                                  {parseInt(player.playersParsedDataEphem?.mass).toString() || "N/A"}
                                </td>
                                <td style={{ padding: "5px" }}>
                                  {typeof player.playersParsedDataEphem?.score.toNumber() === "number"
                                    ? (player.playersParsedDataEphem.score / 10 ** row.decimals).toFixed(1)
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
                <button
                  className="btn-copy"
                  style={{ flex: "1 1 10%", margin: "10px" }}
                  onClick={() => handleDeleteGame(engine, row)}
                >
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
