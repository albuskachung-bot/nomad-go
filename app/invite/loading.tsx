export default function InviteLoading() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-6 h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-6 h-28 w-full animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-6 h-12 w-full animate-pulse rounded-lg bg-slate-200" />
        </section>
      </div>
    </main>
  );
}
