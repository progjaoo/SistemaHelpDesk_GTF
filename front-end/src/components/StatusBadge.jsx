import { categoryLabels, labelFor, priorityLabels, statusLabels } from '../services/lookups.js';

const statusStyles = {
  Aberto: 'border-blue-200 bg-blue-50 text-blue-800',
  'Em Atendimento': 'border-amber-200 bg-amber-50 text-amber-800',
  'Aguardando Usuario': 'border-violet-200 bg-violet-50 text-violet-800',
  Resolvido: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Fechado: 'border-slate-200 bg-slate-100 text-slate-700'
};

const priorityStyles = {
  Baixa: 'border-slate-200 bg-slate-50 text-slate-700',
  Media: 'border-sky-200 bg-sky-50 text-sky-800',
  Alta: 'border-orange-200 bg-orange-50 text-orange-800',
  Urgente: 'border-red-200 bg-red-50 text-red-800'
};

export default function StatusBadge({ type = 'status', value }) {
  const styles = type === 'priority' ? priorityStyles : statusStyles;
  const labels = type === 'priority' ? priorityLabels : type === 'category' ? categoryLabels : statusLabels;

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${styles[value] || 'border-line bg-muted text-slate-700'}`}>
      {labelFor(labels, value)}
    </span>
  );
}
