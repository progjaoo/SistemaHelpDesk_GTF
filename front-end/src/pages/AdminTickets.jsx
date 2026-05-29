import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Filter, RefreshCcw, Search } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { getApiError } from '../services/api.js';
import {
  categoryLabels,
  defaultCategories,
  formatDate,
  labelFor,
  priorities,
  priorityLabels,
  statusLabels,
  statuses
} from '../services/lookups.js';

const initialFilters = {
  status: '',
  category: '',
  priority: '',
  user_id: '',
  search: ''
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function setFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function buildParams() {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  }

  async function loadTickets(params = buildParams()) {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadLookups() {
      try {
        const [usersResponse, categoriesResponse] = await Promise.all([
          api.get('/users'),
          api.get('/tickets/categories')
        ]);
        if (!mounted) return;
        setUsers(usersResponse.data.users);
        if (categoriesResponse.data.categories?.length) {
          setCategories(categoriesResponse.data.categories.map((category) => category.name));
        }
      } catch {
        if (mounted) setCategories(defaultCategories);
      }
    }

    loadLookups();
    loadTickets({});
    return () => {
      mounted = false;
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    loadTickets();
  }

  function clearFilters() {
    setFilters(initialFilters);
    loadTickets({});
  }

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Chamados</h1>
          <p className="section-subtitle">{tickets.length} chamados encontrados</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => loadTickets()}>
          <RefreshCcw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <section className="panel panel-pad">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={handleSubmit}>
          <label className="field xl:col-span-2">
            <span className="label inline-flex items-center gap-2">
              <Search size={15} aria-hidden="true" />
              Busca
            </span>
            <input className="input" value={filters.search} onChange={(event) => setFilter('search', event.target.value)} />
          </label>

          <label className="field">
            <span className="label">Status</span>
            <select className="input" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Todos</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {labelFor(statusLabels, item)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Categoria</span>
            <select className="input" value={filters.category} onChange={(event) => setFilter('category', event.target.value)}>
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {labelFor(categoryLabels, item)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Prioridade</span>
            <select className="input" value={filters.priority} onChange={(event) => setFilter('priority', event.target.value)}>
              <option value="">Todas</option>
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {labelFor(priorityLabels, item)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="label">Usuário</span>
            <select className="input" value={filters.user_id} onChange={(event) => setFilter('user_id', event.target.value)}>
              <option value="">Todos</option>
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2 xl:col-span-6">
            <button className="btn btn-primary" type="submit">
              <Filter size={16} aria-hidden="true" />
              Filtrar
            </button>
            <button className="btn btn-secondary" type="button" onClick={clearFilters}>
              Limpar
            </button>
          </div>
        </form>
      </section>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="empty-state">Carregando chamados...</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Solicitante</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Categoria</th>
                <th>Atualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <div className="max-w-xs">
                      <span className="block text-xs font-semibold text-slate-500">#{ticket.id}</span>
                      <span className="block truncate font-semibold text-ink">{ticket.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className="block font-medium text-ink">{ticket.user_name}</span>
                    <span className="block text-xs text-slate-500">{ticket.location}</span>
                  </td>
                  <td>
                    <StatusBadge value={ticket.status} />
                  </td>
                  <td>
                    <StatusBadge type="priority" value={ticket.priority} />
                  </td>
                  <td>{labelFor(categoryLabels, ticket.category)}</td>
                  <td>{formatDate(ticket.updated_at)}</td>
                  <td className="text-right">
                    <Link className="icon-btn" to={`/admin/tickets/${ticket.id}`} title="Abrir chamado">
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tickets.length && <div className="empty-state rounded-none border-0">Nenhum chamado encontrado.</div>}
        </div>
      )}
    </main>
  );
}
