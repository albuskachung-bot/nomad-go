import { createEmployerJob } from "@/app/actions/employer-jobs";
import JobForm from "@/app/dashboard/employer/jobs/JobForm";

type CreateJobPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreateEmployerJobPage({
  searchParams
}: CreateJobPageProps) {
  const query = await searchParams;
  const error = query?.error ?? null;

  return <JobForm action={createEmployerJob} error={error} mode="create" />;
}
