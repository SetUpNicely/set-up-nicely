// 📁 src/screens/DashboardScreen.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@context/UserContext";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseApp } from "@services/firebase";
import Button from "@components/Button";
import PVSBadge from "@components/PVSBadge";
import ConfidenceTooltip from "@components/confidenceTooltip";

const DashboardScreen = () => {
  const { firebaseUser, role, userSettings } = useUser();
  const navigate = useNavigate();

  const [topScans, setTopScans] = useState<any[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const db = getFirestore(firebaseApp);
    const ref = doc(db, "market/highlights/daily", today);

    getDoc(ref)
      .then((docSnap) => {
        if (docSnap.exists()) {
          setTopScans(docSnap.data().topTriggers || []);
        }
      })
      .catch((err) => console.error("🔥 Failed to load highlights", err))
      .finally(() => setLoadingHighlights(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 animate-fadeIn">
      <h1 className="text-3xl font-bold text-blue-400 mb-4">
        Welcome, {firebaseUser?.email || "Guest"}
      </h1>

      <p className="mb-6 text-[#B0B0B0]">
        Your role: <span className="font-semibold text-white">{role}</span>
      </p>

      <div className="space-y-6">
        {/* ✅ Quick Navigation Panel */}
        <div className="bg-[#1E1E1E] rounded-2xl p-6 shadow animate-fadeIn">
          <h2 className="text-xl font-semibold text-green-400 mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate("/preset-scans")}>Preset Scans</Button>
            <Button onClick={() => navigate("/scan-builder")}>Scan Builder</Button>
            <Button onClick={() => navigate("/scan-results")}>Scan Results</Button>
            <Button onClick={() => navigate("/saved-scans")}>Saved Scans</Button>
            <Button onClick={() => navigate("/watchlist")}>Watchlist</Button>
            <Button onClick={() => navigate("/journal")}>Journal</Button>
            <Button onClick={() => navigate("/settings")}>Settings</Button>
          </div>
        </div>

        {/* ✅ Next Steps Panel */}
        <div className="bg-[#1E1E1E] rounded-2xl p-6 shadow animate-fadeIn">
          <h2 className="text-xl font-semibold text-yellow-400 mb-3">Next Steps</h2>
          <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
            <li>Build a custom scan using the Scan Builder</li>
            <li>View triggered scans in the Live Feed</li>
            <li>Log recent trades in your Journal</li>
          </ul>
        </div>

        {/* 🔥 Top Scans Today Panel */}
        <div className="bg-[#1E1E1E] rounded-2xl p-6 shadow animate-fadeIn">
          <h2 className="text-xl font-semibold text-red-400 mb-3">🔥 Top Scans Today</h2>
          {loadingHighlights ? (
            <p className="text-sm text-gray-400">Loading highlights...</p>
          ) : topScans.length === 0 ? (
            <p className="text-sm text-gray-400">No top scans found for today yet.</p>
          ) : (
            <ul className="space-y-3">
              {topScans.slice(0, 5).map((scan, index) => (
                <li
                  key={index}
                  className="bg-[#2A2A2A] p-3 rounded-lg flex justify-between items-center hover:bg-[#333]"
                >
                  <div>
                    <div className="text-white font-medium">
                      {scan.scanName || scan.id || "Unnamed"} • {scan.symbol}
                    </div>
                    <div className="text-xs text-gray-400">
                      {scan.timeframe} •{" "}
                      <span
                        className={
                          scan.direction === "bullish"
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {scan.direction?.toUpperCase() || "UNKNOWN"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {typeof scan.pvsScore === "number" ? (
                      <PVSBadge score={scan.pvsScore} />
                    ) : (
                      <div className="text-xs text-gray-500 italic">No score yet</div>
                    )}

                    {userSettings.useConfidenceScore && (
                      typeof scan.confidenceScore === "number" ? (
                        <ConfidenceTooltip score={scan.confidenceScore} />
                      ) : (
                        <div className="text-xs text-gray-500 italic">No confidence score</div>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
