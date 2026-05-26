import ProfileEditForm from "@/components/ProfileEditForm";

export default function MemberResumePage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Resume
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-gray-900">
          編輯履歷
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          維護你的個人資料、工作偏好與作品連結，讓未來的媒合、收藏與應徵流程都能共用這份會員履歷。
        </p>
      </div>

      <ProfileEditForm />
    </div>
  );
}
