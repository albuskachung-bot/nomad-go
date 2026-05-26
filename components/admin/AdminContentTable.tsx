import AdminRowActions from "@/components/admin/AdminRowActions";
import type { ContentStatus } from "@/lib/types";

type AdminContentTableName = "jobs" | "guides" | "profiles";

export type AdminContentRow = {
  id: string;
  title: string;
  subtitle: string;
  submittedAt: string;
  status: ContentStatus;
  isFeatured: boolean;
};

type AdminContentTableProps = {
  table: AdminContentTableName;
  rows: AdminContentRow[];
  titleHeader: string;
  subtitleHeader: string;
};

const statusStyles: Record<ContentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700"
};

const statusLabels: Record<ContentStatus, string> = {
  pending: "Pending",
  published: "Published",
  rejected: "Rejected"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export default function AdminContentTable({
  table,
  rows,
  titleHeader,
  subtitleHeader
}: AdminContentTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">{titleHeader}</th>
              <th className="px-5 py-3">{subtitleHeader}</th>
              <th className="px-5 py-3">提交日期</th>
              <th className="px-5 py-3">狀態</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-gray-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{row.title}</div>
                </td>
                <td className="px-5 py-4 text-gray-500">{row.subtitle}</td>
                <td className="px-5 py-4 text-gray-500">{formatDate(row.submittedAt)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status]}`}
                  >
                    {statusLabels[row.status]}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <AdminRowActions
                    table={table}
                    id={row.id}
                    status={row.status}
                    isFeatured={row.isFeatured}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">目前沒有資料。</div>
      ) : null}
    </div>
  );
}
