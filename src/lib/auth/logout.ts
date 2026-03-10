"use client";

import { createClient } from "@/lib/supabase/client";

export async function logoutAndRedirect() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } finally {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }
}
