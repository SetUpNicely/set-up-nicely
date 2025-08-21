//src/components/ScanResultsPanel.tsx
import React from 'react';
import TriggerCard from './TriggerCard';
import { ScanMatchResult } from '@data/ScanTypes';

interface ScanResultsPanelProps {
  results: ScanMatchResult[];
  loading: boolean;
  sortByConfidence?: boolean;
  onCardClick?: (result: ScanMatchResult) => void;
}

export default function ScanResultsPanel({
  results,
  loading,
  sortByConfidence = false,
  onCardClick,
}: ScanResultsPanelProps) {
  if (loading) {
    return (
      <div className="bg-[#1E1E1E] text-[#B0B0B0] p-4 rounded-2xl shadow mt-2 text-sm">
        Running scan...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-[#1E1E1E] text-[#B0B0B0] p-4 rounded-2xl shadow mt-2 text-sm">
        No matches found.
      </div>
    );
  }

  const sortedResults = [...results].sort((a, b) => {
    const scoreA =
      sortByConfidence && a.confidenceScore !== undefined
        ? a.confidenceScore
        : a.pvsScore ?? 0;
    const scoreB =
      sortByConfidence && b.confidenceScore !== undefined
        ? b.confidenceScore
        : b.pvsScore ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div className="bg-[#1E1E1E] text-white p-4 rounded-2xl shadow mt-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">
          Matching Triggers
          {sortByConfidence && (
            <span className="ml-2 text-xs text-[#B0B0B0]">(sorted by Confidence)</span>
          )}
        </h3>
        <span className="text-xs bg-[#2A2A2A] text-[#B0B0B0] rounded-full px-3 py-0.5">
          {results.length} match{results.length > 1 ? 'es' : ''}
        </span>
      </div>

      <div className="animate-fadeIn space-y-3" role="list">
        {sortedResults.map((result) => (
          <div key={`${result.symbol}-${result.scanId}-${result.timestamp}`} role="listitem">
            <TriggerCard result={result} onClick={onCardClick} />
          </div>
        ))}
      </div>
    </div>
  );
}
