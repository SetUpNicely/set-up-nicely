// 📁 /src/components/JournalEntry.tsx
import React from 'react';

interface JournalEntry {
  id: string;
  timestamp: number;
  symbol: string;
  scanName?: string;
  scanId?: string;
  pvsScore?: number;
  sectorStrength?: number;
  entryPrice?: string;
  exitPrice?: string;
  gainLossPercent?: number | null;
  gainLossDollar?: number | null;
  outcome?: 'win' | 'loss' | 'neutral';
  notes?: string;
  emotions?: string;
  whatWorked?: string;
  whatDidnt?: string;
  tags?: string[];
}

interface Props {
  entry: JournalEntry;
}

const outcomeColors = {
  win: 'bg-green-600 text-white',
  loss: 'bg-red-600 text-white',
  neutral: 'bg-yellow-500 text-white',
};

const JournalEntry: React.FC<Props> = ({ entry }) => {
  const date = new Date(entry.timestamp).toLocaleString();

  return (
    <div className="animate-fadeIn bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center text-xs text-[#B0B0B0]">
        <span>{date}</span>
        {entry.outcome && (
          <span className={`font-medium px-2 py-0.5 rounded-full ${outcomeColors[entry.outcome]}`}>
            {entry.outcome.toUpperCase()}
          </span>
        )}
      </div>

      {/* Symbol + Scan */}
      <div className="text-white text-lg font-bold">{entry.symbol}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        {entry.scanName && (
          <span className="bg-[#2A2A2A] text-blue-400 px-2 py-0.5 rounded-full">
            Scan: {entry.scanName}
          </span>
        )}
        {entry.pvsScore !== undefined && (
          <span className="bg-[#2A2A2A] text-purple-300 px-2 py-0.5 rounded-full">
            PVS: {entry.pvsScore}
          </span>
        )}
        {entry.sectorStrength !== undefined && (
          <span className="bg-[#2A2A2A] text-yellow-300 px-2 py-0.5 rounded-full">
            Sector: {entry.sectorStrength}%
          </span>
        )}
      </div>

      {/* Prices */}
      {(entry.entryPrice || entry.exitPrice) && (
        <div className="text-sm text-[#B0B0B0]">
          Entry: ${entry.entryPrice ?? '—'} → Exit: ${entry.exitPrice ?? '—'}
        </div>
      )}
      {(entry.gainLossPercent !== undefined || entry.gainLossDollar !== undefined) && (
        <div className="text-sm text-[#B0B0B0]">
          Gain/Loss:{' '}
          {entry.gainLossPercent !== null && entry.gainLossPercent !== undefined
            ? `${entry.gainLossPercent}%`
            : '—'}{' '}
          (
          {entry.gainLossDollar !== null && entry.gainLossDollar !== undefined
            ? `$${entry.gainLossDollar}`
            : '—'}
          )
        </div>
      )}

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {entry.tags.map(tag => (
            <span
              key={tag}
              className="bg-red-700 text-white px-2 py-0.5 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Reflection Fields */}
      {entry.emotions && (
        <p className="text-sm text-[#B0B0B0]">
          <strong>Emotions:</strong> {entry.emotions}
        </p>
      )}
      {entry.whatWorked && (
        <p className="text-sm text-[#B0B0B0]">
          <strong>What Worked:</strong> {entry.whatWorked}
        </p>
      )}
      {entry.whatDidnt && (
        <p className="text-sm text-[#B0B0B0]">
          <strong>What Didn’t:</strong> {entry.whatDidnt}
        </p>
      )}
      {entry.notes && (
        <p className="text-sm text-[#B0B0B0] whitespace-pre-wrap">
          <strong>Notes:</strong> {entry.notes}
        </p>
      )}
    </div>
  );
};

export default JournalEntry;
