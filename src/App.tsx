import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/auth/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute, AdminRoute } from '@/auth/ProtectedRoute';
import { LoadingScreen } from '@/components/LoadingScreen';

const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const StudioPage = lazy(() => import('@/pages/StudioPage').then((m) => ({ default: m.StudioPage })));
const VersionHistoryPage = lazy(() => import('@/pages/VersionHistoryPage').then((m) => ({ default: m.VersionHistoryPage })));
const TimelineEditorPage = lazy(() => import('@/pages/TimelineEditorPage').then((m) => ({ default: m.TimelineEditorPage })));
const ExportPage = lazy(() => import('@/pages/ExportPage').then((m) => ({ default: m.ExportPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const BillingPage = lazy(() => import('@/pages/BillingPage').then((m) => ({ default: m.BillingPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/studio" element={<ProtectedRoute><StudioPage /></ProtectedRoute>} />
                <Route path="/studio/:projectId" element={<ProtectedRoute><StudioPage /></ProtectedRoute>} />
                <Route path="/project/:projectId/versions" element={<ProtectedRoute><VersionHistoryPage /></ProtectedRoute>} />
                <Route path="/project/:projectId/timeline" element={<ProtectedRoute><TimelineEditorPage /></ProtectedRoute>} />
                <Route path="/project/:projectId/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
