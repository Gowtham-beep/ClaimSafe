import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Processing from './pages/Processing';
import Results from './pages/Results';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/processing/:jobId" element={<Processing />} />
        <Route path="/results/:policyId" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
