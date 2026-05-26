import { redirect } from "next/navigation";

export default function DeprecatedProfileIndexPage() {
  redirect("/dashboard/nomad");
}
