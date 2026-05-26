import Link from "next/link";
import { Mail, MapPinned } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <div className="text-base font-semibold text-gray-900">NOMAD-GO 遊牧出發</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-500">
            為華語遠端工作者整理職缺、城市情報與出發工具，讓每一次移動都更有掌握。
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-900">探索</div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-gray-500">
            <Link href="/jobs" className="hover:text-blue-600">
              遠端職缺
            </Link>
            <Link href="/toolkit" className="hover:text-blue-600">
              實用工具
            </Link>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-900">聯絡</div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" />
              hello@nomad-go.example
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPinned className="h-4 w-4" aria-hidden="true" />
              Taiwan friendly, global first
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-4 text-center text-xs text-gray-500">
        © 2026 NOMAD-GO. All rights reserved.
      </div>
    </footer>
  );
}
