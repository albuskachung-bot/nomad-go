import { redirect } from "next/navigation";

export default function DeprecatedProfileSavedPage() {
  redirect("/dashboard/nomad/saved");
}
