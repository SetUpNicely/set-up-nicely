// 📁 src/components/ScanInputRow.tsx
import React from 'react';
import { X } from 'lucide-react';
import indicatorOptions from '@data/indicatorOptions';
import triggerOptions from '@data/triggerOptions';
import { Timeframe } from '@shared/data/Timeframe';

interface ScanInputRowProps {
  id: number;
  type: 'custom' | 'trigger';
  field: string;
  operator: string;
  value: string;
  isIndicatorValue: boolean;
  onTypeChange: (val: 'custom' | 'trigger') => void;
  onFieldChange: (val: string) => void;
  onOperatorChange: (val: string) => void;
  onValueChange: (val: string) => void;
  onIsIndicatorValueChange: (val: boolean) => void;
  onRemove: () => void;
}

const ScanInputRow: React.FC<ScanInputRowProps> = ({
  type,
  field,
  operator,
  value,
  isIndicatorValue,
  onTypeChange,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onIsIndicatorValueChange,
  onRemove,
}) => {
  const isTrigger = type === 'trigger';

  return (
    <div className="animate-fadeIn flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] p-3 rounded-2xl">
      {/* Type */}
      <select
        className="w-28 bg-[#2A2A2A] text-white text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
        value={type}
        onChange={(e) => onTypeChange(e.target.value as 'custom' | 'trigger')}
      >
        <option value="custom">Custom</option>
        <option value="trigger">Trigger</option>
      </select>

      {/* Field */}
      <select
        className="flex-1 bg-[#2A2A2A] text-white text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
        value={field}
        onChange={(e) => onFieldChange(e.target.value)}
      >
        <option value="">Select Field</option>
        {(isTrigger ? triggerOptions : indicatorOptions).map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>

      {!isTrigger && (
        <>
          {/* Operator */}
          <select
            className="w-20 bg-[#2A2A2A] text-white text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
            value={operator}
            onChange={(e) => onOperatorChange(e.target.value)}
          >
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value=">=">&ge;</option>
            <option value="<=">&le;</option>
            <option value="=">=</option>
            <option value="!=">≠</option>
          </select>

          {/* Indicator/Numeric toggle */}
          <select
            className="w-32 bg-[#2A2A2A] text-white text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
            value={isIndicatorValue ? 'indicator' : 'value'}
            onChange={(e) => onIsIndicatorValueChange(e.target.value === 'indicator')}
          >
            <option value="value">Value</option>
            <option value="indicator">Indicator</option>
          </select>

          {/* Value input */}
          {isIndicatorValue ? (
            <select
              className="flex-1 bg-[#2A2A2A] text-white text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
            >
              <option value="">Select Indicator</option>
              {indicatorOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="w-24 bg-[#2A2A2A] text-white text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
              placeholder="Value"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
            />
          )}
        </>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-600 transition"
        title="Remove Condition"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default ScanInputRow;
