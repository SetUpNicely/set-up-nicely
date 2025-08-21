//context/JournalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define flexible journal target type
export interface JournalTarget {
  symbol: string;
  scanId?: string;
  scanName?: string;
  pvsScore?: number;
  sectorStrength?: number;
  gainLossPercent?: number;
  gainLossDollars?: number;
  notes?: string;
  timeframe?: string;
  timestamp?: number; // ✅ Added to fix JournalDrawer reference
}

// Context interface
interface JournalContextType {
  journalTarget: JournalTarget | null;
  isDrawerOpen: boolean;
  openJournal: (target: JournalTarget) => void;
  closeJournal: () => void;
}

// Default context value
const JournalContext = createContext<JournalContextType>({
  journalTarget: null,
  isDrawerOpen: false,
  openJournal: () => {},
  closeJournal: () => {},
});

// Hook
export const useJournal = () => useContext(JournalContext);

// Provider
export const JournalProvider = ({ children }: { children: ReactNode }) => {
  const [journalTarget, setJournalTarget] = useState<JournalTarget | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const openJournal = (target: JournalTarget) => {
    setJournalTarget(target);
    setDrawerOpen(true);
  };

  const closeJournal = () => {
    setJournalTarget(null);
    setDrawerOpen(false);
  };

  return (
    <JournalContext.Provider
      value={{
        journalTarget,
        isDrawerOpen,
        openJournal,
        closeJournal,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};
