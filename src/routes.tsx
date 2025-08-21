// 📁 src/routes.tsx

import React from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import { useUser } from '@context/UserContext';
import AuthScreen from '@screens/AuthScreen';
import DashboardScreen from '@screens/DashboardScreen';
import ScanBuilderScreen from '@screens/ScanBuilderScreen';
import JournalScreen from '@screens/JournalScreen';
import WatchlistScreen from '@screens/WatchlistScreen';
import SettingsScreen from '@screens/SettingsScreen';
import PresetScansScreen from '@screens/PresetScansScreen';
import ScanResultsScreen from '@screens/ScanResultsScreen';
import HomeScreen from '@screens/HomeScreen';
import OnboardingScreen from '@screens/OnboardingScreen';
import SavedScansScreen from '@screens/SavedScansScreen';

// ✅ Moved OUTSIDE of AppRoutes
const ProtectedRoute = ({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: string[];
}) => {
  const { role, loading } = useUser();

  if (loading) {
    return <div className="text-white text-center p-10">Loading user...</div>;
  }

  return allowed.includes(role) ? <>{children}</> : <Navigate to="/auth" />;
};

export const AppRoutes = () => {
  const routes = useRoutes([
    { path: '/auth', element: <AuthScreen /> },
    { path: '/', element: <Navigate to="/dashboard" /> },

    {
      path: '/dashboard',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <DashboardScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/saved-scans',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <SavedScansScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/journal',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <JournalScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/scan-builder',
      element: (
        <ProtectedRoute allowed={['paid', 'pro']}>
          <ScanBuilderScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/pro-tools',
      element: (
        <ProtectedRoute allowed={['pro']}>
          <div className="text-white p-4">Pro Tools Page</div>
        </ProtectedRoute>
      ),
    },
    {
      path: '/watchlist',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <WatchlistScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/settings',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <SettingsScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/preset-scans',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <PresetScansScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/scan-results',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <ScanResultsScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/home',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <HomeScreen />
        </ProtectedRoute>
      ),
    },
    {
      path: '/onboarding',
      element: (
        <ProtectedRoute allowed={['free', 'paid', 'pro']}>
          <OnboardingScreen />
        </ProtectedRoute>
      ),
    },

    { path: '*', element: <Navigate to="/auth" /> },
  ]);

  return routes;
};
