import { useState } from "react"
import { useAuth } from "./AuthContext"
import { Login, Cadastro, RecuperarSenha } from "./AuthScreens"

type Screen = "login" | "cadastro" | "recuperar"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>("login")
  const [testMode, setTestMode] = useState(false)

  // Acesso de teste: entra direto sem tocar no Supabase
  if (testMode) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse 90% 80% at 28% 35%, #081830 0%, #020c1e 55%, #010815 100%)" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#5a7ab0", letterSpacing: "0.16em" }}>
          CARREGANDO…
        </span>
      </div>
    )
  }

  if (!user) {
    if (screen === "cadastro") return <Cadastro onGoLogin={() => setScreen("login")} />
    if (screen === "recuperar") return <RecuperarSenha onGoLogin={() => setScreen("login")} />
    return (
      <Login
        onGoRegister={() => setScreen("cadastro")}
        onGoRecover={() => setScreen("recuperar")}
        onTestAccess={() => setTestMode(true)}
      />
    )
  }

  return <>{children}</>
}
