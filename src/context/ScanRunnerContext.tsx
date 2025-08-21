// 📁 /src/context/ScanRunnerContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@services/firebase';
import { ScanMatchResult } from '@shared/data/ScanTypes';
import { Timeframe } from '@shared/data/Timeframe';

type ScanType = 'preset' | 'custom';

interface RunningScan {
  id: string;
  type: ScanType;
  timeframe: Timeframe;
  interval: NodeJS.Timeout;
}

interface ScanRunnerContextType {
  runningScanIds: string[];
  results: Record<string, ScanMatchResult[]>;
  startScan: (
    scanId: string,
    type: ScanType,
    scanLogic: any,
    timeframe: Timeframe,
    onResult?: (results: ScanMatchResult[]) => void
  ) => void;
  stopScan: (scanId: string) => void;
  stopAllScans: () => void;
  isRunning: (scanId: string) => boolean;
}

const ScanRunnerContext = createContext<ScanRunnerContextType>({
  runningScanIds: [],
  results: {},
  startScan: () => {},
  stopScan: () => {},
  stopAllScans: () => {},
  isRunning: () => false,
});

export const useScanRunner = () => useContext(ScanRunnerContext);

export const ScanRunnerProvider = ({ children }: { children: ReactNode }) => {
  const [runningScanIds, setRunningScanIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ScanMatchResult[]>>({});
  const intervals = useRef<Record<string, NodeJS.Timeout>>({});

  const getTopTickers = async (): Promise<string[]> => {
    return ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA'];
  };

  const runScanCycle = useCallback(
    async (
      scanId: string,
      type: ScanType,
      logic: any,
      timeframe: Timeframe,
      onResult?: (results: ScanMatchResult[]) => void
    ) => {
      try {
        const tickers = await getTopTickers();
        const functions = await getFirebaseFunctions();
        const fnName = type === 'preset' ? 'runPresetScans' : 'runCustomScan';
        const runScan = httpsCallable(functions, fnName);

        const payload =
          type === 'preset'
            ? { ...logic, tickers }
            : { scan: { id: scanId, name: scanId, logic, timeframe }, tickers };

        const res = await runScan(payload);
        const matched = res.data as ScanMatchResult[];

        setResults((prev) => ({ ...prev, [scanId]: matched }));
        if (onResult) onResult(matched);
      } catch (err) {
        console.error(`Scan ${scanId} failed:`, err);
      }
    },
    []
  );

  const startScan = useCallback(
    (
      scanId: string,
      type: ScanType,
      logic: any,
      timeframe: Timeframe,
      onResult?: (results: ScanMatchResult[]) => void
    ) => {
      if (intervals.current[scanId]) return; // Already running

      setRunningScanIds((prev) => [...prev, scanId]);
      runScanCycle(scanId, type, logic, timeframe, onResult);

      const interval = setInterval(() => {
        runScanCycle(scanId, type, logic, timeframe, onResult);
      }, 60_000);

      intervals.current[scanId] = interval;
    },
    [runScanCycle]
  );

  const stopScan = useCallback((scanId: string) => {
    const interval = intervals.current[scanId];
    if (interval) {
      clearInterval(interval);
      delete intervals.current[scanId];
      setRunningScanIds((prev) => prev.filter((id) => id !== scanId));
    }
  }, []);

  const stopAllScans = useCallback(() => {
    Object.keys(intervals.current).forEach((id) => {
      clearInterval(intervals.current[id]);
    });
    intervals.current = {};
    setRunningScanIds([]);
  }, []);

  const isRunning = useCallback((scanId: string) => {
    return !!intervals.current[scanId];
  }, []);

  useEffect(() => {
    return () => {
      stopAllScans(); // Clean up on unmount
    };
  }, [stopAllScans]);

  return (
    <ScanRunnerContext.Provider
      value={{
        runningScanIds,
        results,
        startScan,
        stopScan,
        stopAllScans,
        isRunning,
      }}
    >
      {children}
    </ScanRunnerContext.Provider>
  );
};
