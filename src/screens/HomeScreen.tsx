//src/screens/HomeScreen.tsx
import React from 'react';
import { useUser } from '@context/UserContext';
import { Link } from 'react-router-dom';

const HomeScreen = () => {
  const { firebaseUser, role } = useUser();

  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-10 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">Welcome to Set-Up Nicely</h1>
        <p className="text-[#B0B0B0] text-lg">
          Find high-probability trading setups, backed by data — no guesswork.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Logged in as: <span className="font-semibold">{firebaseUser?.email || 'Guest'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/preset-scans"
          className="bg-[#1E1E1E] rounded-2xl p-5 shadow hover:bg-[#2A2A2A] transition"
        >
          <h2 className="text-xl font-semibold text-yellow-400 mb-1">View Preset Scans</h2>
          <p className="text-sm text-[#B0B0B0]">Explore curated strategies with historical reliability and real-time triggers.</p>
        </Link>

        <Link
          to={role === 'free' ? '#' : '/scan-builder'}
          className={`bg-[#1E1E1E] rounded-2xl p-5 shadow transition ${
            role === 'free'
              ? 'opacity-50 pointer-events-none'
              : 'hover:bg-[#2A2A2A]'
          }`}
        >
          <h2 className="text-xl font-semibold text-red-400 mb-1">Build Your Own Scan</h2>
          <p className="text-sm text-[#B0B0B0]">Customize logic with technical indicators and test your ideas.</p>
        </Link>

        <Link
          to="/journal"
          className="bg-[#1E1E1E] rounded-2xl p-5 shadow hover:bg-[#2A2A2A] transition"
        >
          <h2 className="text-xl font-semibold text-green-400 mb-1">Trading Journal</h2>
          <p className="text-sm text-[#B0B0B0]">Log, tag, and reflect on past trades to improve over time.</p>
        </Link>

        <Link
          to="/scan-results"
          className="bg-[#1E1E1E] rounded-2xl p-5 shadow hover:bg-[#2A2A2A] transition"
        >
          <h2 className="text-xl font-semibold text-blue-300 mb-1">Live Scan Results</h2>
          <p className="text-sm text-[#B0B0B0]">See what setups are triggering in the current market.</p>
        </Link>

        <Link
          to="/watchlist"
          className="bg-[#1E1E1E] rounded-2xl p-5 shadow hover:bg-[#2A2A2A] transition"
        >
          <h2 className="text-xl font-semibold text-purple-400 mb-1">Watchlist</h2>
          <p className="text-sm text-[#B0B0B0]">Track tickers and get notified when conditions align.</p>
        </Link>

        <Link
          to="/settings"
          className="bg-[#1E1E1E] rounded-2xl p-5 shadow hover:bg-[#2A2A2A] transition"
        >
          <h2 className="text-xl font-semibold text-gray-300 mb-1">User Settings</h2>
          <p className="text-sm text-[#B0B0B0]">Configure notification preferences, account settings, and more.</p>
        </Link>
      </div>

      <div className="text-center text-sm text-gray-500 pt-10">
        Version 1.0 — Built for traders who think in probabilities, not predictions.
      </div>
    </div>
  );
};

export default HomeScreen;
