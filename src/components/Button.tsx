// src/components/Button.tsx
import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  animate?: boolean; // optional fadeIn
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  animate = false,
  className,
  disabled,
  ...props
}) => {
  const base =
    'px-4 py-2 rounded-2xl font-semibold shadow-sm focus:outline-none ring-1 ring-transparent focus:ring-[#FF3B30] transition-all';

  const variants = {
    primary: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-[#2A2A2A] hover:bg-[#383838] text-white',
    danger: 'bg-red-800 hover:bg-red-900 text-white',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';

  const combined = clsx(
    base,
    variants[variant],
    fullWidth && 'w-full',
    animate && 'animate-fadeIn',
    disabled && disabledStyles,
    className
  );

  return (
    <button className={combined} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;

