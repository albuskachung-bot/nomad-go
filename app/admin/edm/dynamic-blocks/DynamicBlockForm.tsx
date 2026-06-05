"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Save, Trash2, XCircle } from "lucide-react";
import {
  deleteEdmDynamicBlock,
  saveEdmDynamicBlock
} from "@/app/actions/edm";
import type { EdmDynamicBlock } from "@/lib/types";

type DynamicBlockFormProps = {
  block?: EdmDynamicBlock | null;
  mode: "create" | "edit";
};

type Toast = {
  type: "success" | "error";
  message: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function DynamicBlockForm({ block, mode }: DynamicBlockFormProps) {
  const [name, setName] = useState(block?.name ?? "");
  const [targetRole, setTargetRole] = useState(block?.target_role ?? "engineer");
  const [htmlContent, setHtmlContent] = useState(block?.html_content ?? "");
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();
  const token = useMemo(() => `{{block_${slugify(name || "engineer_jobs")}}}`, [name]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function submitBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPendingAction("save");

    startTransition(() => {
      saveEdmDynamicBlock(formData)
        .then((result) => {
          setToast({
            type: result.ok ? "success" : "error",
            message: result.message
          });

          if (result.ok && mode === "create") {
            setName("");
            setTargetRole("engineer");
            setHtmlContent("");
          }
        })
        .catch((error) => {
          setToast({
            type: "error",
            message:
              error instanceof Error ? error.message : "動態區塊儲存失敗。"
          });
        })
        .finally(() => setPendingAction(null));
    });
  }

  function deleteBlock() {
    if (!block?.id) {
      return;
    }

    const formData = new FormData();
    formData.set("block_id", block.id);
    setPendingAction("delete");

    startTransition(() => {
      deleteEdmDynamicBlock(formData)
        .then((result) => {
          setToast({
            type: result.ok ? "success" : "error",
            message: result.message
          });
        })
        .catch((error) => {
          setToast({
            type: "error",
            message:
              error instanceof Error ? error.message : "動態區塊刪除失敗。"
          });
        })
        .finally(() => setPendingAction(null));
    });
  }

  const isSaving = isPending && pendingAction === "save";
  const isDeleting = isPending && pendingAction === "delete";

  return (
    <form
      onSubmit={submitBlock}
      className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <input type="hidden" name="block_id" value={block?.id ?? ""} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">
            {mode === "create" ? "新增動態區塊" : name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">插入標籤：{token}</p>
        </div>

        {mode === "edit" ? (
          <button
            type="button"
            onClick={deleteBlock}
            disabled={isPending}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            刪除
          </button>
        ) : null}
      </div>

      {toast ? (
        <div
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
          role="status"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">區塊名稱</span>
          <input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="engineer_jobs"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">目標角色</span>
          <input
            name="target_role"
            required
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="engineer"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">HTML 內容</span>
        <textarea
          name="html_content"
          required
          rows={7}
          value={htmlContent}
          onChange={(event) => setHtmlContent(event.target.value)}
          placeholder="<section><h2>工程師職缺精選</h2>...</section>"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm leading-6 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          儲存區塊
        </button>
      </div>
    </form>
  );
}
