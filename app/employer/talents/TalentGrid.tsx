import { Clock3 } from "lucide-react";
import ViewProfileButton from "@/app/employer/talents/ViewProfileButton";

export type PublicTalent = {
  id: string;
  name: string;
  title: string;
  skills: string[];
  timezone: string | null;
  avatarUrl: string | null;
};

type TalentCardProps = {
  talent: PublicTalent;
};

function getInitials(talent: PublicTalent) {
  const source = talent.name || talent.title || "Talent";
  return source.trim().slice(0, 2).toUpperCase();
}

function TalentAvatar({ talent }: { talent: PublicTalent }) {
  if (talent.avatarUrl) {
    return (
      <div
        className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 bg-cover bg-center ring-1 ring-slate-200"
        style={{ backgroundImage: `url(${talent.avatarUrl})` }}
        aria-label={`${talent.name} 大頭照`}
      />
    );
  }

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">
      {getInitials(talent)}
    </span>
  );
}

function TalentCard({ talent }: TalentCardProps) {
  const visibleSkills = talent.skills.slice(0, 3);

  return (
    <article className="flex min-h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <TalentAvatar talent={talent} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-500">{talent.name}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal text-slate-950">
            {talent.title}
          </h2>
        </div>
      </div>

      <div className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {talent.timezone ?? "時區未設定"}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {visibleSkills.length > 0 ? (
          visibleSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            技能待補充
          </span>
        )}
      </div>

      <ViewProfileButton targetUserId={talent.id} />
    </article>
  );
}

export default function TalentGrid({
  talents,
  error
}: {
  talents: PublicTalent[];
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (talents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-950">目前尚無公開人才履歷</p>
        <p className="mt-2 text-sm text-slate-500">
          下一階段串接篩選與邀請流程後，人才卡片會顯示在這裡。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {talents.map((talent) => (
        <TalentCard
          key={talent.id}
          talent={talent}
        />
      ))}
    </div>
  );
}
