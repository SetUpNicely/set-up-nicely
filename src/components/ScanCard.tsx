// 📁 src/components/ScanCard.tsx
import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Lock, Key, Shield } from 'lucide-react';
import { Timeframe } from '@shared/data/Timeframe';

type Direction = 'bullish' | 'bearish';
type AccessTier = 'free' | 'paid' | 'pro';

interface DirectScanCardProps {
  name: string;
  description: string;
  timeframe: Timeframe;
  access: AccessTier;
  direction: Direction;
  onClick?: () => void;
  actions?: React.ReactNode;
  footer?: React.ReactNode; // ✅ Add footer to Direct
}

interface ScanObjectCardProps {
  scan: {
    id: string;
    name: string;
    description?: string;
    timeframe: Timeframe;
    logic: Record<string, any>;
    preset?: boolean;
  };
  actions?: React.ReactNode;
  footer?: React.ReactNode; // ✅ Add footer to Object
}

type ScanCardProps = DirectScanCardProps | ScanObjectCardProps;

export function ScanCard(props: ScanCardProps) {
  const scan = 'scan' in props ? props.scan : null;

  const name = scan?.name ?? (props as DirectScanCardProps).name;
  const description = scan?.description ?? (props as DirectScanCardProps).description;
  const timeframe = scan?.timeframe ?? (props as DirectScanCardProps).timeframe;
  const direction = scan ? 'bullish' : (props as DirectScanCardProps).direction;
  const access = scan ? 'free' : (props as DirectScanCardProps).access;
  const onClick = 'onClick' in props ? props.onClick : undefined;
  const actions = props.actions;
  const footer = props.footer;

  const accessColor =
    access === 'pro'
      ? 'border-purple-500'
      : access === 'paid'
      ? 'border-blue-500'
      : 'border-gray-600';

  const directionIcon =
    direction === 'bullish'
      ? <ArrowUpRight className="w-4 h-4 text-green-500" />
      : <ArrowDownLeft className="w-4 h-4 text-red-500" />;

  const accessIcon =
    access === 'pro'
      ? <Shield className="w-4 h-4 text-purple-500" />
      : access === 'paid'
      ? <Key className="w-4 h-4 text-blue-500" />
      : <Lock className="w-4 h-4 text-gray-500" />;

  return (
    <div
      onClick={onClick}
      className={`relative animate-fadeIn cursor-pointer bg-[#1E1E1E] text-white p-4 rounded-2xl shadow border ${accessColor} hover:bg-[#2A2A2A] transition duration-200`}
    >
      {scan?.preset && (
        <div className="absolute top-2 right-2 bg-blue-700 text-white text-xs px-2 py-0.5 rounded-full">
          PRESET
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {name}
          {directionIcon}
        </h2>
        {accessIcon}
      </div>

      <p className="text-sm text-[#B0B0B0] mb-3">{description}</p>

      <div className="flex justify-between text-xs text-[#B0B0B0]">
        <span>
          Timeframe: <span className="text-white font-medium">{timeframe}</span>
        </span>
        <span>
          Direction: <span className="text-white font-medium capitalize">{direction}</span>
        </span>
      </div>

      {/* ✅ New: Injected footer (e.g., avg PVS) */}
      {footer && <div className="mt-3">{footer}</div>}

      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );
}

export default ScanCard;
