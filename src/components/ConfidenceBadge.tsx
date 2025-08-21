// 📁 Location: /src/components/ConfidenceBadge.tsx
import React from 'react';

interface ConfidenceBadgeProps {
  score: number;
  showTooltip?: boolean;
  animate?: boolean;
}

export function ConfidenceBadge({
  score,
  showTooltip = true,
  animate = false,
}: ConfidenceBadgeProps) {
  let bgColor = 'bg-gray-600';
  if (score >= 85) bgColor = 'bg-green-600';
  else if (score >= 70) bgColor = 'bg-yellow-500';
  else if (score >= 50) bgColor = 'bg-orange-500';
  else bgColor = 'bg-red-600';

  return (
    <div className={`relative inline-block group ${animate ? 'animate-fadeIn' : ''}`}>
      <span
        className={`text-xs font-semibold text-white rounded-full px-3 py-0.5 ${bgColor}`}
        title="Confidence Score"
      >
        Confidence: {score.toFixed(0)}
      </span>

      {showTooltip && (
        <div className="absolute z-10 hidden group-hover:block text-xs bg-[#2A2A2A] text-white rounded-md px-3 py-2 mt-1 w-64 shadow-lg">
          <p className="font-semibold text-white mb-1">Confidence Score</p>
          <p>
            This combines Predictive Validity Score (PVS) and Sector Strength:
            <br />
            <span className="text-yellow-300 font-medium">
              Confidence = 70% PVS + 30% Sector Strength
            </span>
          </p>
          <p className="mt-2 text-[#B0B0B0] text-xs">
            You can enable/disable this in Settings.
          </p>
        </div>
      )}
    </div>
  );
}
