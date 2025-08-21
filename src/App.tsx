// 📁 src/App.tsx

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { UserProvider } from '@context/UserContext';
import { JournalProvider } from '@context/JournalContext';
import { ScanProvider } from '@context/ScanContext'; // ✅ existing UI state
import { ScanRunnerProvider } from '@context/ScanRunnerContext'; // ✅ real-time runner
import { setupWebPushListeners } from './utils/notificationHandler';

import './styles/globals.css';
import './styles/tailwind.css';

const App = () => {
  useEffect(() => {
    setupWebPushListeners();
  }, []);

  return (
    <UserProvider>
      <JournalProvider>
        <ScanProvider>
          <ScanRunnerProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ScanRunnerProvider>
        </ScanProvider>
      </JournalProvider>
    </UserProvider>
  );
};

export default App;
