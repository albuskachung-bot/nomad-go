import { redirect } from "next/navigation";

export default function DeprecatedProfileEditPage() {
  redirect("/dashboard/nomad/resume");
}
