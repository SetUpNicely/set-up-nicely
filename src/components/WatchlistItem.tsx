// 📁 src/components/WatchlistItem.tsx
import React from 'react';
import { Trash2 } from 'lucide-react';
import PVSBadge from './PVSBadge';
import ConfidenceTooltip from './confidenceTooltip';
import TriggerCard from './TriggerCard';
import { ScanMatchResult } from '@data/ScanTypes';

interface WatchlistItemProps {
  symbol: string;
  notes?: string;
  pvs?: number;
  confidenceScore?: number;
  sectorTag?: string;
  triggers: ScanMatchResult[];
  onRemove?: () => void;
}

const WatchlistItem: React.FC<WatchlistItemProps> = ({
  symbol,
  notes,
  pvs,
  confidenceScore,
  sectorTag,
  triggers,
  onRemove,
}) => {
  return (
    <div className="animate-fadeIn bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 space-y-3 shadow hover:shadow-lg hover:border-[#FF3B30] transition duration-200">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-lg font-semibold text-white">{symbol}</div>
          {notes && <div className="text-sm text-[#B0B0B0]">{notes}</div>}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-[#B0B0B0] hover:text-[#FF3B30] transition"
            title="Remove from Watchlist"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {pvs !== undefined && <PVSBadge score={pvs} />}
        {confidenceScore !== undefined && (
          <ConfidenceTooltip score={confidenceScore} />
        )}
        {sectorTag && (
          <span
            className="text-xs bg-[#2A2A2A] text-white px-2 py-0.5 rounded"
            title="Top Sector Match"
          >
            {sectorTag}
          </span>
        )}
      </div>

      {/* Triggered setups */}
      {triggers.length > 0 ? (
        <div className="space-y-2 pt-2">
          {triggers.map((trigger) => (
            <TriggerCard
              key={`${trigger.symbol}-${trigger.scanId}-${trigger.timestamp}`}
              result={trigger}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#B0B0B0] pt-2">No recent triggers.</div>
      )}
    </div>
  );
};

export default WatchlistItem;
