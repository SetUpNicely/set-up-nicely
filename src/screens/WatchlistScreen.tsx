// 📁 /src/screens/WatchlistScreen.tsx
import React, { useEffect, useState } from 'react';
import { useUser } from '@context/UserContext';
import { useJournal } from '@context/JournalContext';
import { firestore } from '@services/firebase';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ScanMatchResult } from '@shared/data/ScanTypes';
import MiniChart from '@components/MiniChart';
import { Toggle } from '@components/Toggle';
import JournalDrawer from '@components/JournalDrawer';
import { saveJournalEntry } from '@services/JournalService';

interface WatchlistEntry {
  symbol: string;
  notes?: string;
  alertsEnabled?: boolean;
}

const WatchlistScreen = () => {
  const { firebaseUser } = useUser();
  const { openJournal, closeJournal, isDrawerOpen, journalTarget } = useJournal();

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [triggered, setTriggered] = useState<Record<string, ScanMatchResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterHot, setFilterHot] = useState(false);
  const [filterHighPVS, setFilterHighPVS] = useState(false);
  const [newTicker, setNewTicker] = useState('');

  useEffect(() => {
    if (!firebaseUser) return;

    const watchlistRef = collection(firestore, 'users', firebaseUser.uid, 'watchlist');
    const unsubscribe = onSnapshot(watchlistRef, (snapshot) => {
      const data: WatchlistEntry[] = snapshot.docs.map((doc) => ({
        symbol: doc.id,
        ...(doc.data() as any),
      }));
      setWatchlist(data);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser || watchlist.length === 0) return;

    const timeout = setTimeout(async () => {
      const allTriggers: Record<string, ScanMatchResult[]> = {};

      for (const entry of watchlist) {
        const resultSnap = await getDocs(
          collection(firestore, 'users', firebaseUser.uid, 'triggers', entry.symbol, 'results')
        );
        allTriggers[entry.symbol] = resultSnap.docs.map((d) => d.data() as ScanMatchResult);
      }

      setTriggered(allTriggers);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [watchlist, firebaseUser]);

  const handleAddTicker = async () => {
    const symbol = newTicker.trim().toUpperCase();
    if (!symbol || !firebaseUser) return;
    await setDoc(doc(firestore, 'users', firebaseUser.uid, 'watchlist', symbol), {
      alertsEnabled: true,
    });
    setNewTicker('');
  };

  const handleDelete = async (symbol: string) => {
    if (!firebaseUser) return;
    await deleteDoc(doc(firestore, 'users', firebaseUser.uid, 'watchlist', symbol));
  };

  const handleToggleAlert = async (symbol: string, current: boolean) => {
    if (!firebaseUser) return;
    await setDoc(
      doc(firestore, 'users', firebaseUser.uid, 'watchlist', symbol),
      { alertsEnabled: !current },
      { merge: true }
    );
  };

  const handleSaveJournal = async (entry: Omit<any, 'id'>) => {
    if (!firebaseUser?.uid) return;
    try {
      await saveJournalEntry(entry);
      closeJournal();
      alert('Journal entry saved!');
    } catch (err) {
      console.error('Error saving journal entry:', err);
    }
  };

  const applyFilters = (entry: WatchlistEntry) => {
    const scans = triggered[entry.symbol] || [];
    let passes = true;
    if (filterHot) passes = scans.some((r) => r.sectorHotToday);
    if (filterHighPVS) passes = passes && scans.some((r) => (r.pvsScore ?? 0) >= 70);
    return passes;
  };

  const formatAgo = (timestamp: number): string => {
    const delta = Math.floor((Date.now() - timestamp) / 1000);
    if (delta < 60) return `${delta}s ago`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return `${Math.floor(delta / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">My Watchlist</h1>

      <div className="flex flex-wrap gap-6 items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">🔥 Hot Sector Only</span>
          <Toggle isOn={filterHot} onToggle={() => setFilterHot(!filterHot)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">📈 High PVS (≥ 70)</span>
          <Toggle isOn={filterHighPVS} onToggle={() => setFilterHighPVS(!filterHighPVS)} />
        </div>

        <div className="flex gap-2 items-center">
          <input
            className="bg-gray-800 text-white px-3 py-1 rounded"
            placeholder="Add Ticker"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTicker()}
          />
          <button
            onClick={handleAddTicker}
            className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
          >
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400">Loading watchlist...</div>
      ) : watchlist.length === 0 ? (
        <div className="text-center text-gray-500">No tickers in your watchlist yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {watchlist.filter(applyFilters).map((entry) => {
            const scans = (triggered[entry.symbol] || []).sort((a, b) => b.timestamp - a.timestamp);
            return (
              <div
                key={entry.symbol}
                className="bg-[#1E1E1E] rounded-xl p-4 shadow border border-[#2A2A2A] space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold text-white">{entry.symbol}</div>
                  <button
                    onClick={() => handleDelete(entry.symbol)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Alerts Enabled</span>
                  <Toggle
                    isOn={entry.alertsEnabled ?? true}
                    onToggle={() => handleToggleAlert(entry.symbol, entry.alertsEnabled ?? true)}
                  />
                </div>

                {scans.length > 0 ? (
                  <div className="space-y-2">
                    {scans.map((scan) => (
                      <div key={`${scan.scanId}-${scan.timestamp}`} className="space-y-1">
                        <div className="text-xs text-gray-400 mb-1 flex justify-between items-center">
                          <span>
                            {scan.scanName ?? scan.scanId ?? 'Unnamed Scan'} • {formatAgo(scan.timestamp)}
                          </span>
                          <button
                            onClick={() => openJournal(scan)}
                            className="text-blue-400 text-xs hover:underline"
                          >
                            Add Journal
                          </button>
                        </div>
                        <MiniChart
                          symbol={entry.symbol}
                          timestamp={scan.timestamp}
                          timeframe={scan.timeframe ?? '1m'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No active triggers</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <JournalDrawer
        isOpen={isDrawerOpen}
        onClose={closeJournal}
        onSave={handleSaveJournal}
        defaultSymbol={journalTarget?.symbol}
        defaultScanName={journalTarget?.scanName}
        defaultPVS={journalTarget?.pvsScore}
        defaultSectorStrength={journalTarget?.sectorStrength}
      />
    </div>
  );
};

export default WatchlistScreen;
