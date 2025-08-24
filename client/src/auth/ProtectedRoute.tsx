import { Navigate, Outlet } from 'react-router-dom'; 
import { useAuth } from './AuthProvider';

export default function ProtectedRoute(){ 
  const { user } = useAuth(); 
  return user ? <Outlet/> : <Navigate to="/login" replace/>; 
}