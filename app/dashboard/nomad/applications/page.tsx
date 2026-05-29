import { BriefcaseBusiness, CalendarDays } from "lucide-react";

type ApplicationStatus = "pending" | "reviewed" | "interview" | "rejected" | "hired";

type ApplicationRecord = {
  id: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  status: ApplicationStatus;
};

const mockApplications: ApplicationRecord[] = [
  {
    id: "app-1",
    jobTitle: "Remote Product Manager",
    company: "Voyage Cloud",
    appliedAt: "2026-05-18",
    status: "interview"
  },
  {
    id: "app-2",
    jobTitle: "Frontend Engineer, Growth",
    company: "Nomad Commerce Lab",
    appliedAt: "2026-05-12",
    status: "reviewed"
  },
  {
    id: "app-3",
    jobTitle: "Community Operations Lead",
    company: "Borderless Studio",
    appliedAt: "2026-05-06",
    status: "pending"
  }
];

const statusStyles: Record<
  ApplicationStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "審核中",
    className: "bg-gray-100 text-gray-600"
  },
  reviewed: {
    label: "企業已讀",
    className: "bg-sky-50 text-sky-700"
  },
  interview: {
    label: "面試邀約",
    className: "bg-emerald-50 text-emerald-700"
  },
  rejected: {
    label: "未錄取",
    className: "bg-rose-50 text-rose-700"
  },
  hired: {
    label: "錄取",
    className: "bg-emerald-100 text-emerald-800"
  }
};

export default function NomadApplicationsPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Applications
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-gray-900">
          應徵紀錄
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          追蹤已投遞職缺的處理狀態，快速掌握下一步安排。
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">近期投遞</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {mockApplications.map((application) => {
            const status = statusStyles[application.status];

            return (
              <div
                key={application.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-gray-50 md:grid-cols-[minmax(0,1fr)_160px_120px]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {application.jobTitle}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{application.company}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <time dateTime={application.appliedAt}>{application.appliedAt}</time>
                </div>

                <div className="flex items-center md:justify-end">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
