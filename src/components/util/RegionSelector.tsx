import React, { useEffect, useState } from "react";
import { endpoints, NETWORK, options } from "@utils/constants";
import { pingEndpointsStream, getPingColor } from "@utils/helper";
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";
import "./RegionSelector.scss";
import { Spinner } from "@components/util/Spinner";

type Props = {
  preferredRegion: string;
  setPreferredRegion: (region: string) => void;
  engine: MagicBlockEngine;
};

const RegionSelector: React.FC<Props> = ({ preferredRegion, setPreferredRegion, engine }) => {
  const [pingResults, setPingResults] = useState<{ endpoint: string; pingTime: number; region: string }[]>(
    endpoints[NETWORK].map((endpoint) => ({
      endpoint,
      pingTime: 0,
      region: options[endpoints[NETWORK].indexOf(endpoint)],
    })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    pingEndpointsStream((result) => {
      setPingResults((prev) => prev.map((r) => (r.endpoint === result.endpoint ? result : r)));
    }).then(() => {
      setLoading(false);
    });
  }, []);

  const handleRegionSelect = (region: string) => {
    if (!engine.getWalletConnected()) return;
    // setPreferredRegion(region);
  };

  const getPingClassName = (pingTime: number): string => {
    const color = getPingColor(pingTime);
    if (color === "green") return "ping-good";
    if (color === "yellow") return "ping-medium";
    return "ping-bad";
  };

  return (
    <div className="region-selector">
      <label className="input-label">Preferred Server Region</label>
      <div className="region-grid">
        {pingResults.map((item) => (
          <button
            key={item.region}
            className={`region-button ${preferredRegion.toLowerCase() === item.region.toLowerCase() ? "is-selected" : ""}`}
            disabled={true} // {!engine.getWalletConnected() || loading}
            onClick={() => handleRegionSelect(item.region)}
          >
            <span className="region-name">{item.region}</span>
            <span className={`region-ping ${getPingClassName(item.pingTime)}`}>
              {loading && item.pingTime === 0 ? <Spinner /> : `(${item.pingTime}ms)`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RegionSelector;
