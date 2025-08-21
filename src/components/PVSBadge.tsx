// 📁 src/components/PVSBadge.tsx
import React from 'react';

const PVSBadge = ({ score }: { score: number }) => {
  let bgColor = 'bg-gray-600';
  if (score >= 85) bgColor = 'bg-green-600';
  else if (score >= 70) bgColor = 'bg-yellow-500';
  else if (score >= 50) bgColor = 'bg-orange-500';
  else bgColor = 'bg-red-600';

  return (
    <span
      className={`text-xs font-semibold text-white rounded-full px-3 py-0.5 ${bgColor}`}
      title="Predictive Validity Score"
    >
      PVS: {score.toFixed(0)}
    </span>
  );
};

export default PVSBadge;
