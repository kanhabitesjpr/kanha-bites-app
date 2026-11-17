import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
).trim();

function isValidSupabaseUrl(value: string): boolean {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export const supabaseConfigReady =
  isValidSupabaseUrl(supabaseUrl) && supabasePublishableKey.length > 0;

export const supabaseConfigMessage = !supabaseUrl
  ? "VITE_SUPABASE_URL सेट नहीं है।"
  : !isValidSupabaseUrl(supabaseUrl)
    ? "VITE_SUPABASE_URL सही URL नहीं है।"
    : !supabasePublishableKey
      ? "VITE_SUPABASE_PUBLISHABLE_KEY सेट नहीं है।"
      : "";

export const supabase = supabaseConfigReady
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

