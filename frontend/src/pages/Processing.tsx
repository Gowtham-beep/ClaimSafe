import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Step {
  id: string;
  label: string;
  statuses: string[];
}

export default function Processing() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState<string>('uploaded');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Steps matching our backend pipeline state machine
  const steps: Step[] = [
    { id: '1', label: 'Reading policy document', statuses: ['uploaded', 'extracting'] },
    { id: '2', label: 'Identifying policy exclusions & limits', statuses: ['pass0_complete', 'pass1_complete'] },
    { id: '3', label: 'Analysing claim rejection risks', statuses: ['pass2_complete'] },
    { id: '4', label: 'Preparing plain-language summary', statuses: ['done'] }
  ];

  // Poll status from API or simulate progress
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        if (data.status === 'done') {
          navigate(`/results/mock_policy_id`);
        } else if (data.status === 'failed') {
          setCurrentStatus('failed');
          setErrorMsg(data.error || 'Job failed processing');
        } else {
          setCurrentStatus(data.status);
        }
      } catch (err) {
        // Since we return 501 for now, we will fallback to developer simulation
        console.log("Real status API returned error/501, running local development simulation...");
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [jobId, navigate]);

  // Dev simulation to showcase step-by-step progress
  useEffect(() => {
    const statuses = ['uploaded', 'extracting', 'pass0_complete', 'pass1_complete', 'pass2_complete', 'done'];
    let idx = 0;

    const timer = setInterval(() => {
      if (idx < statuses.length - 1) {
        idx++;
        setCurrentStatus(statuses[idx]);
      } else {
        clearInterval(timer);
        // Navigate to results
        navigate('/results/mock-policy-123');
      }
    }, 2500); // Progress every 2.5s for showcase

    return () => clearInterval(timer);
  }, [navigate]);

  const getStepState = (step: Step) => {
    const activeIdx = steps.findIndex(s => s.statuses.includes(currentStatus));
    const stepIdx = steps.findIndex(s => s.id === step.id);

    if (stepIdx < activeIdx) return 'completed';
    if (stepIdx === activeIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Policy</h2>
        <p className="text-sm text-slate-400">Job ID: {jobId}</p>
      </div>

      {/* Progress Cards */}
      <div className="bg-slate-800/40 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* Animated accent gradient at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />

        <div className="space-y-6">
          {steps.map((step) => {
            const state = getStepState(step);
            return (
              <div key={step.id} className="flex items-center gap-4">
                {state === 'completed' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                    ✓
                  </div>
                )}
                {state === 'current' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500 flex items-center justify-center text-indigo-400 font-semibold text-sm relative">
                    <span className="absolute inset-0 rounded-full border border-indigo-400 animate-ping opacity-75" />
                    ⟳
                  </div>
                )}
                {state === 'pending' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-sm">
                    {step.id}
                  </div>
                )}
                <span className={`text-sm font-medium ${
                  state === 'completed' ? 'text-slate-300 line-through decoration-slate-600' :
                  state === 'current' ? 'text-indigo-300 font-semibold' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {currentStatus === 'failed' && errorMsg && (
          <div className="mt-4 p-4 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            Error: {errorMsg}
          </div>
        )}

        {/* Development Helper Banner */}
        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <div className="inline-flex gap-2 items-center px-2 py-1 rounded bg-slate-900/60 text-[10px] text-slate-500 font-mono">
            <span>⚙️ DEV SHIM: Simulating pipeline progress...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
