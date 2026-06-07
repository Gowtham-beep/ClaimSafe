import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { uploadPolicy } from '../api/client';

const maxFileSize = 20 * 1024 * 1024;

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const selectFile = (file?: File) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(null);
      setError('Please select a PDF policy document.');
      return;
    }
    if (file.size > maxFileSize) {
      setSelectedFile(null);
      setError('File size must be 20MB or less.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError('');

    try {
      const response = await uploadPolicy(selectedFile);
      navigate(`/processing/${response.job_id}`, {
        state: {
          policy_id: response.policy_id,
          session_id: response.session_id,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-slate-50 px-4 py-6">
      <header className="absolute left-4 top-5 sm:left-8">
        <a href="/" className="block rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
          <span className="text-lg font-bold tracking-tight text-slate-900">ClaimSafe</span>
          <span className="block text-sm text-slate-500">Know what your policy actually covers.</span>
        </a>
      </header>

      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center pb-16 pt-24">
        <div className="animate-page-enter text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Upload your policy. Understand your risk.</h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            We analyse your insurance policy and surface every clause that could cause a claim rejection or financial surprise. Plain English. No sales pitch.
          </p>
        </div>

        <div className="mt-8 animate-card-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              selectFile(event.dataTransfer.files[0]);
            }}
            className={`rounded-lg border border-dashed p-10 text-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              isDragging ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-600 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              {selectedFile ? <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" /> : <FileUp className="h-7 w-7" aria-hidden="true" />}
            </div>
            {selectedFile ? (
              <div className="mt-5">
                <p className="break-words text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                <p className="mt-1 text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-900">Drop your policy PDF here</p>
                <p className="mt-1 text-sm text-slate-500">or click to browse — max 20MB</p>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handleUpload}
            className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              selectedFile && !isUploading
                ? 'cursor-pointer bg-blue-600 text-white hover:scale-[1.01] hover:bg-blue-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            } ${isUploading ? 'bg-blue-600 text-white' : ''}`}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isUploading ? 'Uploading...' : 'Analyse My Policy'}
          </button>
          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-xs text-slate-500">
          <span>🔒 PDF deleted after 48 hours</span>
          <span>📋 No account required</span>
          <span>⚡ Results in ~2 minutes</span>
        </div>
      </section>

      <footer className="absolute bottom-6 left-0 right-0 px-4 text-center text-xs text-slate-400">
        Built by Gowtham N · github.com/gowtham-n
      </footer>
    </main>
  );
}
