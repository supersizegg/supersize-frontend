import React, { useEffect, useRef, useState } from "react";
import { endpoints, NETWORK, options } from "@utils/constants";
import { pingEndpoints, getPingColor } from "@utils/helper";

type Props = {
  onSelect?: (endpoint: string) => void;
};

const RegionSelector: React.FC<Props> = ({ onSelect }) => {
  const pingResultsRef = useRef<{ endpoint: string; pingTime: number; region: string }[]>(
    endpoints[NETWORK].map((endpoint) => ({ endpoint, pingTime: 0, region: options[endpoints[NETWORK].indexOf(endpoint)] }))
  );
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPingData = async () => {
      setLoading(true);
      try {
        const pingResults = await pingEndpoints();
        pingResultsRef.current = pingResults.pingResults;
        const stored = localStorage.getItem("preferredRegion");
        const storedResult = pingResults.pingResults.find((p) => p.region === stored);
        if (storedResult) {
          setSelectedRegion(storedResult.region);
          onSelect?.(storedResult.endpoint);
        } else {
          setSelectedRegion(pingResults.lowestPingEndpoint.region);
          onSelect?.(pingResults.lowestPingEndpoint.endpoint);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPingData();
  }, [onSelect]);

  return (
    <div className="flex gap-2">
      {pingResultsRef.current.map((item) => (
        <button
          key={item.region}
          className={`region-button text-white px-4 py-2 rounded-md border border-white/20 ${
            selectedRegion === item.region ? "bg-[#666]" : "bg-[#444] hover:bg-[#555]"
          }`}
          disabled={loading}
          onClick={() => {
            setSelectedRegion(item.region);
            localStorage.setItem("preferredRegion", item.region);
            onSelect?.(item.endpoint);
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
