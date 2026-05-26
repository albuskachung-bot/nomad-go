import { ShieldCheck } from "lucide-react";
import { updateAdminRoleByEmail } from "@/app/admin/actions";
import { getCurrentAdminContext } from "@/lib/admin";

export default async function AdminUserRolesPage() {
  const { isSuperAdmin } = await getCurrentAdminContext();

  if (!isSuperAdmin) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-semibold text-gray-900">無權限訪問</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          只有 super_admin 可以查看並操作管理員權限設定。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            User Roles
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-gray-900">
            權限管理
          </h1>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">
        輸入已註冊使用者的 Email，將其加入後台白名單。此頁僅允許 super_admin 存取。
      </p>

      <form action={updateAdminRoleByEmail} className="mt-8 grid max-w-2xl gap-5">
        <label className="block">
          <span className="text-sm font-medium text-gray-900">使用者 Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="editor@example.com"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-900">後台角色</span>
          <select
            name="role"
            defaultValue="editor"
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="editor">Editor 內容管理員</option>
            <option value="super_admin">Admin / Super Admin</option>
            <option value="user">User 一般會員</option>
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
        >
          更新權限
        </button>
      </form>
    </div>
  );
}
