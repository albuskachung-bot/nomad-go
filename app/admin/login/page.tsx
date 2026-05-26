import AdminGoogleLogin from "@/components/AdminGoogleLogin";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <div className="w-full rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Internal Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-gray-900">
            NOMAD-GO 營運後台登入
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            請使用已授權的 Google 帳號進入營運後台。
          </p>
          <div className="mt-6">
            <AdminGoogleLogin />
          </div>
        </div>
      </section>
    </main>
  );
}
