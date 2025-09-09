import React, { useEffect, useState } from "react";
import axios from "axios";
import { MenuBar } from "@components/menu/MenuBar";
import { API_URL, NETWORK, cachedTokenMetadata } from "@utils/constants";
import BackButton from "@components/util/BackButton";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import "./Leaderboard.scss";

const TOKEN_MINT = Object.keys(cachedTokenMetadata).filter((mint) => cachedTokenMetadata[mint].network === NETWORK)[0];

interface LeaderboardPlayer {
  wallet: string;
  balance: number;
}

interface PlayerStats {
  balances: {
    f2p_earnings: number;
    p2p_vault_balance: number;
  };
  ranks: {
    casual: {
      rank: number;
      totalPlayers: number;
    };
    ranked: {
      rank: number;
      totalPlayers: number;
    };
  };
}

type LeaderboardProps = {
  engine: MagicBlockEngine;
};

const Leaderboard: React.FC<LeaderboardProps> = ({ engine }) => {
  const [leaderboardType, setLeaderboardType] = useState<"casual" | "ranked">("ranked");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [connectedWalletAddr, setConnectedWalletAddr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get<LeaderboardPlayer[]>(
          `${API_URL}/api/v1/leaderboard?mode=${leaderboardType}&token_mint=${TOKEN_MINT}`,
        );
        setLeaderboardData(response.data);
      } catch (error) {
        console.error(`Error fetching ${leaderboardType} leaderboard:`, error);
        setLeaderboardData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [leaderboardType]);

  useEffect(() => {
    const walletConnected = engine.getWalletConnected();
    const sessionWallet = engine.getSessionPayer()?.toString();
    const parentWallet = walletConnected ? engine.getWalletPayer().toString() : null;
    setConnectedWalletAddr(parentWallet);

    const walletToQuery = leaderboardType === "ranked" ? parentWallet : sessionWallet;

    if (walletToQuery) {
      const fetchPlayerStats = async () => {
        try {
          const response = await axios.get<PlayerStats>(`${API_URL}/api/v1/players/stats?wallet=${walletToQuery}`);
          setPlayerStats(response.data);
        } catch (error) {
          console.error("Error fetching player stats:", error);
          setPlayerStats(null);
        }
      };
      fetchPlayerStats();
    } else {
      setPlayerStats(null);
    }
  }, [engine, engine.getWalletConnected(), leaderboardType]);

  return (
    <div className="leaderboard-page">
      <MenuBar />

      <main className="leaderboard-container">
        <header className="leaderboard-header">
          <div className="leaderboard-tabs">
            <button
              className={`tab-button ${leaderboardType === "ranked" ? "active" : ""}`}
              onClick={() => setLeaderboardType("ranked")}
            >
              Ranked
            </button>
            <button
              className={`tab-button ${leaderboardType === "casual" ? "active" : ""}`}
              onClick={() => setLeaderboardType("casual")}
            >
              Casual
            </button>
          </div>
        </header>

        {playerStats && (
          <div className="your-rank-banner">
            {leaderboardType === "casual" && playerStats.ranks.casual.rank >= 0 && (
              <div className="rank-stat">
                <span className="stat-label">Casual Rank</span>
                <span className="stat-value">
                  {playerStats.ranks.casual.rank} / {playerStats.ranks.casual.totalPlayers}
                </span>
              </div>
            )}

            {leaderboardType === "ranked" && playerStats.ranks.ranked.rank > 0 && (
              <div className="rank-stat">
                <span className="stat-label">Your Rank</span>
                <span className="stat-value">
                  {playerStats.ranks.ranked.rank} / {playerStats.ranks.ranked.totalPlayers}
                </span>
              </div>
            )}

            <div className="rank-stat">
              <span className="stat-label">Total Value</span>
              <span className="stat-value">
                {(
                  Number(playerStats.balances.f2p_earnings) + Number(playerStats.balances.p2p_vault_balance)
                ).toLocaleString("en-US", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
              </span>
            </div>
          </div>
        )}

        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th className="align-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="loading-cell">
                    Loading...
                  </td>
                </tr>
              ) : leaderboardData.length > 0 ? (
                leaderboardData.map((player, i) => (
                  <tr
                    key={i}
                    className={
                      player.wallet === engine.getSessionPayer()?.toString() || player.wallet === connectedWalletAddr
                        ? "is-player-highlight"
                        : ""
                    }
                  >
                    <td data-label="Rank">{i + 1}</td>
                    <td data-label="Player">
                      {window.innerWidth > 768
                        ? player.wallet
                        : `${player.wallet.slice(0, 4)}...${player.wallet.slice(-4)}`}
                    </td>
                    <td data-label="Total" className="align-right">
                      {player.balance.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="loading-cell">
                    No players found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <BackButton />
    </div>
  );
};

export default Leaderboard;
