import React, { useEffect, useState } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { MenuBar } from "@components/menu/MenuBar";
import LeaderboardDropdown from "@components/LeaderboardDropdown";
import Footer from "@components/Footer";
import { API_URL } from "@utils/constants";
import "./Leaderboard.scss";

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

const Leaderboard: React.FC = () => {
  const [season, setSeason] = useState<Season>({
    icon: `${process.env.PUBLIC_URL}/token.png`,
    name: "BONK",
    token: BONK_TOKEN,
  });
  const [selectedEvent, setSelectedEvent] = useState<string>("bonk-preseason-2025");

  const [leaderboardData, setLeaderboardData] = useState<Player[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo>({ position: 0, points: 0, address: "" });
  const { publicKey } = useWallet();

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
        let url = `${API_URL}/api/v1/leaderboard/${season.token}?limit=${limit}&page=${currentPage}`;
        if (selectedEvent !== "all") {
          url += `&event_id=${selectedEvent}`;
        }
        const response = await axios.get<LeaderboardApiResponse>(url);
        const { players, total } = response.data;
        const participants = players.map((entry: LeaderboardEntry) => ({
          name: entry.player,
          total: entry.score,
        }));
        setLeaderboardData(participants);
        setTotalRows(total);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      }
    };

    fetchStats();
  }, [publicKey, season, currentPage, selectedEvent]);

  useEffect(() => {
    if (season.token === "") return;

    const fetchPlayerRank = async () => {
      try {
        const walletAddress = publicKey ? publicKey.toString() : "11111111111111111111111111111111";
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

    fetchPlayerRank();
  }, [season, publicKey, selectedEvent]);

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
      <MenuBar />

      <div className="leaderboard-container">
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

          <div className="dropdown-box">
            <p className="stat-label">Select Token</p>
            <LeaderboardDropdown season={season} setSeason={setSeason} />
          </div>
        </div>

        {season.token === BONK_TOKEN && (
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
        )}

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
                  <tr key={i} className={player.name === userInfo.address ? "player-row-highlight" : ""}>
                    <td>{(currentPage - 1) * limit + i + 1}</td>
                    <td>{player.name}</td>
                    <td className="text-right">{player.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalRows > limit && <div className="pagination">{renderPagination()}</div>}
      </div>
      <Footer />
    </div>
  );
};

export default Leaderboard;
