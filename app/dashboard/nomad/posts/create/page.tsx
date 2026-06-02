import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PostEditorForm from "@/app/dashboard/nomad/posts/PostEditorForm";

export default function CreateNomadPostPage() {
  return (
    <div className="space-y-6">
      <section>
        <Link
          href="/dashboard/nomad/posts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回我的專欄
        </Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-emerald-700">
          New Post
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
          新增文章
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          撰寫遊牧生活、城市觀察、咖啡廳推薦或遠端工作心得。發布後文章會出現在前台遊牧專欄。
        </p>
      </section>

      <PostEditorForm />
    </div>
  );
}
