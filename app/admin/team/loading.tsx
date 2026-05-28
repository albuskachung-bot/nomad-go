export default function AdminTeamLoading() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-9 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-52 animate-pulse rounded-full bg-slate-100" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
              <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-5 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-4 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-5 h-11 w-full animate-pulse rounded-lg bg-slate-200" />
        </div>
      </section>
    </div>
  );
}
