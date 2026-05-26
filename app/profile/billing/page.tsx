import { redirect } from "next/navigation";

export default function DeprecatedProfileBillingPage() {
  redirect("/dashboard/nomad/billing");
}
