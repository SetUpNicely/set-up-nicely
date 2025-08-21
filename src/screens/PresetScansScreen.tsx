// 📁 Location: /src/screens/PresetScansScreen.tsx
import React, { useEffect, useState } from 'react';
import { presetScans } from 'shared/data/presetScans';
import { useUser } from '@context/UserContext';
import { useScanRunner } from '@context/ScanRunnerContext';
import PVSBadge from '@components/PVSBadge';
import ConfidenceTooltip from '@components/confidenceTooltip';
import Button from '@components/Button';
import { firestore } from '@services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import ScanResultsModal from '@components/ScanResultsModal';
import { ScanMatchResult } from '@shared/data/ScanTypes';
import { getScanAvgPVS } from '@services/getScanAvgPVS';

const PresetScansScreen = () => {
  const { role, userSettings, firebaseUser } = useUser();
  const {
    startScan,
    stopScan,
    isRunning,
    results,
  } = useScanRunner();

  const [sortBy, setSortBy] = useState<'pvs' | 'confidence'>('pvs');
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [pvsScores, setPvsScores] = useState<Record<string, number>>({});

  // ✅ Load average PVS from Firestore
  useEffect(() => {
    const loadAvgPVS = async () => {
      const scores: Record<string, number> = {};
      for (const scan of presetScans) {
        const avg = await getScanAvgPVS(scan.id, undefined);
        if (typeof avg === 'number') {
          scores[scan.id] = avg;
        }
      }
      setPvsScores(scores);
    };
    loadAvgPVS();
  }, []);

  const visibleScans = presetScans.filter((scan) => {
    return (
      role === 'pro' ||
      (role === 'paid' && scan.tier !== 'pro') ||
      (role === 'free' && scan.tier === 'free')
    );
  });

  const sortedScans = [...visibleScans].sort((a, b) => {
    const aScore = pvsScores[a.id] ?? 0;
    const bScore = pvsScores[b.id] ?? 0;
    const aConf = userSettings?.useConfidenceScore ? a.confidenceScore ?? aScore : aScore;
    const bConf = userSettings?.useConfidenceScore ? b.confidenceScore ?? bScore : bScore;
    return sortBy === 'confidence' ? bConf - aConf : bScore - aScore;
  });

  const handleSaveScan = async (scan: typeof presetScans[number]) => {
    if (!firebaseUser) return;
    try {
      await savePresetScanToUser(firebaseUser.uid, scan);
      alert('✅ Scan saved to your account.');
    } catch (err) {
      console.error('Error saving preset scan:', err);
      alert('❌ Failed to save scan.');
    }
  };

  const toggleScan = (scan: typeof presetScans[number]) => {
    if (isRunning(scan.id)) {
      stopScan(scan.id);
    } else {
      startScan(scan.id, 'preset', scan, scan.timeframe);
    }
  };

  const openResults = (scanId: string) => {
    setSelectedScanId(scanId);
    setResultsOpen(true);
  };

  const formatTierLabel = (tier: 'free' | 'paid' | 'pro') => {
    if (tier === 'pro') return '🧠 Pro Tier';
    if (tier === 'paid') return '💼 Paid Tier';
    return '🌱 Free Tier';
  };

  const selectedResults: ScanMatchResult[] =
    (selectedScanId && results[selectedScanId]) || [];

  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-400">Preset Scans</h1>
          <select
            className="bg-[#1E1E1E] text-white px-3 py-1 rounded border border-[#2A2A2A]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'pvs' | 'confidence')}
          >
            <option value="pvs">Sort by PVS</option>
            <option value="confidence">Sort by Confidence</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
          {sortedScans.map((scan) => {
            const currentlyRunning = isRunning(scan.id);
            const name = scan.name || scan.id || 'Unnamed';
            const pvsScore = pvsScores[scan.id] ?? 0;
            const confidenceScore = scan.confidenceScore ?? 0;
            const showConfidence = userSettings?.useConfidenceScore;

            return (
              <div
                key={scan.id}
                className="bg-[#1E1E1E] p-4 rounded-2xl shadow-lg border border-[#2A2A2A] hover:bg-[#2A2A2A] transition relative"
              >
                <div className="absolute top-2 right-2 text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full">
                  PRESET
                </div>

                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-white">{name}</h2>
                  <div
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      scan.direction === 'bullish'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {scan.direction.toUpperCase()}
                  </div>
                </div>

                <p className="text-sm text-[#B0B0B0] mb-2">{scan.description}</p>

                <div className="flex items-center gap-2 text-sm">
                  <div title={pvsScore === 0 ? 'No PVS score yet' : undefined}>
                    <PVSBadge score={pvsScore} />
                  </div>

                  {showConfidence && (
                    <div title={confidenceScore === 0 ? 'No Confidence score yet' : undefined}>
                      <ConfidenceTooltip score={confidenceScore} />
                    </div>
                  )}

                  {scan.sectorHotToday && (
                    <span className="bg-yellow-400 text-black text-xs font-medium px-2 py-0.5 rounded-full">
                      🔥 Hot Sector
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#B0B0B0] mt-3 mb-3">
                  {formatTierLabel(scan.tier)} • {scan.timeframe} TF
                </div>

                <div className="flex gap-2 mt-2">
                  <Button variant="primary" onClick={() => toggleScan(scan)}>
                    {currentlyRunning ? 'Running' : 'Run Scan'}
                  </Button>
                  <Button variant="secondary" onClick={() => openResults(scan.id)}>
                    View Results
                  </Button>
                  <Button variant="secondary" onClick={() => handleSaveScan(scan)}>
                    Save Scan
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ScanResultsModal
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        scanName="Preset Scan"
        results={selectedResults}
        loading={false}
      />
    </div>
  );
};

export default PresetScansScreen;

async function savePresetScanToUser(userId: string, scan: typeof presetScans[number]) {
  const scanId = `${userId}_${scan.id}`;
  const scanDocRef = doc(firestore, 'users', userId, 'customScans', scanId);

  await setDoc(scanDocRef, {
    ...scan,
    id: scanId,
    createdBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preset: true,
  });
}
