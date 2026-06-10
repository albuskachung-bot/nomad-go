import { createEmployerJob } from "@/app/employer/jobs/actions";
import JobForm from "@/app/employer/jobs/JobForm";

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
