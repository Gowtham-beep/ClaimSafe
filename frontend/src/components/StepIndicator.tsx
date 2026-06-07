import type { CSSProperties } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { JobStatus } from '../types';

type Step = {
  number: number;
  label: string;
  active: JobStatus[];
  done: JobStatus[];
};

const steps: Step[] = [
  { number: 1, label: 'Reading your policy', active: ['extracting', 'uploaded'], done: ['pass0_complete', 'pass1_complete', 'pass2_complete', 'done'] },
  { number: 2, label: 'Identifying policy structure', active: ['pass0_complete'], done: ['pass1_complete', 'pass2_complete', 'done'] },
  { number: 3, label: 'Extracting clauses & exclusions', active: ['pass1_complete'], done: ['pass2_complete', 'done'] },
  { number: 4, label: 'Scoring risks & writing summary', active: ['pass2_complete', 'done'], done: ['done'] },
];

type StepIndicatorProps = {
  status: JobStatus;
};

export default function StepIndicator({ status }: StepIndicatorProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isDone = step.done.includes(status);
        const isActive = !isDone && step.active.includes(status);

        return (
          <div
            key={step.number}
            className="animate-card-in relative flex items-center gap-4"
            style={{ animationDelay: `${index * 150}ms` } as CSSProperties}
          >
            {isActive ? <span className="absolute -left-4 h-2 w-2 rounded-full bg-blue-600 animate-pulse" /> : null}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isDone
                  ? 'bg-emerald-600 text-white'
                  : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200'
              }`}
            >
              {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : step.number}
            </span>
            <span
              className={`text-sm font-medium ${
                isDone ? 'text-slate-400' : isActive ? 'text-slate-900' : 'text-slate-500'
              } ${isActive ? 'animate-pulse' : ''}`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
