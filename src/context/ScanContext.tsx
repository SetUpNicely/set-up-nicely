import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScanResult {
  symbol: string;
  pvs: number;
  confidenceScore?: number;
  sector?: string;
  timestamp: number;
}

interface ScanContextType {
  selectedScanId: string | null;
  setSelectedScanId: (id: string | null) => void;
  scanResults: ScanResult[];
  setScanResults: (results: ScanResult[]) => void;
  sectorFilter: string | null;
  setSectorFilter: (sector: string | null) => void;
  confidenceEnabled: boolean;
  setConfidenceEnabled: (enabled: boolean) => void;
}

const defaultContext: ScanContextType = {
  selectedScanId: null,
  setSelectedScanId: () => {},
  scanResults: [],
  setScanResults: () => {},
  sectorFilter: null,
  setSectorFilter: () => {},
  confidenceEnabled: false,
  setConfidenceEnabled: () => {},
};

const ScanContext = createContext<ScanContextType>(defaultContext);

export const useScanContext = () => useContext(ScanContext);

export const ScanProvider = ({ children }: { children: ReactNode }) => {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [confidenceEnabled, setConfidenceEnabled] = useState(false);

  return (
    <ScanContext.Provider
      value={{
        selectedScanId,
        setSelectedScanId,
        scanResults,
        setScanResults,
        sectorFilter,
        setSectorFilter,
        confidenceEnabled,
        setConfidenceEnabled,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

