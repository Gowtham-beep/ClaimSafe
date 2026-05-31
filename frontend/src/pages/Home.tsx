import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Simulate file upload and navigate to mock job
      const mockJobId = "job_" + Math.random().toString(36).substr(2, 9);
      navigate(`/processing/${mockJobId}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const mockJobId = "job_" + Math.random().toString(36).substr(2, 9);
      navigate(`/processing/${mockJobId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Header Section */}
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          🇮🇳 For Indian Insurance Policies
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">
          ClaimSafe
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          Upload your insurance policy PDF and get a plain-English risk breakdown. Know your exclusions, waiting periods, and sub-limits before you claim.
        </p>
      </div>

      {/* Main Upload Box */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative group rounded-2xl border border-dashed p-12 text-center transition-all duration-300 backdrop-blur-xl ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_50px_rgba(79,70,229,0.15)]Scale-98' 
            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
        }`}
      >
        <input 
          type="file" 
          id="file-upload" 
          accept=".pdf"
          className="hidden" 
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer block space-y-6">
          {/* Animated upload icon */}
          <div className="mx-auto w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-inner">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Drag & drop your policy PDF</h3>
            <p className="text-sm text-slate-400">or <span className="text-indigo-400 group-hover:underline">browse files</span> from your computer</p>
          </div>

          <div className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed border-t border-slate-800/60 pt-6">
            Supports Health, Term Life, and Vehicle Insurance policies from all major Indian insurers (LIC, Star Health, HDFC Ergo, etc.)
          </div>
        </label>
      </div>

      {/* Trust / Privacy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-center">
        <div className="p-6 rounded-2xl bg-slate-800/20 border border-slate-800/50 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-white mb-1">Strictly Confidential</h4>
          <p className="text-xs text-slate-400">Your policy PDF is automatically deleted from our servers after 48 hours.</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-800/20 border border-slate-800/50 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-white mb-1">No Sales Motive</h4>
          <p className="text-xs text-slate-400">We don't sell policies, take commissions, or recommend other plans. Just unbiased risk analysis.</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-800/20 border border-slate-800/50 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-white mb-1">Instant Results</h4>
          <p className="text-xs text-slate-400">Our 3-pass LLM pipeline extracts, validates, and reports risk clauses within 60 seconds.</p>
        </div>
      </div>
    </div>
  );
}
