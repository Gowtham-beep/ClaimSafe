export default function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-7 w-2/3 rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="h-12 rounded bg-slate-100" />
          <div className="h-12 rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-5 w-1/2 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}
