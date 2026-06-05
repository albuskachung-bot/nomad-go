import Link from "next/link";
import { PenLine } from "lucide-react";

export type BlogAuthorProfile = {
  id: string;
  full_name?: string | null;
  title?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
};

export function getPostAuthorDisplay(author: BlogAuthorProfile | null) {
  return {
    name: author?.full_name?.trim() || author?.title?.trim() || "NOMAD-GO 作者",
    title: author?.job_title?.trim() || author?.title?.trim() || "遠端工作者",
    avatarUrl: author?.avatar_url?.trim() || null,
    profileHref: author ? `/talents/${author.id}` : null
  };
}

export default function AuthorBadge({ author }: { author: BlogAuthorProfile | null }) {
  const display = getPostAuthorDisplay(author);
  const avatar = display.avatarUrl ? (
    <div
      className="h-14 w-14 rounded-xl bg-slate-100 bg-cover bg-center ring-1 ring-slate-200"
      style={{ backgroundImage: `url(${display.avatarUrl})` }}
      aria-label={`${display.name} 頭像`}
    />
  ) : (
    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
      <PenLine className="h-6 w-6" aria-hidden="true" />
    </span>
  );

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      {display.profileHref ? (
        <Link href={display.profileHref} className="inline-flex rounded-xl">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <h2 className="mt-4 text-base font-semibold text-slate-950">
        {display.profileHref ? (
          <Link href={display.profileHref} className="underline-offset-4 hover:underline">
            {display.name}
          </Link>
        ) : (
          display.name
        )}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{display.title}</p>
      {display.profileHref ? (
        <Link
          href={display.profileHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          查看作者個人頁
        </Link>
      ) : null}
    </div>
  );
}
