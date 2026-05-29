export default function EmployerTeamLoading() {
  return (
    <div className="space-y-6">
      <section>
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-9 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-5 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-5 h-28 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
      </section>
    </div>
  );
}
