// 📁 src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from './routes';
import { UserProvider } from '@context/UserContext';
import { JournalProvider } from '@context/JournalContext';
import { ScanProvider } from '@context/ScanContext';
import { ScanRunnerProvider } from '@context/ScanRunnerContext';
import { setupWebPushListeners } from './utils/notificationHandler';

import './styles/globals.css';
import './styles/tailwind.css';
import './index.css';
// 📁 src/main.tsx
import { Toaster } from 'react-hot-toast';

// ...existing imports
setupWebPushListeners();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <JournalProvider>
        <ScanProvider>
          <ScanRunnerProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster position="top-right" reverseOrder={false} />
            </BrowserRouter>
          </ScanRunnerProvider>
        </ScanProvider>
      </JournalProvider>
    </UserProvider>
  </React.StrictMode>
);
