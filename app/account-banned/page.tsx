import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccountBannedPage() {
  return (
    <div className="bg-gray-50 px-4 py-20">
      <section className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-normal text-gray-900">
          帳號已停權
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          此帳號目前無法存取會員中心與發布相關功能。如需協助，請聯繫 NOMAD-GO 管理團隊。
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
        >
          回到首頁
        </Link>
      </section>
    </div>
  );
}
