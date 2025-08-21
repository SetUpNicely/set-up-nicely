
// 📁 /src/components/MiniChart.tsx
import React, { useEffect, useState } from 'react';
import { getMiniChartCandles } from '@services/chartService';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from 'chart.js';
import { CandleData } from '@shared/data/CandleData';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

type Props = {
  symbol: string;
  timestamp: number;
  timeframe: string;
};

const MiniChart: React.FC<Props> = ({ symbol, timestamp, timeframe }) => {
  const [data, setData] = useState<CandleData[]>([]);

  useEffect(() => {
    const run = async () => {
      const result = await getMiniChartCandles(symbol, new Date(timestamp).toISOString(), timeframe);
      setData(result);
    };
    run();
  }, [symbol, timestamp, timeframe]);

  if (!data.length) return <div className="text-xs text-gray-500 mt-1">Loading chart...</div>;

  return (
    <div className="mt-2">
      <Line
        data={{
          labels: data.map((candle) =>
            new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          ),
          datasets: [
            {
              label: symbol,
              data: data.map((candle) => candle.close),
              borderColor: '#FF3B30',
              backgroundColor: 'rgba(255, 59, 48, 0.1)',
              borderWidth: 1,
              tension: 0.3,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } },
        }}
        height={50}
      />
    </div>
  );
};

export default MiniChart;
