// 📁 /src/screens/OnboardingScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@components/Button';

const OnboardingScreen = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    // Optionally log onboarding complete or trigger analytics here
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10 flex flex-col items-center justify-center animate-fadeIn">
      <div className="max-w-3xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold text-blue-400">Welcome to Set-Up Nicely</h1>
        <p className="text-[#B0B0B0] text-lg">
          Your high-performance trading command center — built to help you spot the cleanest setups, fastest.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          <div className="bg-[#1E1E1E] p-5 rounded-2xl shadow space-y-2">
            <h2 className="text-lg font-semibold text-green-400">📊 Preset & Custom Scans</h2>
            <p className="text-sm text-[#B0B0B0]">
              Use powerful pre-built scans or build your own with technical indicators. All scans rank by Predictive Validity Score (PVS) to highlight what’s really working.
            </p>
          </div>

          <div className="bg-[#1E1E1E] p-5 rounded-2xl shadow space-y-2">
            <h2 className="text-lg font-semibold text-yellow-400">🔥 Sector Strength & Confidence</h2>
            <p className="text-sm text-[#B0B0B0]">
              Get real-time insights into which sectors are hot. Confidence scores combine sector momentum with setup accuracy.
            </p>
          </div>

          <div className="bg-[#1E1E1E] p-5 rounded-2xl shadow space-y-2">
            <h2 className="text-lg font-semibold text-pink-400">📓 Trade Journaling</h2>
            <p className="text-sm text-[#B0B0B0]">
              Record your trades, reflect on setups, and review outcomes over time. Free users get limited entries—upgrade to unlock full tracking.
            </p>
          </div>

          <div className="bg-[#1E1E1E] p-5 rounded-2xl shadow space-y-2">
            <h2 className="text-lg font-semibold text-purple-400">👀 Watchlists & Alerts</h2>
            <p className="text-sm text-[#B0B0B0]">
              Keep an eye on your favorite tickers and receive alerts when your saved setups trigger—customizable by timeframe, signal type, and sector.
            </p>
          </div>
        </div>

        <p className="text-sm text-[#B0B0B0] mt-4">
          💡 You can always revisit this onboarding screen from the <span className="text-white font-medium">Settings</span> page.
        </p>

        <div className="pt-4">
          <Button onClick={handleStart} aria-label="Launch Dashboard from onboarding">
            Launch Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
