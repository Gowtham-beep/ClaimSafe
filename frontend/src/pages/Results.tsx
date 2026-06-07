import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { getResult } from '../api/client';
import CollapsibleSection from '../components/CollapsibleSection';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PolicySummaryCard from '../components/PolicySummaryCard';
import RiskFlagCard from '../components/RiskFlagCard';
import type { AnalysisResult } from '../types';

type SectionKey = 'exclusions' | 'waiting' | 'sublimits' | 'copayments' | 'coverage' | 'tips';

const emptyText = 'None identified in this policy.';

function text(item: unknown, keys: string[], fallback = '—') {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return fallback;

  for (const key of keys) {
    const value = (item as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }

  return fallback;
}

function EmptyState() {
  return <p className="p-4 text-sm italic text-slate-400">{emptyText}</p>;
}

function RawBox({ value }: { value: string }) {
  return <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3 font-mono text-xs leading-relaxed text-slate-600">{value}</pre>;
}

export default function Results() {
  const { policyId = '' } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    exclusions: false,
    waiting: false,
    sublimits: false,
    copayments: false,
    coverage: false,
    tips: false,
  });

  useEffect(() => {
    let mounted = true;

    async function loadResult() {
      try {
        const data = await getResult(policyId);
        if (mounted) setResult(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load analysis result.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadResult();
    return () => {
      mounted = false;
    };
  }, [policyId]);

  const toggle = (key: SectionKey) => {
    setOpen((current) => ({ ...current, [key]: !current[key] }));
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <LoadingSkeleton />
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <section className="mx-auto max-w-xl px-4 py-20">
          <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Could not load results</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{error || 'No result was returned for this policy.'}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition duration-150 hover:scale-[1.01] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Analyse another policy
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-3xl space-y-7 px-4 py-10 animate-page-enter">
        <PolicySummaryCard result={result} />

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">⚠ Risk Flags</h2>
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">
              {result.risk_flags.length}
            </span>
          </div>
          {result.risk_flags.length > 0 ? (
            <div className="space-y-4">
              {result.risk_flags.map((flag, index) => (
                <RiskFlagCard key={`${flag.title}-${index}`} flag={flag} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <EmptyState />
            </div>
          )}
        </section>

        <div className="space-y-3">
          <CollapsibleSection title="Exclusions" count={result.exclusions.length} open={open.exclusions} onToggle={() => toggle('exclusions')}>
            {result.exclusions.length ? (
              <div className="space-y-5">
                {result.exclusions.map((item, index) => (
                  <article key={index} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">{text(item, ['title', 'name', 'condition'])}</h3>
                    <RawBox value={text(item, ['raw_text', 'detail', 'clause', 'text'])} />
                    <p className="text-sm leading-relaxed text-slate-700">{text(item, ['plain_english', 'summary', 'explanation'])}</p>
                    <p className="text-xs italic text-slate-500">{text(item, ['impact', 'severity_reason', 'reason'], '')}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Waiting Periods" count={result.waiting_periods.length} open={open.waiting} onToggle={() => toggle('waiting')}>
            {result.waiting_periods.length ? (
              <div className="space-y-5 border-l border-slate-200 pl-5">
                {result.waiting_periods.map((item, index) => (
                  <article key={index} className="relative">
                    <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                    <p className="text-sm leading-relaxed text-slate-700">{text(item, ['raw_text', 'condition', 'plain_english', 'detail'], '')}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Sub-limits & Caps" count={result.sublimits.length} open={open.sublimits} onToggle={() => toggle('sublimits')}>
            {result.sublimits.length ? (
              <LimitList items={result.sublimits} />
            ) : (
              <EmptyState />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Co-payment & Deductibles" count={result.copayments.length} open={open.copayments} onToggle={() => toggle('copayments')}>
            {result.copayments.length ? (
              <LimitList items={result.copayments} />
            ) : (
              <EmptyState />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="What's Actually Covered" count={result.coverage_summary ? 1 : 0} open={open.coverage} onToggle={() => toggle('coverage')}>
            {result.coverage_summary ? (
              <p className="text-sm leading-relaxed text-slate-700">{result.coverage_summary}</p>
            ) : (
              <EmptyState />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Claim Tips" count={result.claim_tips.length} open={open.tips} onToggle={() => toggle('tips')}>
            {result.claim_tips.length ? (
              <div className="space-y-3">
                {result.claim_tips.map((item, index) => (
                  <article key={index} className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{text(item, ['tip', 'title', 'text'])}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{text(item, ['reason', 'why', 'detail'], '')}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </CollapsibleSection>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-bold tracking-tight text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
          ClaimSafe
        </Link>
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition duration-150 hover:scale-[1.01] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        >
          Analyse another policy
        </Link>
      </div>
    </header>
  );
}

function LimitList({ items }: { items: unknown[] }) {
  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <article key={index} className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">{text(item, ['title', 'item', 'condition', 'limit'])}</h3>
          <RawBox value={text(item, ['raw_text', 'detail', 'clause', 'condition'])} />
          <p className="text-sm leading-relaxed text-slate-700">{text(item, ['plain_english', 'summary', 'explanation'])}</p>
          {text(item, ['example'], '') ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-blue-900">
              {text(item, ['example'])}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
