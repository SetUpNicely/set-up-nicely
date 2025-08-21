// 📁 /src/screens/SavedScansScreen.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@context/UserContext';
import { useJournal } from '@context/JournalContext';
import { useScanRunner } from '@context/ScanRunnerContext';
import { firestore } from '@services/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import Button from '@components/Button';
import ScanCard from '@components/ScanCard';
import ScanResultsModal from '@components/ScanResultsModal';
import { Timeframe } from '@shared/data/Timeframe';
import { ScanMatchResult } from '@shared/data/ScanTypes';
import { presetScans } from '@shared/data/presetScans';
import PVSBadge from '@components/PVSBadge';

interface CustomScan {
  id: string;
  name: string;
  description?: string;
  timeframe: Timeframe;
  logic: Record<string, any>;
  direction?: 'bullish' | 'bearish';
  isPreset?: boolean;
}

export default function SavedScansScreen() {
  const { firebaseUser } = useUser();
  const { openJournal } = useJournal();
  const navigate = useNavigate();
  const {
    startScan,
    stopScan,
    isRunning,
    results,
  } = useScanRunner();

  const [customScans, setCustomScans] = useState<CustomScan[]>([]);
  const [averagePVSMap, setAveragePVSMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<CustomScan | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;

    const fetchScans = async () => {
      try {
        const ref = collection(firestore, 'users', firebaseUser.uid, 'customScans');
        const snapshot = await getDocs(ref);
        const scans = snapshot.docs.map(doc => {
          const data = doc.data();
          const isPreset = !!presetScans.find((preset) => preset.id === data.id || preset.id === doc.id);
          return { id: doc.id, ...data, isPreset } as CustomScan;
        });
        setCustomScans(scans);

        // Fetch long-term average PVS per scan
        const newAvgMap: Record<string, number> = {};

        for (const scan of scans) {
          const scanId = scan.id;
          if (scan.isPreset) {
            // Fetch all pvs/{preset_scanId_symbol} docs and average
            const presetDocs = await getDocs(collection(firestore, 'pvs'));
            const matchingDocs = presetDocs.docs.filter(d => d.id.startsWith(`${scanId}_`));
            const scores = matchingDocs.map(d => d.data().pvsScore ?? 0);
            const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            newAvgMap[scanId] = avg;
          } else {
            // Custom scan → from users/{uid}/pvsScores/{scanId}
            const docRef = doc(firestore, 'users', firebaseUser.uid, 'pvsScores', scanId);
            const snap = await getDoc(docRef);
            const score = snap.exists() ? snap.data().score ?? 0 : 0;
            newAvgMap[scanId] = Math.round(score);
          }
        }

        setAveragePVSMap(newAvgMap);
      } catch (err) {
        console.error('Failed to fetch saved scans or PVS:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [firebaseUser]);

  const handleDelete = async (scanId: string) => {
    if (!firebaseUser) return;
    const confirm = window.confirm('Are you sure you want to delete this scan?');
    if (!confirm) return;

    try {
      await deleteDoc(doc(firestore, 'users', firebaseUser.uid, 'customScans', scanId));
      setCustomScans(prev => prev.filter(s => s.id !== scanId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleEdit = (scanId: string) => {
    navigate(`/scan-builder?edit=${scanId}`);
  };

  const runScanOnce = (scan: CustomScan) => {
    setSelectedScan(scan);
    setResultsOpen(true);
    startScan(scan.id, 'custom', scan, scan.timeframe);
  };

  const toggleContinuousRun = (scan: CustomScan) => {
    if (isRunning(scan.id)) {
      stopScan(scan.id);
    } else {
      setSelectedScan(scan);
      setResultsOpen(true);
      startScan(scan.id, 'custom', scan, scan.timeframe);
    }
  };

  const handleJournal = () => {
    if (!selectedScan || !results[selectedScan.id]?.length) return;
    const firstResult = results[selectedScan.id][0];
    openJournal({
      symbol: firstResult.symbol,
      notes: `Scan: ${selectedScan.name || selectedScan.id}`,
    });
  };

  return (
    <div className="p-6 bg-[#121212] min-h-screen text-white">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">Saved Scans</h1>

      {loading ? (
        <p className="text-gray-400">Loading scans...</p>
      ) : customScans.length === 0 ? (
        <p className="text-gray-500">No saved scans found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {customScans.map(scan => {
            const displayName = scan.name || scan.id || 'Unnamed';
            const pvsScore = averagePVSMap[scan.id] ?? 0;
            return (
              <ScanCard
                key={scan.id}
                scan={{ ...scan, name: displayName }}
                footer={
                  <div className="mt-2">
                    <PVSBadge score={pvsScore} />
                  </div>
                }
                actions={
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      onClick={() => runScanOnce(scan)}
                    >
                      Run Now
                    </Button>
                    <Button
                      variant={isRunning(scan.id) ? 'danger' : 'secondary'}
                      onClick={() => toggleContinuousRun(scan)}
                    >
                      {isRunning(scan.id) ? 'Stop' : 'Run Continuously'}
                    </Button>
                    <Button variant="secondary" onClick={() => handleEdit(scan.id)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(scan.id)}>
                      Delete
                    </Button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      {selectedScan && (
        <ScanResultsModal
          open={resultsOpen}
          onClose={() => {
            setResultsOpen(false);
            stopScan(selectedScan.id);
          }}
          scanName={selectedScan.name || selectedScan.id || 'Unnamed'}
          results={results[selectedScan.id] || []}
          loading={false}
        />
      )}

      {selectedScan && results[selectedScan.id]?.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleJournal} variant="primary">
            Journal First Result
          </Button>
        </div>
      )}
    </div>
  );
}
