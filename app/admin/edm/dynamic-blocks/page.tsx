import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Blocks, CircleAlert, Code2 } from "lucide-react";
import DynamicBlockForm from "@/app/admin/edm/dynamic-blocks/DynamicBlockForm";
import { getCurrentAdminContext } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EdmDynamicBlock } from "@/lib/types";

type DynamicBlocksResult = {
  blocks: EdmDynamicBlock[];
  error: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function getDynamicBlocks(): Promise<DynamicBlocksResult> {
  const context = await getCurrentAdminContext();

  if (!context.supabase || !context.user) {
    redirect("/admin/login");
  }

  if (!context.isSuperAdmin && context.profile?.role !== "super_admin") {
    redirect("/admin");
  }

  const supabase = createSupabaseAdminClient() ?? context.supabase;
  const { data, error } = await supabase
    .from("edm_dynamic_blocks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      blocks: [],
      error: error.message
    };
  }

  return {
    blocks: (data ?? []) as EdmDynamicBlock[],
    error: null
  };
}

export default async function AdminEdmDynamicBlocksPage() {
  const { blocks, error } = await getDynamicBlocks();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/edm"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回 EDM 列表
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Dynamic Blocks
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            動態內容區塊
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            建立可插入 EDM HTML 的個人化區塊，發信時會依收件人的 Profile 角色判斷是否顯示。
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
          <Blocks className="h-3.5 w-3.5" aria-hidden="true" />
          Super Admin only
        </span>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">動態區塊讀取失敗。</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {blocks.map((block) => (
            <DynamicBlockForm key={block.id} block={block} mode="edit" />
          ))}

          {blocks.length === 0 && !error ? (
            <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
              <Code2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-slate-900">
                尚未建立動態區塊
              </p>
              <p className="mt-2 text-sm text-slate-500">
                先建立一個區塊，再把插入標籤放進 EDM HTML 內容。
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <DynamicBlockForm mode="create" />

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">插入規則</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              區塊名稱會轉成插入標籤，例如名稱為{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                engineer_jobs
              </code>{" "}
              時，EDM 內容可使用{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                {"{{block_engineer_jobs}}"}
              </code>
              。
            </p>

            {blocks.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {blocks.slice(0, 5).map((block) => (
                  <div
                    key={block.id}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
                  >
                    <p className="font-semibold text-slate-800">
                      {`{{block_${slugify(block.name)}}}`}
                    </p>
                    <p className="mt-1">目標角色：{block.target_role}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
