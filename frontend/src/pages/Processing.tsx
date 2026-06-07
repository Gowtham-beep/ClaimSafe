import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import StepIndicator from '../components/StepIndicator';
import { getJobStatus } from '../api/client';
import type { JobStatus } from '../types';

type ProcessingState = {
  policy_id?: string;
  session_id?: string;
};

export default function Processing() {
  const { jobId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state ?? {}) as ProcessingState;
  const [status, setStatus] = useState<JobStatus>('uploaded');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (!jobId) return;
      try {
        const response = await getJobStatus(jobId);
        if (!mounted) return;
        setStatus(response.status);

        if (response.status === 'failed') {
          setError(response.error || 'Analysis failed. Please try again.');
          return;
        }

        if (response.status === 'done') {
          const policyId = routeState.policy_id || response.policy_id;
          if (policyId) {
            doneTimer = setTimeout(() => navigate(`/results/${policyId}`), 800);
          } else {
            setError('Analysis completed, but the policy ID was not returned.');
          }
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to check processing status.');
      }
    };

    poll();
    const interval = window.setInterval(poll, 3000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [jobId, navigate, routeState.policy_id]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 px-4 py-6 animate-soft-gradient">
      <header className="absolute left-4 top-5 z-10 sm:left-8">
        <Link to="/" className="block rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
          <span className="text-lg font-bold tracking-tight text-slate-900">ClaimSafe</span>
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 items-center justify-center py-24">
        <div className="animate-page-enter w-full rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analysing your policy</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">This takes about 2 minutes. You can leave this tab open.</p>
          </div>

          <div className="mt-8">
            <StepIndicator status={status} />
          </div>

          {error ? (
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition duration-150 hover:scale-[1.01] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
