import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type GuestbookEntry = {
  id: string;
  name: string;
  message: string | null;
  is_secret: boolean;
  created_at: string;
};

export type AdminGuestbookEntry = Omit<GuestbookEntry, "message"> & {
  message: string;
  is_hidden: boolean;
};

type Database = {
  public: {
    Tables: {
      guestbook_entries: {
        Row: AdminGuestbookEntry;
        Insert: { name: string; message: string; is_secret?: boolean };
        Update: { is_hidden?: boolean };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_guestbook_entries: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: GuestbookEntry[];
      };
      submit_guestbook_entry: {
        Args: { p_name: string; p_message: string; p_is_secret?: boolean };
        Returns: undefined;
      };
      is_guestbook_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();

function hasPublicConfiguration() {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return false;
    if (supabaseKey.startsWith("sb_publishable_")) return true;
    // Legacy anon keys are JWTs. Never accept a service_role/secret key here.
    const payload = supabaseKey.split(".")[1];
    return Boolean(payload && JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role === "anon");
  } catch {
    return false;
  }
}

export const guestbookConfigured = hasPublicConfiguration();
export const GUESTBOOK_PAGE_SIZE = 10;
let client: SupabaseClient<Database> | null = null;

export function getGuestbookClient() {
  if (!guestbookConfigured || typeof window === "undefined") return null;
  client ??= createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "implicit", // Email links also work when opened on a different device.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: /\/admin\/?$/.test(window.location.pathname),
      storageKey: "wedding-guestbook-admin",
    },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
  });
  return client;
}

export function formatGuestbookDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}
