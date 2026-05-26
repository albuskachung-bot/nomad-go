import { Bell, Lock, Mail } from "lucide-react";

const settings = [
  {
    title: "Email 通知",
    description: "接收職缺更新、VIP 到期提醒與平台公告。",
    icon: Mail
  },
  {
    title: "帳號安全",
    description: "管理登入方式與第三方 OAuth 連結狀態。",
    icon: Lock
  },
  {
    title: "偏好設定",
    description: "調整職缺推薦、城市指南與工具通知偏好。",
    icon: Bell
  }
];

export default function NomadSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Settings
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-gray-900">
          帳號設定
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          管理通知、安全與推薦偏好。MVP 階段先保留設定入口。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {settings.map((item) => {
          const Icon = item.icon;

          return (
            <section key={item.title} className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{item.description}</p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
