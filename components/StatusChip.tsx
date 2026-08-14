import { STATUS_LABEL, type Status } from '@/lib/triage';

const STYLE: Record<Status, string> = {
  needs_review: 'bg-slate-100 text-slate-700 ring-slate-200',
  drafted: 'bg-sky-50 text-sky-700 ring-sky-200',
  escalated: 'bg-rose-50 text-rose-700 ring-rose-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export default function StatusChip({ status }: { status: Status }) {
  return (
    <span data-testid="status-chip" className={`chip ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
