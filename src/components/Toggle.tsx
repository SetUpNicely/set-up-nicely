//scr/components/Toggle.tsx
import React from 'react';

interface ToggleProps {
  isOn: boolean;
  onToggle: () => void;
  animate?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ isOn, onToggle, animate = false }) => {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isOn}
      className={`${
        animate ? 'animate-fadeIn' : ''
      } w-12 h-6 flex items-center rounded-full p-1 transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF3B30] ${
        isOn ? 'bg-green-500 hover:bg-green-400' : 'bg-[#2A2A2A] hover:bg-[#383838]'
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
          isOn ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
};
