import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, LogOut, Plus, Shield, Tags, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function navClass({ isActive }) {
  return `inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
    isActive ? 'bg-white text-brand shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white'
  }`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-black text-brand">
              GTF
            </span>
            <span>
              <span className="block text-sm font-semibold">Sistema de Chamados</span>
              <span className="block text-xs text-slate-300">{user?.name}</span>
            </span>
          </Link>

          <button className="btn border-white/20 bg-white/10 text-white hover:bg-white/20" type="button" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {isAdmin ? (
            <>
              <NavLink className={navClass} to="/admin" end>
                <LayoutDashboard size={16} aria-hidden="true" />
                Dashboard
              </NavLink>
              <NavLink className={navClass} to="/admin/tickets">
                <ListChecks size={16} aria-hidden="true" />
                Chamados
              </NavLink>
              <NavLink className={navClass} to="/admin/users">
                <UsersRound size={16} aria-hidden="true" />
                Usuários
              </NavLink>
              <NavLink className={navClass} to="/admin/categories">
                <Tags size={16} aria-hidden="true" />
                Categorias
              </NavLink>
            </>
          ) : (
            <>
              <NavLink className={navClass} to="/dashboard">
                <LayoutDashboard size={16} aria-hidden="true" />
                Meus chamados
              </NavLink>
              <NavLink className={navClass} to="/tickets/new">
                <Plus size={16} aria-hidden="true" />
                Novo chamado
              </NavLink>
            </>
          )}
          {isAdmin && (
            <span className="ml-auto hidden min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-300 sm:inline-flex">
              <Shield size={16} aria-hidden="true" />
              TI
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
