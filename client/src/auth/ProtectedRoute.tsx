import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { AppLayout } from '@/layouts/AppLayout';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute(){
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? (
    <AppLayout>
      <Outlet/>
    </AppLayout>
  ) : <Navigate to="/login" replace/>;
}