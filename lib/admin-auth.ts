import type { User } from "@supabase/supabase-js";
import type { ProfileRole } from "@/lib/types";

export const adminRoles = ["super_admin", "editor"] as const;
export type AdminRole = (typeof adminRoles)[number];

export function isAdminRole(role: ProfileRole | null | undefined): role is AdminRole {
  return adminRoles.includes(role as AdminRole);
}

export function isGoogleUser(user: User | null | undefined) {
  if (!user) {
    return false;
  }

  return (
    user.app_metadata.provider === "google" ||
    Boolean(user.identities?.some((identity) => identity.provider === "google"))
  );
}
