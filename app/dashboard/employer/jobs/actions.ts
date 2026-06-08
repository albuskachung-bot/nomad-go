"use server";

export {
  createEmployerJob,
  createEmployerJob as createJob,
  deleteJob,
  toggleJobStatus,
  updateEmployerJob,
  updateEmployerJob as updateJob
} from "@/app/actions/employer-jobs";
export type { JobStatus } from "@/app/actions/employer-jobs";
