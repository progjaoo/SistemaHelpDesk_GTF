import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, RefreshCcw, UsersRound } from 'lucide-react';
import TicketCard from '../components/TicketCard.jsx';
import api, { getApiError } from '../services/api.js';
import { categoryLabels, labelFor, priorityLabels } from '../services/lookups.js';

const summaryItems = [
  ['aberto', 'Aberto'],
  ['em_atendimento', 'Em atendimento'],
  ['aguardando_usuario', 'Aguardando usuário'],
  ['resolvido', 'Resolvido'],
  ['fechado', 'Fechado']
];

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [metricsResponse, ticketsResponse] = await Promise.all([
        api.get('/tickets/metrics'),
        api.get('/tickets', { params: { limit: 8 } })
      ]);
      setMetrics(metricsResponse.data);
      setTickets(ticketsResponse.data.tickets);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalOpenWork = useMemo(() => {
    if (!metrics?.summary) return 0;
    return Number(metrics.summary.aberto || 0) + Number(metrics.summary.em_atendimento || 0) + Number(metrics.summary.aguardando_usuario || 0);
  }, [metrics]);

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Dashboard TI</h1>
          <p className="section-subtitle">{totalOpenWork} chamados em fila ativa</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadDashboard}>
          <RefreshCcw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaryItems.map(([key, label]) => (
          <div className="panel panel-pad" key={key}>
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <strong className="mt-2 block text-2xl text-ink">{metrics?.summary?.[key] || 0}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Fila de chamados</h2>
            <Link className="btn btn-secondary" to="/admin/tickets">
              <ListChecks size={16} aria-hidden="true" />
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="empty-state">Carregando fila...</div>
          ) : tickets.length ? (
            <div className="grid gap-4">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} to={`/admin/tickets/${ticket.id}`} />
              ))}
            </div>
          ) : (
            <div className="empty-state">Nenhum chamado encontrado.</div>
          )}
        </div>

        <aside className="space-y-6">
          <section className="panel panel-pad">
            <h2 className="text-base font-semibold text-ink">Por prioridade</h2>
            <div className="mt-4 space-y-3">
              {(metrics?.byPriority || []).map((item) => (
                <div className="flex items-center justify-between gap-3 text-sm" key={item.priority}>
                  <span className="text-slate-700">{labelFor(priorityLabels, item.priority)}</span>
                  <strong className="text-ink">{item.total}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel-pad">
            <h2 className="text-base font-semibold text-ink">Por categoria</h2>
            <div className="mt-4 space-y-3">
              {(metrics?.byCategory || []).map((item) => (
                <div className="flex items-center justify-between gap-3 text-sm" key={item.category}>
                  <span className="text-slate-700">{labelFor(categoryLabels, item.category)}</span>
                  <strong className="text-ink">{item.total}</strong>
                </div>
              ))}
            </div>
          </section>

          <Link className="btn btn-primary w-full" to="/admin/users">
            <UsersRound size={16} aria-hidden="true" />
            Gerenciar usuários
          </Link>
        </aside>
      </section>
    </main>
  );
}
