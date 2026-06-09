import TalentGrid from "@/app/employer/talents/TalentGrid";

export default function EmployerTalentsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Discover Talents
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            主動尋才
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            探索並邀請頂尖的全球華語數位遊牧人才加入您的團隊。
          </p>
        </div>

        <div id="talent-grid-container" className="mt-8">
          <TalentGrid />
        </div>
      </section>
    </main>
  );
}
