import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Processing from './pages/Processing';
import Results from './pages/Results';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
        
        {/* Navigation Bar */}
        <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                ClaimSafe
              </span>
            </a>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Service Status: Operational</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/processing/:jobId" element={<Processing />} />
            <Route path="/results/:policyId" element={<Results />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/60 bg-slate-950/20 py-8 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 space-y-2">
            <div>© {new Date().getFullYear()} ClaimSafe. All rights reserved.</div>
            <div className="text-[10px] max-w-md mx-auto text-slate-600 font-light leading-relaxed">
              Disclaimer: ClaimSafe is an independent analysis tool and is not affiliated with any insurance company. Analyses are generated for information purposes; refer to your policy documents for legal terms.
            </div>
          </div>
        </footer>

      </div>
    </Router>
  );
}
