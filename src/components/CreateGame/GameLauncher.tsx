import React, { useEffect, useState } from "react";
import CreateGameForm from "@components/CreateGame/CreateGameForm";
import { FetchedGame } from "@utils/types";
import SelectRegion from "@components/CreateGame/SelectRegion";
import { endpoints, NETWORK } from "@utils/constants";
import "./GameLauncher.scss";

type launchProps = {
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
};

const GameLauncher: React.FC<launchProps> = ({ activeGamesLoaded, setActiveGamesLoaded }) => {
  const options = [
    { id: 0, size: 10000, players: 100, cost: "2.0 SOL" },
  ];

  const [selectedOption, setSelectedOption] = useState(0);
  const [selectedServer, setSelectedServer] = useState<string>("Europe");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");

  useEffect(() => {
    if (selectedServer === "Europe") {
      setSelectedEndpoint(endpoints[NETWORK][0]);
    }
    if (selectedServer === "America") {
      setSelectedEndpoint(endpoints[NETWORK][1]);
    }
    if (selectedServer === "Asia") {
      setSelectedEndpoint(endpoints[NETWORK][2]);
    }
  }, [selectedServer]);

  return (
    <div className="launch-game-container">
      <div className="launch-game-content">
        <p className="launch-game-description">Game size:</p>
        <div className="options-container">
          {options.map((option) => (
            <div
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`option-card ${selectedOption === option.id ? "selected" : ""}`}
            >
              <div>Size: {option.size}</div>
              <div>Players: {option.players}</div>
              <div>Cost: {option.cost}</div>
            </div>
          ))}
        </div>
        <p className="launch-game-description">Select server:</p>
        <SelectRegion items={["Europe", "America", "Asia"]} onSelect={setSelectedServer} selectedItem={selectedServer} />
        <p className="info-text">
          Deploying a game creates a new Supersize world that lasts forever and is owned by you. The deployment cost is
          refundable if you decide to close the game accounts in your profile.{" "}
          <b>The game owner recieves a 1% fee charged on each player exit.</b>
        </p>
      </div>
      <div className="create-game-form-container">
        <CreateGameForm
          game_size={options[selectedOption].size}
          activeGamesLoaded={activeGamesLoaded}
          setActiveGamesLoaded={setActiveGamesLoaded}
          selectedServer={selectedEndpoint}
        />
      </div>
    </div>
  );
};

export default GameLauncher;
