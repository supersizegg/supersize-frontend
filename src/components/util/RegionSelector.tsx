import React, { useEffect, useState } from "react";
import { endpoints, NETWORK, options } from "@utils/constants";
import { pingEndpointsStream, getPingColor } from "@utils/helper";
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";

type Props = {
  onSelect?: (endpoint: string) => void;
  preferredRegion: string;
  setPreferredRegion: (region: string) => void;
  engine: MagicBlockEngine;
};

const RegionSelector: React.FC<Props> = ({ onSelect, preferredRegion, setPreferredRegion, engine }) => {
  const [pingResults, setPingResults] = useState<{ endpoint: string; pingTime: number; region: string }[]>(
    endpoints[NETWORK].map((endpoint) => ({
      endpoint,
      pingTime: 0,
      region: options[endpoints[NETWORK].indexOf(endpoint)],
    })),
  );
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("preferredRegion", preferredRegion, 
      endpoints[NETWORK][options.map(option => option.toLowerCase()).indexOf(preferredRegion.toLowerCase())]
    );
    //let stored = localStorage.getItem("preferredRegion");
    let stored = preferredRegion;
    if (stored) {
      setSelectedRegion(stored);
      onSelect?.(endpoints[NETWORK][options.indexOf(stored)]);
    }

    const fetchPingData = async () => {
      setLoading(true);
      await pingEndpointsStream((result) => {
        setPingResults((prev) => prev.map((r) => (r.endpoint === result.endpoint ? result : r)));
        /*
        if (!stored && !selectedRegion) {
          stored = result.region;
          setSelectedRegion(result.region);
          localStorage.setItem("preferredRegion", result.region);
          onSelect?.(result.endpoint);
        }
        */
      });
      setLoading(false);
    };

    fetchPingData();
  }, [onSelect]);

  return (
    <div className="flex gap-2 pointer-events-none">
      {pingResults.map((item) => (
        <button
          key={item.region}
          className={`region-button text-white px-4 py-2 rounded-md border border-white/20 ${
            engine.getWalletConnected() ? (selectedRegion.toLowerCase() === item.region.toLowerCase() ? "bg-[#666]" : "bg-[#444] hover:bg-[#555]") 
            : "bg-[#444] hover:bg-[#555]"
          }`}
          disabled={loading}
          onClick={() => {
            //setSelectedRegion(item.region);
            //localStorage.setItem("preferredRegion", item.region);
            //onSelect?.(item.endpoint);
          }}
        >
          <span>{item.region}</span>
          <span style={{ fontSize: "10px", color: getPingColor(item.pingTime), marginLeft: "4px" }}>
            ({item.pingTime}ms)
          </span>
        </button>
      ))}
    </div>
  );
};

export default RegionSelector;
