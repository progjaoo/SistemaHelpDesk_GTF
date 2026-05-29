import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, UserRound } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { categoryLabels, formatDate, labelFor } from '../services/lookups.js';

export default function TicketCard({ ticket, to }) {
  return (
    <article className="panel panel-pad">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-500">#{ticket.id}</span>
            <StatusBadge value={ticket.status} />
            <StatusBadge type="priority" value={ticket.priority} />
          </div>
          <h3 className="line-clamp-2 text-base font-semibold text-ink">{ticket.title}</h3>
          <p className="line-clamp-2 text-sm text-slate-600">{ticket.description}</p>
        </div>

        <Link className="btn btn-secondary shrink-0" to={to || `/tickets/${ticket.id}`}>
          Abrir
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid gap-2 border-t border-line pt-3 text-xs text-slate-600 sm:grid-cols-3">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={14} aria-hidden="true" />
          {formatDate(ticket.updated_at || ticket.created_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} aria-hidden="true" />
          {ticket.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound size={14} aria-hidden="true" />
          {ticket.user_name || labelFor(categoryLabels, ticket.category)}
        </span>
      </div>
    </article>
  );
}
