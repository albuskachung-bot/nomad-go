import { notFound, redirect } from "next/navigation";
import { updateEmployerJob } from "@/app/actions/employer-jobs";
import JobForm, {
  type JobFormValues
} from "@/app/dashboard/employer/jobs/JobForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EditJobPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getJob(id: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[employer-jobs/edit] Failed to load job.", error);
    return null;
  }

  return data as JobFormValues | null;
}

export default async function EditEmployerJobPage({
  params,
  searchParams
}: EditJobPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  const action = updateEmployerJob.bind(null, id);
  const error = query?.error ?? null;

  return (
    <JobForm
      action={action}
      defaultValues={job}
      error={error}
      mode="edit"
    />
  );
}
