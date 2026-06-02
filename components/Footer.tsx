import Link from "next/link";
import { ExternalLink, Mail, MapPinned } from "lucide-react";
import { getCachedFooterSettings } from "@/lib/site-settings";

const socialLabels: Record<string, string> = {
  instagram: "Instagram",
  threads: "Threads",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X"
};

function getSocialEntries(socialLinks: Record<string, string>) {
  return Object.entries(socialLinks)
    .map(([key, url]) => ({
      key,
      label: socialLabels[key] ?? key,
      url: url.trim()
    }))
    .filter((item) => item.url.length > 0);
}

export default async function Footer() {
  const settings = await getCachedFooterSettings();
  const socialEntries = getSocialEntries(settings.social_links);

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <div className="text-base font-semibold text-gray-900">NOMAD-GO 遊牧出發</div>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-500">
            {settings.footer_description}
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
            {socialEntries.map((item) => (
              <a
                key={item.key}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-blue-600"
              >
                {item.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-900">聯絡</div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-gray-500">
            <a
              href={`mailto:${settings.contact_email}`}
              className="inline-flex items-center gap-2 hover:text-blue-600"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {settings.contact_email}
            </a>
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
