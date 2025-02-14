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

interface LeaderboardResponse {
  player: string;
  score: number;
  token_mint: string;
  last_play: string;
}

const Leaderboard: React.FC = () => {
  const [season, setSeason] = useState<{ icon: string; name: string; token: string }>({
    icon: `${process.env.PUBLIC_URL}/token.png`,
    name: "LOADING",
    token: "",
  });
  const [leaderboardData, setLeaderboardData] = useState<Player[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo>({ position: 0, points: 0, address: "" });
  const { publicKey } = useWallet();

  useEffect(() => {
    if (season.token === "") return;

    const fetchStats = async () => {
      try {
        const leaderboardRes = await axios.get(`${API_URL}/api/v1/leaderboard/${season.token}`);
        const participants = leaderboardRes.data.map((entry: LeaderboardResponse) => ({
          name: entry.player,
          total: entry.score,
        }));
        setLeaderboardData(participants);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      }
    };

    fetchStats();
  }, [publicKey, season]);

  useEffect(() => {
    if (season.token === "") return;

    const fetchPlayerRank = async () => {
      try {
        const walletAddress = publicKey ? publicKey.toString() : "11111111111111111111111111111111";
        const playerRankRes = await axios.get(`${API_URL}/api/v1/player-rank`, {
          params: {
            address: walletAddress,
            token: season.token,
          },
        });

        setUserInfo({
          position: playerRankRes.data.rank,
          points: playerRankRes.data.score,
          address: playerRankRes.data.player,
        });
        setTotalCandidates(playerRankRes.data.total);
      } catch (error) {
        console.error("Error fetching player rank data:", error);
        setUserInfo({ position: 0, points: 0, address: "" });
        setTotalCandidates(0);
      }
    };

    fetchPlayerRank();
  }, [season, publicKey]);

  return (
    <div className="main-container">
      <MenuBar />

      <div className="leaderboard-container">
        <div className="top-stats-row">
          <div className="stat-box rank-box desktop-only">
            <p className="stat-label">Your Rank</p>
            <p className="stat-value">
              {userInfo.position} / {totalCandidates}
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
                    <td>{i + 1}</td>
                    <td>{player.name}</td>
                    <td className="text-right">{player.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Leaderboard;
