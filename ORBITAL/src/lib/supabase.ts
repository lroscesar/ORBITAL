import { createClient } from "@supabase/supabase-js"
import { projectId, publicAnonKey } from "../../utils/supabase/info"

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
)

export type UserRole = "Editor" | "Leitor"

export function getUserRole(user: { user_metadata?: { role?: string } } | null): UserRole {
  return (user?.user_metadata?.role as UserRole) ?? "Leitor"
}
