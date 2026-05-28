import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole, isGoogleUser, isPrimaryAdminEmail } from "@/lib/admin-auth";
import type { Profile } from "@/lib/types";

export async function getCurrentAdminContext() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      supabase,
      user: null,
      profile: null,
      isGoogle: false,
      isAdmin: false,
      isSuperAdmin: false
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
      isGoogle: false,
      isAdmin: false,
      isSuperAdmin: false
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as Profile | null;
  const role = typedProfile?.role ?? null;
  const primaryAdmin = isPrimaryAdminEmail(user.email);
  const admin = primaryAdmin || isAdminRole(role);

  return {
    supabase,
    user,
    profile: typedProfile,
    isGoogle: isGoogleUser(user),
    isAdmin: admin,
    isSuperAdmin: primaryAdmin || role === "super_admin"
  };
}
