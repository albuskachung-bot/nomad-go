import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole, isGoogleUser } from "@/lib/admin-auth";
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
  const admin = isAdminRole(typedProfile?.role);

  return {
    supabase,
    user,
    profile: typedProfile,
    isGoogle: isGoogleUser(user),
    isAdmin: admin,
    isSuperAdmin: typedProfile?.role === "super_admin"
  };
}
