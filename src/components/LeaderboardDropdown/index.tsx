import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { fetchTokenMetadata } from "@utils/helper";
import { API_URL } from "@utils/constants";
import "./LeaderboardDropdown.scss";

interface Tokens {
  image?: string;
  name?: string;
  token_mint: string;
}

type LeaderboardDropdownProps = {
  season: { icon: string; name: string; token: string };
  setSeason: (season: { icon: string; name: string; token: string }) => void;
};

const LeaderboardDropdown = ({ season, setSeason }: LeaderboardDropdownProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const options = useRef<{ icon: string; name: string; token: string }[]>([
    { icon: `${process.env.PUBLIC_URL}/token.png`, name: "LOADING", token: "" },
  ]);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/tokens`);
        const tokensFromAPI = response.data;

        const metadataPromises = tokensFromAPI.map(async (t: Tokens) => {
          try {
            const metadata = await fetchTokenMetadata(t.token_mint);
            return {
              icon: metadata.image || `${process.env.PUBLIC_URL}/default-token.png`,
              name: metadata.name || t.token_mint,
              token: t.token_mint,
            };
          } catch (error) {
            console.error("Error fetching token metadata:", error);
            return {
              icon: `${process.env.PUBLIC_URL}/default-token.png`,
              name: t.token_mint,
              token: t.token_mint,
            };
          }
        });

        const tokensData = await Promise.all(metadataPromises);
        options.current = tokensData;
        if (tokensData.length > 0) {
          setSeason(tokensData[0]);
        }
        console.log("Updated token options:", tokensData);
      } catch (error) {
        console.error("Error loading token metadata:", error);
      }
    };

    loadTokens();
  }, [setSeason]);

  return (
    <div className="leaderboard-dropdown">
      <div className="leaderboard-dropdown-toggle" onClick={() => setIsDropdownOpen((prev) => !prev)}>
        <img src={season.icon} alt={season.name} />
        <span className="option-text">{season.name}</span>
      </div>

      {isDropdownOpen && (
        <div className="leaderboard-dropdown-menu">
          {options.current
            .filter((option) => option.name !== season.name)
            .map((option) => (
              <div
                className="leaderboard-dropdown-item"
                key={option.token}
                onClick={(e) => {
                  e.stopPropagation();
                  setSeason({ icon: option.icon, name: option.name, token: option.token });
                  setIsDropdownOpen(false);
                }}
              >
                <img src={option.icon} alt={option.name} />
                <span className="leaderboard-option-text">{option.name}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardDropdown;
