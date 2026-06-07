import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export default function CollapsibleSection({ title, count, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm font-semibold tracking-tight text-slate-900">{title}</span>
          {typeof count === 'number' ? (
            <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-500">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-200 px-5 py-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
