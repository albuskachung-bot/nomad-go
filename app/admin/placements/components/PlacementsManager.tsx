"use client";

import { useState } from "react";
import PlacementForm from "@/app/admin/placements/components/PlacementForm";
import type { PlatformPlacement, PlatformPlacementLocation } from "@/lib/types";

const placementLocations: PlatformPlacementLocation[] = [
  "announcement_bar",
  "hero_banner",
  "in_feed_ad"
];

const locationLabels: Record<PlatformPlacementLocation, string> = {
  announcement_bar: "頂部公告列",
  hero_banner: "首頁 Hero Banner",
  in_feed_ad: "資訊流廣告"
};

type PlacementsManagerProps = {
  placements: PlatformPlacement[];
  togglePlacementActiveAction: (formData: FormData) => Promise<void>;
  deletePlacementAction: (formData: FormData) => Promise<void>;
};

export default function PlacementsManager({
  placements,
  togglePlacementActiveAction,
  deletePlacementAction
}: PlacementsManagerProps) {
  const [editTarget, setEditTarget] = useState<PlatformPlacement | null>(null);
  const groupedPlacements = placementLocations.map((location) => ({
    location,
    items: placements.filter((placement) => placement.location === location)
  }));

  function startEditing(placement: PlatformPlacement) {
    setEditTarget(placement);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <PlacementForm
        initialData={editTarget}
        onCancelEdit={() => setEditTarget(null)}
      />

      {groupedPlacements.map(({ location, items }) => (
        <section
          key={location}
          className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">{locationLabels[location]}</h2>
            <p className="mt-1 text-xs text-slate-500">{location}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">內容</th>
                  <th className="px-6 py-4">連結</th>
                  <th className="px-6 py-4">排序</th>
                  <th className="px-6 py-4">狀態</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((placement) => (
                  <tr key={placement.id} className="transition hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">{placement.title}</p>
                      {placement.subtitle ? (
                        <p className="mt-1 text-xs text-slate-500">{placement.subtitle}</p>
                      ) : null}
                      {placement.image_url ? (
                        <p className="mt-1 max-w-sm truncate text-xs text-slate-400">
                          {placement.image_url}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5">
                      {placement.link_url ? (
                        <div>
                          <p className="max-w-xs truncate font-medium text-slate-700">
                            {placement.link_url}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {placement.link_text ?? "未設定按鈕文字"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">未設定</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-slate-600">{placement.sort_order}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                          placement.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {placement.is_active ? "啟用" : "停用"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(placement)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                        >
                          編輯
                        </button>
                        <form action={togglePlacementActiveAction}>
                          <input type="hidden" name="id" value={placement.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={String(!placement.is_active)}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                          >
                            {placement.is_active ? "停用" : "啟用"}
                          </button>
                        </form>
                        <form action={deletePlacementAction}>
                          <input type="hidden" name="id" value={placement.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            刪除
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              目前沒有此位置的版位。
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}
