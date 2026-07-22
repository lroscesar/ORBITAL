import { useState } from "react"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

const mono = "'JetBrains Mono', monospace"
const exo  = "'Exo 2', sans-serif"

const BG   = "#020c1e"
const CARD = "#071428"
const PRI  = "#6A9CFD"
const MUT  = "#5a7ab0"
const BORD = "rgba(106,156,253,0.18)"
const FG   = "#cee0ff"

// ── Shared primitives ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse 90% 80% at 28% 35%, #081830 0%, #020c1e 55%, #010815 100%)" }}>
      <div className="w-full max-w-sm rounded-2xl p-8 flex flex-col gap-6"
        style={{ background: CARD, border: `1px solid ${BORD}`, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "radial-gradient(circle at 35% 35%, #AEE4FF33, #033495aa)", border: "1.5px solid #6A9CFD55", boxShadow: "0 0 14px #6A9CFD44" }}>
            <span style={{ fontFamily: mono, fontSize: 13, color: "#AEE4FF" }}>✦</span>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: FG, letterSpacing: "0.18em" }}>DIVAS POP</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: "0.1em" }}>TAR · TEORIA DA PROMESSA</div>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ type = "text", value, onChange, placeholder }: {
  type?: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
      style={{ fontFamily: mono, background: "#061428", border: `1px solid ${BORD}`, color: FG, transition: "border-color 0.2s" }}
      onFocus={e => (e.currentTarget.style.borderColor = `${PRI}66`)}
      onBlur={e  => (e.currentTarget.style.borderColor = BORD)}
    />
  )
}

function Btn({ children, onClick, type = "button", variant = "primary", disabled }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"
  variant?: "primary" | "ghost"; disabled?: boolean
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all"
      style={{
        fontFamily: mono, cursor: disabled ? "not-allowed" : "pointer",
        background: variant === "primary" ? (disabled ? `${PRI}55` : PRI) : "transparent",
        color: variant === "primary" ? "#061428" : MUT,
        border: variant === "ghost" ? `1px solid ${BORD}` : "none",
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (!disabled && variant === "primary") e.currentTarget.style.background = "#25D4B8" }}
      onMouseLeave={e => { if (!disabled && variant === "primary") e.currentTarget.style.background = PRI }}
    >
      {children}
    </button>
  )
}

function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="text-xs transition-colors"
      style={{ fontFamily: mono, color: MUT, background: "none", border: "none", cursor: "pointer" }}
      onMouseEnter={e => (e.currentTarget.style.color = PRI)}
      onMouseLeave={e => (e.currentTarget.style.color = MUT)}>
      {children}
    </button>
  )
}

function ErrMsg({ msg }: { msg: string }) {
  return msg ? (
    <p style={{ fontFamily: mono, fontSize: 10, color: "#ef4444" }}>{msg}</p>
  ) : null
}

function OkMsg({ msg }: { msg: string }) {
  return msg ? (
    <p style={{ fontFamily: mono, fontSize: 10, color: PRI }}>{msg}</p>
  ) : null
}

// ── Cadastro (RF21) ───────────────────────────────────────────────────────────

export function Cadastro({ onGoLogin }: { onGoLogin: () => void }) {
  const [nome,  setNome]  = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [papel, setPapel] = useState<"Editor" | "Leitor">("Editor")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [ok,  setOk]  = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(""); setOk("")
    if (!nome.trim()) { setErr("Nome é obrigatório."); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, role: papel } },
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setOk("Conta criada! Verifique seu e-mail para confirmar o cadastro.")
  }

  return (
    <Shell>
      <div>
        <h2 style={{ fontFamily: exo, fontSize: 20, fontWeight: 700, color: FG }}>Criar conta</h2>
        <p style={{ fontFamily: mono, fontSize: 10, color: MUT, marginTop: 2 }}>RF21 — Cadastro de usuário</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nome">
          <Input value={nome} onChange={setNome} placeholder="Seu nome completo" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />
        </Field>
        <Field label="Senha">
          <Input type="password" value={senha} onChange={setSenha} placeholder="Mínimo 6 caracteres" />
        </Field>
        <Field label="Papel">
          <div className="flex gap-2">
            {(["Editor", "Leitor"] as const).map(p => (
              <button key={p} type="button" onClick={() => setPapel(p)}
                className="flex-1 py-2 rounded-lg text-xs transition-all"
                style={{ fontFamily: mono,
                  background: papel === p ? `${PRI}22` : "transparent",
                  border: `1px solid ${papel === p ? PRI : BORD}`,
                  color: papel === p ? PRI : MUT }}>
                {p === "Editor" ? "✎ Editor" : "◎ Leitor"}
              </button>
            ))}
          </div>
          <p style={{ fontFamily: mono, fontSize: 9, color: MUT, marginTop: 4 }}>
            Editor: cria e edita · Leitor: somente visualização
          </p>
        </Field>

        <ErrMsg msg={err} />
        <OkMsg  msg={ok} />

        <Btn type="submit" disabled={loading}>{loading ? "Criando conta…" : "Criar conta"}</Btn>
      </form>

      <div className="text-center">
        <LinkBtn onClick={onGoLogin}>Já tenho conta → Entrar</LinkBtn>
      </div>
    </Shell>
  )
}

// ── Login (RF22) ──────────────────────────────────────────────────────────────

