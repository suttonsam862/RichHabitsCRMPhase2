import { Navigate, Outlet } from 'react-router-dom'; 
import { useAuth } from './AuthProvider';
import { AppLayout } from '@/layouts/AppLayout';

export default function ProtectedRoute(){ 
  const { user } = useAuth(); 
  return user ? (
    <AppLayout>
      <Outlet/>
    </AppLayout>
  ) : <Navigate to="/login" replace/>; 
}