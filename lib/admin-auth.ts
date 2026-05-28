import type { User } from "@supabase/supabase-js";
import type { ProfileRole } from "@/lib/types";

export const adminRoles = ["super_admin", "editor", "reviewer"] as const;
export type AdminRole = (typeof adminRoles)[number];
export const profileRoles: ProfileRole[] = ["member", ...adminRoles];
export const primaryAdminEmail = "albus.kachung@gmail.com";

export function isPrimaryAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === primaryAdminEmail;
}

export function isAdminRole(role: ProfileRole | null | undefined): role is AdminRole {
  return adminRoles.includes(role as AdminRole);
}

export function isProfileRole(role: string | null | undefined): role is ProfileRole {
  return profileRoles.includes(role as ProfileRole);
}

export function canManageSiteSettings(role: ProfileRole | null | undefined) {
  return role === "super_admin" || role === "editor";
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
