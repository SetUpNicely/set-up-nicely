// 📁 src/components/EmptyState.tsx
import React from 'react';
import { Ghost } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center text-[#B0B0B0] py-12 animate-fadeIn">
      <Ghost className="w-12 h-12 text-[#2A2A2A] mb-4" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-sm mt-1 text-[#B0B0B0]">{subtitle}</p>}
    </div>
  );
};

export default EmptyState;
