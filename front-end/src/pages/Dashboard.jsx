import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Plus, RefreshCcw } from 'lucide-react';
import TicketCard from '../components/TicketCard.jsx';
import api, { getApiError } from '../services/api.js';
import { labelFor, statusLabels, statuses } from '../services/lookups.js';

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadTickets() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/tickets');
      setTickets(data.tickets);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const visibleTickets = useMemo(
    () => (status ? tickets.filter((ticket) => ticket.status === status) : tickets),
    [status, tickets]
  );

  const counters = useMemo(() => {
    const base = statuses.reduce((acc, item) => ({ ...acc, [item]: 0 }), {});
    tickets.forEach((ticket) => {
      base[ticket.status] = (base[ticket.status] || 0) + 1;
    });
    return base;
  }, [tickets]);

  function handleStatusChange(event) {
    setStatus(event.target.value);
  }

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Meus chamados</h1>
          <p className="section-subtitle">{visibleTickets.length} chamados na visão atual</p>
        </div>
        <Link className="btn btn-primary" to="/tickets/new">
          <Plus size={16} aria-hidden="true" />
          Novo chamado
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statuses.map((item) => (
          <div className="panel panel-pad" key={item}>
            <span className="text-xs font-semibold uppercase text-slate-500">{labelFor(statusLabels, item)}</span>
            <strong className="mt-2 block text-2xl text-ink">{counters[item] || 0}</strong>
          </div>
        ))}
      </section>

      <section className="panel panel-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="field sm:w-72">
            <span className="label inline-flex items-center gap-2">
              <Filter size={15} aria-hidden="true" />
              Status
            </span>
            <select className="input" value={status} onChange={handleStatusChange}>
              <option value="">Todos</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {labelFor(statusLabels, item)}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-secondary" type="button" onClick={loadTickets}>
            <RefreshCcw size={16} aria-hidden="true" />
            Atualizar
          </button>
        </div>
      </section>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="empty-state">Carregando chamados...</div>
      ) : visibleTickets.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {visibleTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </section>
      ) : (
        <div className="empty-state">Nenhum chamado encontrado.</div>
      )}
    </main>
  );
}
