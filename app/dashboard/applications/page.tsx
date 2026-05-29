import ApplicationTracker from "@/components/dashboard/ApplicationTracker";

export default function DashboardApplicationsPage() {
  return (
    <main className="min-h-screen bg-sky-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <ApplicationTracker />
      </div>
    </main>
  );
}
