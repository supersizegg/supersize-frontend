import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";
import { PublicKey } from "@solana/web3.js";
import { countTransactionsByDay } from "@states/adminFunctions";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface GraphProps {
  engine: MagicBlockEngine;
  mapComponentPda: PublicKey;
}

const Graph: React.FC<GraphProps> = ({ engine, mapComponentPda }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const counts = await countTransactionsByDay(engine, mapComponentPda);
      const labels = Array.from({ length: counts.length }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (counts.length - 1 - i));
        return `${d.getMonth() + 1}/${d.getDate()}`;
      });
      setChartData({
        labels,
        datasets: [
          {
            label: "Players per day",
            data: counts,
            backgroundColor: "rgba(75,192,192,0.5)",
          },
        ],
      });
    };
    fetchData();
  }, [engine, mapComponentPda]);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      tooltip: { enabled: true },
    },
  };

  return (
    <div style={{ width: "480px", margin: "0 auto" }}>
      {chartData ? (
        <Bar data={chartData} options={options} />
      ) : (
        <div style={{ textAlign: "center", padding: "50px" }}>Loading data...</div>
      )}
    </div>
  );
};

export default Graph;
