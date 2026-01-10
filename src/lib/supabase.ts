import { createClient } from "@supabase/supabase-js"

// Read environment variables provided by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Safety check (optional but professional)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Create and export Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
