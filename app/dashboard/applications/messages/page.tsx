import { redirect } from "next/navigation";

type LegacyApplicantMessagesPageProps = {
  searchParams?: Promise<{
    application_id?: string | string[];
    error?: string | string[];
  }>;
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LegacyApplicantMessagesPage({
  searchParams
}: LegacyApplicantMessagesPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextParams = new URLSearchParams();
  const applicationId = readParam(params.application_id)?.trim();
  const error = readParam(params.error)?.trim();

  if (applicationId) {
    nextParams.set("application_id", applicationId);
  }

  if (error) {
    nextParams.set("error", error);
  }

  const queryString = nextParams.toString();

  redirect(
    `/dashboard/nomad/applications/messages${queryString ? `?${queryString}` : ""}`
  );
}
