//src/components/Iput.tsx
import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  animate?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  animate = false,
  ...props
}) => {
  return (
    <div className={clsx('flex flex-col gap-1 w-full', animate && 'animate-fadeIn')}>
      {label && <label className="text-sm font-medium text-white">{label}</label>}

      <input
        autoComplete="off"
        {...props}
        className={clsx(
          'px-3 py-2 rounded-xl bg-[#1E1E1E] text-white border border-[#2A2A2A] placeholder:text-[#B0B0B0] focus:outline-none focus:ring-2 focus:ring-[#FF3B30] transition',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
      />

      {error && <span className="text-xs text-red-500 pl-1">{error}</span>}
    </div>
  );
};

export default Input;
