import type { AnalysisResult } from '../types';

const policyTypeStyles = {
  health: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  term_life: 'bg-blue-50 text-blue-700 ring-blue-200',
  vehicle: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function display(value?: string | null) {
  return value && value.trim() ? value : '—';
}

export default function PolicySummaryCard({ result }: { result: AnalysisResult }) {
  const badgeStyle = policyTypeStyles[result.policy_type] ?? 'bg-slate-100 text-slate-700 ring-slate-200';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{display(result.insurer)}</h1>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ring-1 ring-inset ${badgeStyle}`}>
          {result.policy_type?.replace('_', ' ') || 'policy'}
        </span>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          ['Sum Insured', result.sum_insured],
          ['Premium', result.premium],
          ['Policy Period', result.policy_period],
          ['', null],
        ].map(([label, value]) => (
          <div key={label || 'empty'} className="min-h-16 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {label ? (
              <>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{display(value)}</dd>
              </>
            ) : (
              <span className="text-sm text-slate-300">—</span>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
