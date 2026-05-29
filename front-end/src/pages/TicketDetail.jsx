import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquarePlus, Save } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { getApiError } from '../services/api.js';
import {
  categoryLabels,
  formatDate,
  labelFor,
  priorityLabels,
  statusLabels,
  statuses
} from '../services/lookups.js';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [ticket, setTicket] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [message, setMessage] = useState('');
  const [internalMessage, setInternalMessage] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const backPath = isAdmin ? '/admin/tickets' : '/dashboard';

  async function loadTicket() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data.ticket);
      setUpdates(data.updates);
      setStatus(data.ticket.status);
      setAssignedTo(data.ticket.assigned_to ? String(data.ticket.assigned_to) : '');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;

    async function loadAdmins() {
      try {
        const { data } = await api.get('/users', { params: { role: 'admin', active: true } });
        if (mounted) setAdmins(data.users);
      } catch {
        if (mounted) setAdmins([]);
      }
    }

    loadAdmins();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  async function handleAdminSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.patch(`/tickets/${id}`, {
        status,
        assigned_to: assignedTo || null,
        message,
        internal_message: internalMessage
      });
      setMessage('');
      setInternalMessage('');
      await loadTicket();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!comment.trim()) return;

    setSaving(true);
    setError('');

    try {
      const { data } = await api.post(`/tickets/${id}/updates`, { message: comment });
      setUpdates(data.updates);
      setComment('');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="empty-state">Carregando chamado...</div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="page space-y-4">
        <button className="btn btn-secondary" type="button" onClick={() => navigate(backPath)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </button>
        <div className="empty-state">{error || 'Chamado não encontrado.'}</div>
      </main>
    );
  }

  return (
    <main className="page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Chamado #{ticket.id}</h1>
          <p className="section-subtitle">{formatDate(ticket.created_at)}</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => navigate(backPath)}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <article className="panel panel-pad">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={ticket.status} />
              <StatusBadge type="priority" value={ticket.priority} />
              <StatusBadge type="category" value={ticket.category} />
            </div>

            <h2 className="mt-4 text-2xl font-semibold text-ink">{ticket.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description}</p>

            <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-500">Solicitante</dt>
                <dd className="text-ink">{ticket.user_name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">E-mail</dt>
                <dd className="break-all text-ink">{ticket.user_email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Localização/Setor</dt>
                <dd className="text-ink">{ticket.location}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Responsável</dt>
                <dd className="text-ink">{ticket.assigned_name || 'Sem responsável'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Categoria</dt>
                <dd className="text-ink">{labelFor(categoryLabels, ticket.category)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Prioridade</dt>
                <dd className="text-ink">{labelFor(priorityLabels, ticket.priority)}</dd>
              </div>
              {ticket.problem_type && (
                <div>
                  <dt className="font-semibold text-slate-500">Tipo do problema</dt>
                  <dd className="text-ink">{ticket.problem_type}</dd>
                </div>
              )}
              {ticket.affected_environment && (
                <div>
                  <dt className="font-semibold text-slate-500">Ambiente afetado</dt>
                  <dd className="text-ink">{ticket.affected_environment}</dd>
                </div>
              )}
              {ticket.affected_equipment && (
                <div>
                  <dt className="font-semibold text-slate-500">Equipamento afetado</dt>
                  <dd className="text-ink">{ticket.affected_equipment}</dd>
                </div>
              )}
              {ticket.patrimony_number && (
                <div>
                  <dt className="font-semibold text-slate-500">Patrimônio</dt>
                  <dd className="text-ink">{ticket.patrimony_number}</dd>
                </div>
              )}
            </dl>

            {ticket.attachments?.length > 0 && (
              <section className="mt-5 border-t border-line pt-4">
                <h3 className="text-sm font-semibold text-ink">Anexos</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {ticket.attachments.map((attachment) => {
                    const src = attachment.data_base64?.startsWith('data:')
                      ? attachment.data_base64
                      : `data:${attachment.mime_type};base64,${attachment.data_base64}`;
                    return (
                      <a className="rounded-md border border-line bg-muted p-2 text-sm font-semibold text-brand" href={src} target="_blank" rel="noreferrer" key={attachment.name}>
                        {attachment.mime_type?.startsWith('image/') ? (
                          <img className="mb-2 max-h-48 w-full rounded object-cover" src={src} alt={attachment.name} />
                        ) : (
                          <video className="mb-2 max-h-48 w-full rounded" controls src={src} />
                        )}
                        {attachment.name}
                      </a>
                    );
                  })}
                </div>
              </section>
            )}
          </article>

          <section className="panel panel-pad">
            <h2 className="text-base font-semibold text-ink">Histórico</h2>
            <div className="mt-4 divide-y divide-line">
              {updates.map((update) => (
                <div className="py-4" key={update.id}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <strong className="text-ink">{update.user_name}</strong>
                    <span>{formatDate(update.created_at)}</span>
                    {Boolean(update.is_internal) && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        Interno
                      </span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{update.message}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {isAdmin ? (
            <section className="panel panel-pad">
              <h2 className="text-base font-semibold text-ink">Atendimento</h2>
              <form className="mt-4 space-y-4" onSubmit={handleAdminSubmit}>
                <label className="field">
                  <span className="label">Status</span>
                  <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {labelFor(statusLabels, item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Técnico responsável</span>
                  <select className="input" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                    <option value="">Sem responsável</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="label">Atualização para o usuário</span>
                  <textarea className="textarea min-h-24" value={message} onChange={(event) => setMessage(event.target.value)} />
                </label>

                <label className="field">
                  <span className="label">Observação interna</span>
                  <textarea className="textarea min-h-24" value={internalMessage} onChange={(event) => setInternalMessage(event.target.value)} />
                </label>

                <button className="btn btn-primary w-full" type="submit" disabled={saving}>
                  <Save size={16} aria-hidden="true" />
                  Salvar atendimento
                </button>
              </form>
            </section>
          ) : (
            <section className="panel panel-pad">
              <h2 className="text-base font-semibold text-ink">Adicionar comentário</h2>
              <form className="mt-4 space-y-4" onSubmit={handleCommentSubmit}>
                <textarea className="textarea min-h-28" value={comment} onChange={(event) => setComment(event.target.value)} />
                <button className="btn btn-primary w-full" type="submit" disabled={saving || !comment.trim()}>
                  <MessageSquarePlus size={16} aria-hidden="true" />
                  Enviar comentário
                </button>
              </form>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}
