import React from 'react';
import { useUser } from '@context/UserContext';
import ConfidenceTooltip from '@components/confidenceTooltip';
import { Settings, Eye, Bell, ToggleLeft, RefreshCw } from 'lucide-react';

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
        checked ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-md transform duration-300 ${
          checked ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

const SettingsScreen = () => {
  const { userSettings, updateSetting, resetUserSettings } = useUser();

  const handleToggle = (key: keyof typeof userSettings) => {
    updateSetting(key, !userSettings?.[key]);
  };

  const handleReset = () => {
    resetUserSettings();
    alert('✅ Settings have been reset to default.');
  };

  return (
    <div className="p-6 text-white bg-[#121212] min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-white" />
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* ⚙️ Feature Toggles */}
      <div className="bg-[#1E1E1E] rounded-xl p-4 shadow space-y-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Features</h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-5 h-5 text-[#B0B0B0]" />
            <span className="text-sm">Enable Confidence Score</span>
            <ConfidenceTooltip explanation="Confidence Score combines PVS + Sector Strength (30% weight)" />
          </div>
          <Switch
            checked={userSettings?.useConfidenceScore ?? false}
            onChange={() => handleToggle('useConfidenceScore')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#B0B0B0]" />
            <span className="text-sm">Enable Scan Alerts</span>
          </div>
          <Switch
            checked={userSettings?.alertsEnabled ?? false}
            onChange={() => handleToggle('alertsEnabled')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#B0B0B0]" />
            <span className="text-sm">Show Watchlist Highlights</span>
          </div>
          <Switch
            checked={userSettings?.showWatchlist ?? true}
            onChange={() => handleToggle('showWatchlist')}
          />
        </div>
      </div>

      {/* 🛠️ Default Settings */}
      <div className="bg-[#1E1E1E] rounded-xl p-4 shadow space-y-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Defaults</h2>

        <div className="flex justify-between items-center">
          <label className="text-sm">Default Timeframe:</label>
          <select
            className="bg-gray-800 text-white px-3 py-1 rounded"
            value={userSettings?.defaultTimeframe ?? '5m'}
            onChange={(e) =>
              updateSetting('defaultTimeframe', e.target.value as '1m' | '5m' | '15m' | '1h' | '1d')
            }
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="1d">1d</option>
          </select>
        </div>

        <div className="flex justify-between items-center">
          <label className="text-sm">Minimum PVS Score:</label>
          <input
            type="number"
            className="w-20 px-2 py-1 rounded bg-gray-800 text-white"
            min={0}
            max={100}
            value={userSettings?.minPVS ?? 50}
            onChange={(e) => updateSetting('minPVS', parseInt(e.target.value))}
          />
        </div>

        <div className="flex justify-between items-center">
          <label className="text-sm">Alert Frequency:</label>
          <select
            className="bg-gray-800 text-white px-3 py-1 rounded"
            value={userSettings?.alertFrequency ?? 'normal'}
            onChange={(e) =>
              updateSetting(
                'alertFrequency',
                e.target.value as 'low' | 'normal' | 'high'
              )
            }
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* 🔁 Reset All */}
      <div className="text-center mt-8">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition"
        >
          <RefreshCw size={16} />
          <span className="text-sm">Reset All Settings</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;
