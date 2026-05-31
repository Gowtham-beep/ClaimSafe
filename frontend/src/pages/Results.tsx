import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnalysisResult } from '../types';

export default function Results() {
  const { policyId } = useParams<{ policyId: string }>();

  // Mock analysis result for a typical Indian health insurance policy
  const mockResult: AnalysisResult = {
    policy_id: policyId || 'mock-id-123',
    insurer: 'Star Health Insurance',
    policy_type: 'health',
    sum_insured: '₹5,00,000',
    premium: '₹12,450 / year',
    policy_period: '1 Year (2026 - 2027)',
    risk_flags: [
      {
        title: "Room Rent Cap limits all expenses",
        plain_english: "Your room rent is capped at 1% of the sum insured (₹5,000/day). If you choose a room costing ₹8,000/day, you won't just pay the ₹3,000 difference. The insurer will reduce all other hospital expenses (doctors, ICU, medicines) by 37.5% proportionally.",
        severity: "high",
        severity_reason: "Capped room rent triggers proportionate deductions across the entire bill, causing massive out-of-pocket expenses."
      },
      {
        title: "Hidden Cataract waiting period",
        plain_english: "You cannot claim for Cataract surgery during the first 24 months of this policy. Any surgery done for cataracts before 2 years will be rejected in full.",
        severity: "medium",
        severity_reason: "2-year waiting period applies specifically to cataract surgery, common in Indian policies."
      },
      {
        title: "Modern Treatments are sub-limited",
        plain_english: "Treatments like Robotic Surgery or Stem Cell therapy are capped at 50% of sum insured (₹2,50,000), even if you have higher coverage.",
        severity: "low",
        severity_reason: "Applies only to advanced specialized procedures; standard hospitalizations are unaffected."
      }
    ],
    exclusions: [
      { id: 1, title: "Adventure Sports injuries", detail: "Injuries sustained while paragliding, scuba diving, etc." },
      { id: 2, title: "Cosmetic or Aesthetic surgery", detail: "Treatments purely for appearance enhancement." }
    ],
    waiting_periods: [
      { duration: "30 Days", condition: "Initial waiting period (except accidents)" },
      { duration: "24 Months", condition: "Specific illnesses (hernia, cataracts, joint replacement)" },
      { duration: "36 Months", condition: "Pre-existing diseases declared at proposal" }
    ],
    sublimits: [
      { limit: "₹20,000", item: "Cataract surgery per eye limit" },
      { limit: "1% of Sum Insured", item: "Normal Room Rent per day" },
      { limit: "2% of Sum Insured", item: "ICU Charges per day" }
    ],
    copayments: [
      { percentage: "20%", condition: "Applies to zone-based treatments (outside home city)" },
      { percentage: "10%", condition: "Co-pay for senior citizens entering above age 60" }
    ],
    coverage_summary: "Comprehensive health insurance plan providing standard inpatient hospitalization cover, day care procedures, and pre/post-hospitalization expenses. Subject to room rent caps and specified disease waiting periods.",
    claim_tips: [
      "File pre-authorization at least 48 hours before planned admissions.",
      "Ask the hospital TPA cell to specify room category as 'Single Standard AC' to avoid room rent penalties.",
      "Collect all original pharmacy bills, discharge summary, and diagnostic logs for reimbursement."
    ]
  };

  // State to manage collapsible sections
  const [collapsed, setCollapsed] = useState({
    exclusions: true,
    waitingPeriods: true,
    sublimits: true,
    copayments: true,
    tips: true
  });

  const toggleSection = (section: keyof typeof collapsed) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 pb-20">
      
      {/* Back button and metadata header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link to="/" className="text-indigo-400 text-sm hover:underline inline-flex items-center gap-1 mb-2">
            ← Analyze another policy
          </Link>
          <h2 className="text-3xl font-extrabold text-white">{mockResult.insurer}</h2>
          <p className="text-slate-400 text-sm capitalize">Policy Type: {mockResult.policy_type.replace('_', ' ')}</p>
        </div>
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-800/30 border border-slate-800/80 rounded-xl p-4 sm:min-w-[280px]">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Sum Insured</div>
            <div className="text-lg font-bold text-white">{mockResult.sum_insured}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Premium</div>
            <div className="text-lg font-bold text-emerald-400">{mockResult.premium}</div>
          </div>
        </div>
      </div>

      {/* Critical Risks - Displayed first (Progressive Disclosure) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>⚠️</span> Critical Claim Risks & Warnings
        </h3>
        
        <div className="space-y-4">
          {mockResult.risk_flags.map((flag, idx) => (
            <div 
              key={idx} 
              className="bg-slate-800/40 border border-slate-700/40 backdrop-blur-xl rounded-xl p-6 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <h4 className="text-base font-bold text-white">{flag.title}</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getSeverityBadgeColor(flag.severity)}`}>
                  {flag.severity}
                </span>
              </div>
              <p className="text-sm text-slate-300 font-light leading-relaxed">
                {flag.plain_english}
              </p>
              <div className="bg-slate-900/40 rounded-lg p-3 text-xs text-slate-400 border border-slate-800/60">
                <span className="font-semibold text-slate-300">Why it matters: </span>
                {flag.severity_reason}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible details sections */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white mb-2">Policy Details</h3>

        {/* Exclusions */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-800/20">
          <button 
            onClick={() => toggleSection('exclusions')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200">🚫 Exclusions ({mockResult.exclusions.length})</span>
            <span className="text-slate-400">{collapsed.exclusions ? '＋' : '－'}</span>
          </button>
          {!collapsed.exclusions && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 space-y-3">
              {mockResult.exclusions.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-sm font-medium text-slate-200">{item.title}</div>
                  <div className="text-xs text-slate-400">{item.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiting Periods */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-800/20">
          <button 
            onClick={() => toggleSection('waitingPeriods')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200">⏳ Waiting Periods ({mockResult.waiting_periods.length})</span>
            <span className="text-slate-400">{collapsed.waitingPeriods ? '＋' : '－'}</span>
          </button>
          {!collapsed.waitingPeriods && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 space-y-4">
              {mockResult.waiting_periods.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <div className="text-xs text-slate-400">{item.condition}</div>
                  <div className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">{item.duration}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sub-limits */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-800/20">
          <button 
            onClick={() => toggleSection('sublimits')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200">📊 Room Rent & Sub-limits ({mockResult.sublimits.length})</span>
            <span className="text-slate-400">{collapsed.sublimits ? '＋' : '－'}</span>
          </button>
          {!collapsed.sublimits && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 space-y-4">
              {mockResult.sublimits.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-4">
                  <div className="text-xs text-slate-400">{item.item}</div>
                  <div className="text-xs font-semibold text-slate-200">{item.limit}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Co-payments */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-800/20">
          <button 
            onClick={() => toggleSection('copayments')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200">🤝 Co-payments ({mockResult.copayments.length})</span>
            <span className="text-slate-400">{collapsed.copayments ? '＋' : '－'}</span>
          </button>
          {!collapsed.copayments && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 space-y-4">
              {mockResult.copayments.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-4">
                  <div className="text-xs text-slate-400">{item.condition}</div>
                  <div className="text-xs font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{item.percentage}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claim Tips */}
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-800/20">
          <button 
            onClick={() => toggleSection('tips')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200">💡 Claim Assistance & Tips</span>
            <span className="text-slate-400">{collapsed.tips ? '＋' : '－'}</span>
          </button>
          {!collapsed.tips && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 space-y-3">
              {mockResult.claim_tips.map((tip, idx) => (
                <div key={idx} className="flex gap-2 text-xs text-slate-300 font-light leading-relaxed">
                  <span className="text-indigo-400 select-none">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 48-hour delete warning info */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
        🕒 For your privacy, the uploaded PDF document will be permanently deleted from our servers 48 hours after upload. Your analysis report will remain accessible under this session.
      </div>

    </div>
  );
}
