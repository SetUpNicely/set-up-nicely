// 📁 /src/screens/JournalScreen.tsx
import React, { useEffect, useState } from 'react';
import { useUser } from '@context/UserContext';
import { dbService, checkJournalLimit } from '@services/dbService';
import JournalDrawer from '@components/JournalDrawer';
import JournalEntry from '@components/JournalEntry';
import Button from '@components/Button';
import { JournalEntry as EntryType } from '@data/JournalTypes';

const JournalScreen = () => {
  const { firebaseUser, role } = useUser();
  const [entries, setEntries] = useState<EntryType[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [editEntry, setEditEntry] = useState<EntryType | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // NEW

  useEffect(() => {
    fetchEntries();
  }, [firebaseUser, sortOrder]); // sortOrder triggers re-fetch

  const fetchEntries = async () => {
    if (!firebaseUser) return;
    setLoading(true);

    const raw = await dbService.getJournalEntries(firebaseUser.uid);
    const normalized = raw
      .map((e): EntryType => ({
        id: e.id ?? '',
        symbol: e.symbol ?? '',
        scanName: e.scanName ?? '',
        scanId: e.scanId ?? '',
        pvsScore: e.pvsScore ?? null,
        sectorStrength: e.sectorStrength ?? null,
        entryPrice: e.entryPrice ?? '',
        exitPrice: e.exitPrice ?? '',
        gainLossPercent: e.gainLossPercent ?? null,
        gainLossDollar: e.gainLossDollar ?? null,
        outcome: e.outcome ?? '',
        notes: e.notes ?? '',
        emotions: e.emotions ?? '',
        whatWorked: e.whatWorked ?? '',
        whatDidnt: e.whatDidnt ?? '',
        tags: Array.isArray(e.tags) ? e.tags : [],
        createdAt: e.createdAt ?? 0,
        timestamp: e.timestamp ?? e.createdAt ?? 0,
      }))
      .sort((a, b) =>
        sortOrder === 'desc'
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp
      );

    setEntries(normalized);
    setLoading(false);

    if (role === 'free') {
      const limitHit = await checkJournalLimit(firebaseUser.uid);
      setLimitReached(limitHit);
    }
  };

  const handleEntryAdded = () => {
    setDrawerOpen(false);
    setEditEntry(null);
    fetchEntries();
  };

  const handleEdit = (entry: EntryType) => {
    setEditEntry(entry);
    setDrawerOpen(true);
  };

  const total = entries.length;
  const wins = entries.filter(e => e.outcome === 'win').length;
  const losses = entries.filter(e => e.outcome === 'loss').length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const avgGain = (
    entries.reduce((acc, e) => acc + (e.gainLossPercent ?? 0), 0) / total || 0
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Trading Journal</h1>

        <div className="flex gap-3">
          <select
            className="bg-[#1E1E1E] border border-[#2A2A2A] text-sm text-white px-3 py-2 rounded-lg"
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value === 'asc' ? 'asc' : 'desc')
            }
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          <Button
            onClick={() => {
              setEditEntry(null);
              setDrawerOpen(true);
            }}
            disabled={role === 'free' && limitReached}
          >
            {limitReached ? 'Upgrade to Add More' : 'Add Entry'}
          </Button>
        </div>
      </div>

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 mb-6 flex flex-wrap gap-4 text-sm text-[#B0B0B0]">
        <span>Total Entries: <span className="text-white font-semibold">{total}</span></span>
        <span>Win Rate: <span className="text-green-400 font-semibold">{winRate}%</span></span>
        <span>Avg Gain/Loss: <span className="text-yellow-300 font-semibold">{avgGain}%</span></span>
      </div>

      {loading ? (
        <div className="text-center text-[#B0B0B0]">Loading journal entries...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-[#B0B0B0] mt-10 animate-fadeIn">
          No entries yet. Use the{' '}
          <span className="text-red-400 font-medium">“Add Entry”</span>{' '}
          button to start tracking your trades and setups.
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          {entries.map((entry) => (
            <div key={entry.timestamp} onClick={() => handleEdit(entry)} role="button">
              <JournalEntry
                entry={{
                  ...entry,
                  outcome: entry.outcome === '' ? undefined : entry.outcome,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <JournalDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditEntry(null);
        }}
        onSave={handleEntryAdded}
        defaultSymbol={editEntry?.symbol}
        defaultScanName={editEntry?.scanName}
        defaultPVS={editEntry?.pvsScore}
        defaultSectorStrength={editEntry?.sectorStrength}
      />
    </div>
  );
};

export default JournalScreen;
