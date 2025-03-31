import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { calculateK } from "@utils/helper";
import { calculateY } from "@utils/helper";

ChartJS.register(LineElement, CategoryScale, LinearScale, Tooltip, Legend);

interface GraphProps {
  maxPlayers: number;
  foodInWallet: number;
  buyIn: number;
  decimals: number;
}

const Graph: React.FC<GraphProps> = ({ maxPlayers, foodInWallet, buyIn, decimals }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [chartReady, setChartReady] = useState(false);
  const epsilon = 0.01;

  useEffect(() => {
    setTimeout(() => {
      console.log("buyIn", buyIn);
      const k = calculateK(maxPlayers, epsilon);
      const values = Array.from({ length: 100000 }, (_, i) => i);
      const foodToAddValues = values.map((x) => calculateY(x, k) * 100);
      const currentFoodToAdd = Math.max(0.5, Math.floor(calculateY(foodInWallet, k) * 100));
      const roundedFoodInWallet = Math.round(foodInWallet);
      
      const data = {
        labels: values.map((x) => Number(((x / 1000) * (buyIn / 10 ** decimals)).toFixed(2))),
        datasets: [
          {
            label: "Food value multiplier",
            data: foodToAddValues,
            borderColor: "rgba(75,192,192,1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            z: 1,
          },
          {
            label: "Current Value",
            data: values.map((x) => (x === roundedFoodInWallet ? currentFoodToAdd : null)),
            borderColor: "rgba(255,0,0,1)",
            borderWidth: 3,
            pointRadius: 8,
            pointBackgroundColor: "rgba(255,0,0,1)",
            showLine: false,
            z: 2,
          },
        ],
      };

      setChartData(data);
    }, 0);
  }, [maxPlayers, buyIn, decimals, foodInWallet]);

  const options = {
    responsive: true,
    animation: {
      duration: 1000,
      onComplete: () => setChartReady(true),
    },
    plugins: {
      legend: { position: "top" as const },
      tooltip: { enabled: true },
      decimation: {
        enabled: true,
        algorithm: "lttb" as const, 
        samples: 500,
      },
    },
    scales: {
      x: {
        title: { display: true, text: "tokens in wallet" },
      },
      y: {
        title: { display: true, text: "food value multiplier" },
        min: 0.5,
        max: chartData ? Math.max(...chartData.datasets[0].data) : undefined,
      },
    },
  };

  return (
    <div style={{ width: "600px", margin: "0 auto", position: "relative" }}>
      {chartData ? (
        <Line data={chartData} options={options} />
      ) : (
        <div style={{ textAlign: "center", padding: "50px" }}>Loading data...</div>
      )}
      {chartData && !chartReady && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(255,255,255,0.8)",
          }}
        >
          Loading chart...
        </div>
      )}
    </div>
  );
};

export default Graph;
