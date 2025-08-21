// 📁 /src/components/JournalDrawer.tsx

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Input from './Input';
import Button from './Button';
import { useJournal } from '@context/JournalContext';
import { JournalEntry } from '@data/JournalTypes';

interface JournalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<JournalEntry, 'id'>) => void;
  defaultSymbol?: string;
  defaultScanName?: string;
  defaultPVS?: number;
  defaultSectorStrength?: number;
}

const predefinedTags = ['FOMO', 'Perfect', 'Late Entry', 'Early Exit'];

const JournalDrawer: React.FC<JournalDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultSymbol = '',
  defaultScanName = '',
  defaultPVS,
  defaultSectorStrength,
}) => {
  const { journalTarget } = useJournal();

  const [symbol, setSymbol] = useState(defaultSymbol);
  const [scanName, setScanName] = useState(defaultScanName);
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [outcome, setOutcome] = useState<'win' | 'loss' | ''>('');
  const [notes, setNotes] = useState('');
  const [emotions, setEmotions] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidnt, setWhatDidnt] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [gainLossPercent, setGainLossPercent] = useState<number | null>(null);
  const [gainLossDollar, setGainLossDollar] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (journalTarget) {
      setSymbol(journalTarget.symbol ?? defaultSymbol);
      setScanName(journalTarget.scanName ?? defaultScanName);
      setNotes(journalTarget.notes ?? '');
    }
  }, [journalTarget, defaultSymbol, defaultScanName]);

  useEffect(() => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    if (!isNaN(entry) && !isNaN(exit) && entry > 0) {
      const percent = ((exit - entry) / entry) * 100;
      const dollar = exit - entry;
      setGainLossPercent(parseFloat(percent.toFixed(2)));
      setGainLossDollar(parseFloat(dollar.toFixed(2)));
    } else {
      setGainLossPercent(null);
      setGainLossDollar(null);
    }
  }, [entryPrice, exitPrice]);

  const handleSave = () => {
    const entry: Omit<JournalEntry, 'id'> = {
      symbol,
      scanName,
      scanId: journalTarget?.scanId ?? '',
      pvsScore: defaultPVS,
      sectorStrength: defaultSectorStrength,
      entryPrice,
      exitPrice,
      gainLossPercent,
      gainLossDollar,
      outcome,
      notes,
      emotions,
      whatWorked,
      whatDidnt,
      tags,
      timestamp: journalTarget?.timestamp ?? Date.now(),
      createdAt: Date.now(), 
    };

    onSave(entry);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[#1E1E1E] text-white shadow-lg transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-[#2A2A2A]">
        <h2 className="text-lg font-semibold">New Journal Entry</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-[#B0B0B0]" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <Input label="Symbol" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} />
        <Input label="Scan Name" value={scanName} onChange={e => setScanName(e.target.value)} />

        {defaultPVS !== undefined && (
          <p className="text-sm text-gray-400">PVS Score: <span className="text-white">{defaultPVS}</span></p>
        )}
        {defaultSectorStrength !== undefined && (
          <p className="text-sm text-gray-400">Sector Strength: <span className="text-white">{defaultSectorStrength}%</span></p>
        )}

        <div className="flex gap-2">
          <Input label="Entry Price" type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
          <Input label="Exit Price" type="number" value={exitPrice} onChange={e => setExitPrice(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Input label="Gain/Loss %" type="text" value={gainLossPercent !== null ? `${gainLossPercent}%` : ''} readOnly />
          <Input label="Gain/Loss $" type="text" value={gainLossDollar !== null ? `$${gainLossDollar}` : ''} readOnly />
        </div>

        <div className="flex gap-4 items-center">
          <span className="text-sm text-[#B0B0B0]">Outcome:</span>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" checked={outcome === 'win'} onChange={() => setOutcome('win')} />
            Win
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" checked={outcome === 'loss'} onChange={() => setOutcome('loss')} />
            Loss
          </label>
        </div>

        <textarea
          className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl text-sm text-white px-3 py-2"
          placeholder="What were your emotions or thoughts?"
          value={emotions}
          onChange={e => setEmotions(e.target.value)}
          rows={2}
        />

        <textarea
          className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl text-sm text-white px-3 py-2"
          placeholder="What worked well in this trade?"
          value={whatWorked}
          onChange={e => setWhatWorked(e.target.value)}
          rows={2}
        />

        <textarea
          className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl text-sm text-white px-3 py-2"
          placeholder="What didn’t work or went wrong?"
          value={whatDidnt}
          onChange={e => setWhatDidnt(e.target.value)}
          rows={2}
        />

        <textarea
          className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl text-sm text-white px-3 py-2"
          placeholder="Additional Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />

        <div className="space-y-2">
          <span className="text-sm text-white">Tags:</span>
          <div className="flex flex-wrap gap-2">
            {predefinedTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  tags.includes(tag)
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-[#2A2A2A] text-[#B0B0B0] hover:bg-[#2A2A2A]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} fullWidth>
            Save Entry
          </Button>
        </div>

        {showSuccess && (
          <p className="text-green-500 text-sm text-center mt-2">✅ Entry saved successfully!</p>
        )}
      </div>
    </div>
  );
};

export default JournalDrawer;
