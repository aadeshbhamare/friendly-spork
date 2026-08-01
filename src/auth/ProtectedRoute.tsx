import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { LoadingScreen } from '@/components/LoadingScreen';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
