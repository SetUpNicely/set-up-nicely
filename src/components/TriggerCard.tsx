// src/components/TriggerCard.tsx

import React, { useEffect, useState } from 'react';
import { ScanMatchResult } from '@shared/data/ScanTypes';
import PVSBadge from './PVSBadge';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Clock } from 'lucide-react';
import { getTickerPVS } from '@services/getTickerPVS';

type Props = {
  result: ScanMatchResult;
  onClick?: (result: ScanMatchResult) => void;
};

const TriggerCard: React.FC<Props> = ({ result, onClick }) => {
  const {
    symbol,
    scanId,
    timestamp,
    pvsScore,
    confidenceScore,
    timeframe,
    sectorHotToday,
  } = result;

  const [avgTickerPVS, setAvgTickerPVS] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const avg = await getTickerPVS(scanId, symbol, today);

      if (typeof avg === 'number') {
        setAvgTickerPVS(avg);
      }
    };
    load();
  }, [scanId, symbol]);

  const timeString = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(result)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(result)}
      className="animate-fadeIn bg-[#1E1E1E] rounded-2xl p-4 mb-4 text-white cursor-pointer hover:shadow-lg hover:scale-[1.02] transition duration-150"
    >
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg font-bold">{symbol}</h2>
        <span className="text-sm text-[#B0B0B0]">{timeString}</span>
      </div>

      <div className="text-sm text-[#B0B0B0] mb-2">
        {scanId} {timeframe ? `• ${timeframe} TF` : ''}
      </div>

      <div className="flex items-center gap-2 mb-2">
        {pvsScore !== undefined && <PVSBadge score={pvsScore} />}
        {confidenceScore !== undefined && <ConfidenceBadge score={confidenceScore} />}
        {avgTickerPVS !== null && (
          <span
            className="text-xs bg-[#2A2A2A] text-white rounded-full px-2 py-0.5"
            title="Average PVS for this ticker + scan"
          >
            Avg: {avgTickerPVS}
          </span>
        )}
        {sectorHotToday && (
          <span className="text-xs bg-[#FF3B30] text-white rounded-full px-2 py-0.5">
            Hot Sector
          </span>
        )}
      </div>

      <div className="flex items-center text-xs text-[#B0B0B0]">
        <Clock className="w-4 h-4 mr-1" />
        <span>Triggered</span>
      </div>
    </div>
  );
};

export default TriggerCard;