export function Login({ onGoRegister, onGoRecover, onTestAccess }: { onGoRegister: () => void; onGoRecover: () => void; onTestAccess: () => void }) {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) setErr(error.message)
  }

  return (
    <>
      <Shell>
        <div>
          <h2 style={{ fontFamily: exo, fontSize: 20, fontWeight: 700, color: FG }}>Entrar</h2>
          <p style={{ fontFamily: mono, fontSize: 10, color: MUT, marginTop: 2 }}>RF22 — Login de usuário</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="E-mail">
            <Input type="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />
          </Field>
          <Field label="Senha">
            <Input type="password" value={senha} onChange={setSenha} placeholder="Sua senha" />
          </Field>

          <ErrMsg msg={err} />

          <Btn type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Btn>

          {/* OAuth Google — preparado para ativação futura (RD05) */}
          {/* <Btn variant="ghost" onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}>
            Entrar com Google
          </Btn> */}

          <div className="flex flex-col items-center gap-2 pt-1">
            <LinkBtn onClick={onGoRecover}>Esqueci minha senha</LinkBtn>
            <LinkBtn onClick={onGoRegister}>Não tenho conta → Criar</LinkBtn>
          </div>
        </form>
      </Shell>

      {/* Botão de acesso rápido — bypass local, sem Supabase */}
      <button
        onClick={onTestAccess}
        className="fixed bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
        style={{
          fontFamily: mono, fontSize: 10, letterSpacing: "0.08em",
          background: "rgba(9,32,63,0.85)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(30,174,152,0.25)", color: MUT,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${PRI}66`; e.currentTarget.style.color = PRI }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(30,174,152,0.25)"; e.currentTarget.style.color = MUT }}
      >
        <span style={{ fontSize: 12 }}>⚡</span> Acesso de teste
      </button>
    </>
  )
}

// ── Recuperação de senha (RF23) ───────────────────────────────────────────────

export function RecuperarSenha({ onGoLogin }: { onGoLogin: () => void }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [ok,  setOk]  = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(""); setOk("")
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setOk("Link de redefinição enviado! Verifique seu e-mail.")
  }

  return (
    <Shell>
      <div>
        <h2 style={{ fontFamily: exo, fontSize: 20, fontWeight: 700, color: FG }}>Recuperar senha</h2>
        <p style={{ fontFamily: mono, fontSize: 10, color: MUT, marginTop: 2 }}>RF23 — Reset via e-mail</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="E-mail">
          <Input type="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />
        </Field>

        <ErrMsg msg={err} />
        <OkMsg  msg={ok} />

        <Btn type="submit" disabled={loading || !!ok}>
          {loading ? "Enviando…" : "Enviar link de redefinição"}
        </Btn>

        <div className="text-center">
          <LinkBtn onClick={onGoLogin}>← Voltar ao login</LinkBtn>
        </div>
      </form>
    </Shell>
  )
}

// ── Editar perfil (RF24) ──────────────────────────────────────────────────────

export function EditarPerfil({ user, onClose }: { user: User; onClose: () => void }) {
  const meta = user.user_metadata ?? {}
  const [nome,        setNome]        = useState<string>(meta.nome ?? "")
  const [email,       setEmail]       = useState<string>(user.email ?? "")
  const [senhaAtual,  setSenhaAtual]  = useState("")
  const [novaSenha,   setNovaSenha]   = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [ok,  setOk]  = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(""); setOk("")

    const updates: { email?: string; password?: string; data?: Record<string, string> } = {}
    updates.data = { ...meta, nome }

    const emailChanged = email !== user.email
    const senhaChanged = novaSenha.length > 0

    if ((emailChanged || senhaChanged) && !senhaAtual) {
      setErr("Informe sua senha atual para alterar e-mail ou senha.")
      return
    }

    // Re-autenticar antes de trocar e-mail ou senha
    if (emailChanged || senhaChanged) {
      setLoading(true)
      const { error: reErr } = await supabase.auth.signInWithPassword({
        email: user.email ?? "",
        password: senhaAtual,
      })
      if (reErr) { setLoading(false); setErr("Senha atual incorreta."); return }
    }

    if (emailChanged) updates.email = email
    if (senhaChanged) {
      if (novaSenha.length < 6) { setLoading(false); setErr("Nova senha deve ter ao menos 6 caracteres."); return }
      updates.password = novaSenha
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser(updates)
    setLoading(false)

    if (error) { setErr(error.message); return }
    setOk("Perfil atualizado com sucesso!")
    setSenhaAtual(""); setNovaSenha("")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(1,6,18,0.88)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
        style={{ background: CARD, border: `1px solid ${BORD}`, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>

        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ fontFamily: exo, fontSize: 17, fontWeight: 700, color: FG }}>Editar perfil</h2>
            <p style={{ fontFamily: mono, fontSize: 9, color: MUT, marginTop: 2 }}>RF24 — Atualização de dados</p>
          </div>
          <button onClick={onClose} style={{ color: MUT }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = MUT)}>
            ✕
          </button>
        </div>

        {/* Papel atual */}
        <div className="px-3 py-2 rounded-lg" style={{ background: `${PRI}12`, border: `1px solid ${PRI}22` }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: PRI }}>
            Papel: {meta.role ?? "Leitor"}
          </span>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input value={nome} onChange={setNome} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={setEmail} />
          </Field>

          <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: BORD }}>
            <p style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Alterar senha (opcional)
            </p>
            <Field label="Senha atual">
              <Input type="password" value={senhaAtual} onChange={setSenhaAtual} placeholder="Necessária para qualquer alteração" />
            </Field>
            <Field label="Nova senha">
              <Input type="password" value={novaSenha} onChange={setNovaSenha} placeholder="Mínimo 6 caracteres" />
            </Field>
          </div>

          <ErrMsg msg={err} />
          <OkMsg  msg={ok} />

          <Btn type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar alterações"}</Btn>
        </form>

        <div className="border-t pt-3" style={{ borderColor: BORD }}>
          <Btn variant="ghost" onClick={handleLogout}>Sair da conta</Btn>
        </div>
      </div>
    </div>
  )
}
