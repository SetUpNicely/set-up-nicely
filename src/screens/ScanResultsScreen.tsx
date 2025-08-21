// 📁 /src/screens/ScanResultsScreen.tsx
import React, { useEffect, useState } from 'react';
import { getUserScanResults } from '@services/dbService';
import { saveJournalEntry } from '@services/JournalService';
import { useUser } from '@context/UserContext';
import { useJournal } from '@context/JournalContext';
import { ScanMatchResult } from '@shared/data/ScanTypes';
import TriggerCard from '@components/TriggerCard';
import { Toggle } from '@components/Toggle';
import MiniChart from '@components/MiniChart';
import JournalDrawer from '@components/JournalDrawer';
import { JournalEntry } from '@data/JournalTypes';
import { getTickerPVS } from '@services/getTickerPVS';

const ScanResultsScreen = () => {
  const { firebaseUser, userSettings } = useUser();
  const { openJournal, isDrawerOpen, journalTarget, closeJournal } = useJournal();

  const [results, setResults] = useState<ScanMatchResult[]>([]);
  const [sortBy, setSortBy] = useState<'pvs' | 'confidence'>('pvs');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minPVS, setMinPVS] = useState(userSettings.minPVS ?? 50);
  const [filterHotSectors, setFilterHotSectors] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (firebaseUser?.uid) {
      setIsLoading(true);
      getUserScanResults(firebaseUser.uid).then(async (rawResults) => {
        const dateStr = new Date().toISOString().split('T')[0];

        // Look up avg PVS for each result
        const enhanced = await Promise.all(
          rawResults.map(async (r) => {
            const avgScore = await getTickerPVS(r.scanId, r.symbol, dateStr);
            return { ...r, avgPVS: avgScore };
          })
        );

        setResults(enhanced);
        setIsLoading(false);
      });
    }
  }, [firebaseUser]);

  const now = new Date();

  const filtered = results
    .filter((r) => (r.pvsScore ?? 0) >= minPVS)
    .filter((r) => {
      const resultDate = new Date(r.timestamp);
      if (dateRange === 'today') return resultDate.toDateString() === now.toDateString();
      if (dateRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return resultDate >= oneWeekAgo;
      }
      return true;
    })
    .filter((r) => (filterHotSectors ? r.sectorHotToday : true));

  const sorted = [...filtered].sort((a, b) => {
    const aScore = sortBy === 'confidence' ? a.confidenceScore ?? a.pvsScore ?? 0 : a.pvsScore ?? 0;
    const bScore = sortBy === 'confidence' ? b.confidenceScore ?? b.pvsScore ?? 0 : b.pvsScore ?? 0;
    return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
  });

  const handleSave = async (entry: Omit<JournalEntry, 'id'>) => {
    if (!firebaseUser?.uid) return;
    try {
      await saveJournalEntry(entry);
      closeJournal();
      alert('Journal entry saved!');
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Scan Results</h1>
        <div className="space-x-4 flex items-center flex-wrap">
          <label className="text-sm">Min PVS:</label>
          <input
            type="number"
            value={minPVS}
            onChange={(e) => setMinPVS(parseInt(e.target.value))}
            className="w-16 text-black px-2 py-1 rounded"
            min={0}
            max={100}
          />

          <label className="text-sm">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'pvs' | 'confidence')}
            className="bg-gray-800 text-white px-2 py-1 rounded"
          >
            <option value="pvs">PVS Score</option>
            <option value="confidence">Confidence Score</option>
          </select>

          <label className="text-sm">Direction:</label>
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
            className="bg-gray-800 text-white px-2 py-1 rounded"
          >
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </select>

          <label className="text-sm">Hot Sector:</label>
          <Toggle
            isOn={filterHotSectors}
            onToggle={() => setFilterHotSectors(!filterHotSectors)}
          />

          <label className="text-sm">Date:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'all')}
            className="bg-gray-800 text-white px-2 py-1 rounded"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400">Loading results...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-gray-400">No matching scan results found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((result) => (
            <div
              key={`${result.scanId ?? result.symbol}-${result.symbol}-${result.timestamp}`}
              onClick={() => openJournal(result)}
              role="button"
              className="cursor-pointer"
              title={
                sortBy === 'confidence' && result.confidenceScore === undefined
                  ? 'No confidence score yet'
                  : sortBy === 'pvs' && result.pvsScore === undefined
                  ? 'No PVS score yet'
                  : ''
              }
            >
              <TriggerCard result={result} />
              <MiniChart
                symbol={result.symbol}
                timestamp={result.timestamp}
                timeframe={result.timeframe ?? '1m'}
              />
            </div>
          ))}
        </div>
      )}

      <JournalDrawer
        isOpen={isDrawerOpen}
        onClose={closeJournal}
        onSave={handleSave}
        defaultSymbol={journalTarget?.symbol}
        defaultScanName={journalTarget?.scanName}
        defaultPVS={journalTarget?.pvsScore}
        defaultSectorStrength={journalTarget?.sectorStrength}
      />
    </div>
  );
};

export default ScanResultsScreen;
