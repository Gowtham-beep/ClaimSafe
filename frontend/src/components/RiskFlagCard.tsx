import type { CSSProperties } from 'react';
import type { RiskFlag } from '../types';

const severityStyles = {
  high: {
    border: 'border-l-red-500',
    background: 'bg-red-50',
    badge: 'bg-red-600 text-white animate-severity-pulse',
  },
  medium: {
    border: 'border-l-amber-500',
    background: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  low: {
    border: 'border-l-emerald-500',
    background: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
};

type RiskFlagCardProps = {
  flag: RiskFlag;
  index: number;
};

export default function RiskFlagCard({ flag, index }: RiskFlagCardProps) {
  const styles = severityStyles[flag.severity] ?? severityStyles.low;

  return (
    <article
      className={`animate-card-in rounded-lg border border-l-4 ${styles.border} ${styles.background} p-5 shadow-sm`}
      style={{ '--card-delay': `${index * 150}ms`, animationDelay: `${index * 150}ms` } as CSSProperties}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{flag.title}</h3>
        <span
          className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wider ${styles.badge}`}
        >
          {flag.severity}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{flag.plain_english}</p>
      {flag.severity_reason ? (
        <p className="mt-3 text-xs italic leading-relaxed text-slate-500">{flag.severity_reason}</p>
      ) : null}
    </article>
  );
}
