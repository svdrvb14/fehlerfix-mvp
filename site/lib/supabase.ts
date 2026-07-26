import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY müssen in .env.local gesetzt sein."
  );
}

// Browser-Client mit dem öffentlichen anon-Key (RLS greift immer).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
