import React, { useEffect, useState } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { MenuBar } from "@components/menu/MenuBar";
import LeaderboardDropdown from "@components/LeaderboardDropdown/LeaderboardDropdown";
import { API_URL } from "@utils/constants";
import "./Leaderboard.scss";
import { Food } from "@utils/types";
import GameComponent from "@components/Game/Game";
import { BN } from "@coral-xyz/anchor";
import BackButton from "@components/util/BackButton";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import AnimatedBackground from "../components/util/AnimatedBackground";

interface Player {
  name: string;
  total: number;
}

interface UserInfo {
  address: string;
  position: number;
  points: number;
}

interface LeaderboardEntry {
  player: string;
  score: number;
  token_mint: string;
  last_play: string;
}

interface LeaderboardApiResponse {
  total: number;
  page: number;
  limit: number;
  players: LeaderboardEntry[];
}

interface BlobPlayersApiResponse {
  wallet: string;
  balance: number;
  parent_wallet: string;
}

interface BlobPlayer {
  wallet: string;
  parent_wallet?: string;
  balance: number;
}

interface Season {
  icon: string;
  name: string;
  token: string;
}

interface EventOption {
  id: string;
  name: string;
}

const BONK_TOKEN = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

const availableEvents: EventOption[] = [
  { id: "bonk-preseason-2025", name: "BONK Pre‑Season" },
  { id: "all", name: "All Time" },
];

type LeaderboardProps = {
  engine: MagicBlockEngine;
  randomFood: Food[];
  tokenBalance: number;
};

const Leaderboard: React.FC<LeaderboardProps> = ({ engine, randomFood, tokenBalance }) => {
  const [season, setSeason] = useState<Season>({
    icon: `${process.env.PUBLIC_URL}/token.png`,
    name: "BONK",
    token: BONK_TOKEN,
  });
  const [selectedEvent, setSelectedEvent] = useState<string>("bonk-preseason-2025");

  const [leaderboardData, setLeaderboardData] = useState<BlobPlayer[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo>({ position: 0, points: 0, address: "" });

  const limit = 25;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (season.token !== BONK_TOKEN) {
      setSelectedEvent("all");
    }
    setCurrentPage(1);
  }, [season.token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEvent]);

  useEffect(() => {
    if (season.token === "") return;

    const fetchStats = async () => {
      try {
        let url = `${API_URL}/api/v1/blob-players`;
        // if (selectedEvent !== "all") {
        //   url += `&event_id=${selectedEvent}`;
        // }
        const response = await axios.get<BlobPlayersApiResponse[]>(url);
        const participants = response.data;
        participants
          .sort((a, b) => b.balance - a.balance)
          .map((player, i) => {
            if (engine.getWalletConnected()) {
              if (player.parent_wallet === engine.getWalletPayer().toString()) {
                setUserInfo({ position: i + 1, points: player.balance, address: player.wallet });
              }
            }
          });
        setTotalRows(participants.length);
        setLeaderboardData(participants);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      }
    };

    fetchStats();
  }, [engine, season, currentPage, selectedEvent]);

  /*
  useEffect(() => {
    if (season.token === "") return;

    const fetchPlayerRank = async () => {
      try {
        const walletAddress = engine.getWalletPayer() ? engine.getWalletPayer().toString() : "11111111111111111111111111111111";
        let url = `${API_URL}/api/v1/player-rank?address=${walletAddress}&token=${season.token}`;
        if (selectedEvent !== "all") {
          url += `&event_id=${selectedEvent}`;
        }
        const playerRankRes = await axios.get(url);
        setUserInfo({
          position: playerRankRes.data.rank,
          points: playerRankRes.data.score,
          address: playerRankRes.data.player,
        });
      } catch (error) {
        console.error("Error fetching player rank data:", error);
        setUserInfo({ position: 0, points: 0, address: "" });
      }
    };

    //fetchPlayerRank();
  }, [season, engine, selectedEvent]);
  */

  const totalPages = Math.ceil(totalRows / limit);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const delta = 2;
    let left = currentPage - delta;
    let right = currentPage + delta;

    if (left < 1) {
      left = 1;
      right = Math.min(totalPages, left + delta * 2);
    }
    if (right > totalPages) {
      right = totalPages;
      left = Math.max(1, right - delta * 2);
    }

    const pages = [];
    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination-container">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
          Prev
        </button>
        {left > 1 && (
          <>
            <button onClick={() => setCurrentPage(1)}>1</button>
            {left > 2 && <span>...</span>}
          </>
        )}
        {pages.map((pageNum) => (
          <button
            key={pageNum}
            className={pageNum === currentPage ? "active" : ""}
            onClick={() => setCurrentPage(pageNum)}
          >
            {pageNum}
          </button>
        ))}
        {right < totalPages && (
          <>
            {right < totalPages - 1 && <span>...</span>}
            <button onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="main-container">
      <AnimatedBackground />
      <MenuBar tokenBalance={tokenBalance} />

      <div className="leaderboard-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="top-stats-row">
          <div className="stat-box rank-box desktop-only">
            <p className="stat-label">Your Rank</p>
            <p className="stat-value">
              {userInfo.position} / {totalRows}
            </p>
          </div>

          <div className="stat-box winnings-box desktop-only">
            <p className="stat-label">Your Winnings</p>
            <p className="stat-value">
              {userInfo.points.toLocaleString("en-US", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}
            </p>
          </div>
          {/*
          <div className="dropdown-box">
            <p className="stat-label">Select Token</p>
            <LeaderboardDropdown season={season} setSeason={setSeason} />
          </div>*/}
        </div>

        {/* season.token === BONK_TOKEN && (
          <div className="event-tabs">
            {availableEvents.map((evt) => (
              <button
                key={evt.id}
                className={`event-tab ${selectedEvent === evt.id ? "active" : ""}`}
                onClick={() => setSelectedEvent(evt.id)}
              >
                {evt.name}
              </button>
            ))}
          </div>
        ) */}

        <div className="leaderboard-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
          </table>

          <div className="table-scroll">
            <table>
              <tbody>
                {leaderboardData.map((player, i) => (
                  <tr key={i} className={player.wallet === userInfo.address ? "player-row-highlight" : ""}>
                    <td>{(currentPage - 1) * limit + i + 1}</td>
                    <td>{player.parent_wallet ? player.parent_wallet : player.wallet}</td>
                    <td className="text-right">{player.balance ? player.balance.toLocaleString() : "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalRows > limit && <div className="pagination">{renderPagination()}</div>}
        <BackButton />
      </div>
    </div>
  );
};

export default Leaderboard;
