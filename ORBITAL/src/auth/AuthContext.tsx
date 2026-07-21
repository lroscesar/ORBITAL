import { createContext, useContext, useEffect, useState } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase, getUserRole, type UserRole } from "../lib/supabase"

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: UserRole
  isEditor: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null, session: null, role: "Leitor", isEditor: false, loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const role     = getUserRole(user)
  const isEditor = role === "Editor"

  return (
    <AuthContext.Provider value={{ user, session, role, isEditor, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
