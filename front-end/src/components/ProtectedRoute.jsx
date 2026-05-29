import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="panel panel-pad text-sm font-semibold text-slate-700">Carregando sessão...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Outlet />
    </div>
  );
}

export function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="panel panel-pad text-sm font-semibold text-slate-700">Carregando sessão...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <Outlet />;
}
