// 📁 Location: /src/components/confidenceTooltip.tsx
import React from 'react';
import { Info } from 'lucide-react';

// ✅ Updated interface
interface ConfidenceTooltipProps {
  score?: number; // optional so you can skip passing it
  explanation?: string;
}

// ✅ Updated component
const ConfidenceTooltip: React.FC<ConfidenceTooltipProps> = ({
  score,
  explanation,
}) => {
  return (
    <div className="relative inline-flex items-center gap-1 group">
      {score !== undefined && (
        <span className="text-xs font-semibold text-white bg-blue-600 rounded-full px-3 py-0.5">
          Confidence: {score.toFixed(0)}
        </span>
      )}
      <div className="relative">
        <Info className="w-4 h-4 text-[#B0B0B0] hover:text-white cursor-pointer" />
        <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 hidden group-hover:block w-72 bg-[#2A2A2A] text-white text-xs p-3 rounded-md shadow-lg z-50">
          <p className="font-semibold mb-1 text-white">Confidence Score</p>
          {explanation ? (
            <p className="text-white">{explanation}</p>
          ) : (
            <>
              <p>
                This blends <span className="text-blue-400">PVS</span> and{' '}
                <span className="text-yellow-400">Sector Strength</span>:
              </p>
              <p className="text-yellow-300 font-medium mt-1">
                Confidence = 70% PVS + 30% Sector Strength
              </p>
              <p className="mt-2 text-[#B0B0B0]">
                You can toggle this in Settings to rank scan results by Confidence Score.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfidenceTooltip;