import { Resend } from "resend";

export function createResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export function getEmailFrom() {
  return process.env.RESEND_FROM_EMAIL ?? "NOMAD-GO <hello@example.com>";
}
