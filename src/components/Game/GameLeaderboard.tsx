import React from "react";
import { PublicKey } from "@solana/web3.js";
import "./GameLeaderboard.css";
import "../../pages/Landing.scss";
import { getOpponentColor } from "@utils/helper";

interface LeaderboardItem {
  name?: string;
  authority: PublicKey | null;
  score: number;
}

interface LeaderboardProps {
  leaderboard: LeaderboardItem[];
  currentPlayer: LeaderboardItem | null;
  gameInfo: { decimals: number };
}

const shortenAuthority = (authorityStr: string): string =>
  authorityStr.length <= 8 ? authorityStr : `${authorityStr.slice(0, 4)}...${authorityStr.slice(-4)}`;

const getDisplayName = (item: LeaderboardItem): string => {
  if (item.name && item.name !== "unnamed") {
    return item.name;
  }
  if (!item.authority) {
    return "unnamed";
  }
  return shortenAuthority(item.authority.toString());
};

const GameLeaderboard: React.FC<LeaderboardProps> = ({ leaderboard, currentPlayer, gameInfo }) => {
  return (
    <div className="game-leaderboard desktop-only">
      <div
        className="overlay-panel"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: "5px",
          border: "3px solid transparent",
        }}
      />
      <div className="title">Leaderboard</div>
      <ul>
        {leaderboard.map((item, index) => {
          const displayName = getDisplayName(item);
          const isCurrentPlayer =
            currentPlayer &&
            item.authority &&
            currentPlayer.authority &&
            item.authority.equals(currentPlayer.authority);
          return (
            <li
              key={item.authority ? item.authority.toString() : `${item.name}-${index}`}
              className={isCurrentPlayer ? "me" : ""}
              style={{ color: "#4FCF5A" }}
            >
              <b>{displayName}</b> <span>{(item.score / 10 ** gameInfo.decimals).toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GameLeaderboard;
