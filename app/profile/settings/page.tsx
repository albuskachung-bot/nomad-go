import { redirect } from "next/navigation";

export default function DeprecatedProfileSettingsPage() {
  redirect("/dashboard/nomad/settings");
}
