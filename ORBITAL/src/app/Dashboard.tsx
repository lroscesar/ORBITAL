import { useState, useEffect } from "react"
import { Plus, Network, Trash2, LogOut, UserCircle, ChevronRight, Clock } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { supabase } from "../lib/supabase"
import { EditarPerfil } from "../auth/AuthScreens"
import { projectId, publicAnonKey } from "../utils/supabase/info" // ajuste o caminho se necessário

export interface RedeItem {
  id: string
  nome: string
  descricao: string
  criadaEm: string
  totalAtores: number
  totalRelacoes: number
}

interface DashboardProps {
  onAbrirRede: (rede: RedeItem | null) => void
}

const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: (i * 113 + 37) % 1400,
  y: (i * 79 + 53) % 900,
  r: i % 7 < 1 ? 1.4 : i % 7 < 3 ? 0.8 : 0.4,
  o: 0.05 + (i % 5) * 0.07,
}))

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

const FN_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-08dcc7e8`

async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? publicAnonKey
  const res = await fetch(`${FN_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro na requisição")
  return res.json()
}

export function Dashboard({ onAbrirRede }: DashboardProps) {
  const { user, isEditor, role } = useAuth()
  const [redes, setRedes] = useState<RedeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNova, setShowNova] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const nome = user?.user_metadata?.nome ?? user?.email ?? "usuário"
  const initial = nome[0]?.toUpperCase() ?? "?"

  useEffect(() => {
    apiFetch("/redes")
      .then(({ redes }) => setRedes(redes ?? []))
      .catch(() => setRedes([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleCriarRede(nomeRede: string, descricao: string) {
    const { rede } = await apiFetch("/redes", { method: "POST", body: JSON.stringify({ nome: nomeRede, descricao }) })
    setRedes(prev => [rede, ...prev])
    setShowNova(false)
    onAbrirRede(rede)
  }

  async function handleDeletar(id: string) {
    await apiFetch(`/redes/${id}`, { method: "DELETE" })
    setRedes(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse 90% 80% at 28% 35%, #081830 0%, #020c1e 55%, #010815 100%)" }}>

      {/* Star field */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#AEE4FF" opacity={s.o} />
        ))}
      </svg>

      {/* Topbar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "rgba(106,156,253,0.12)", background: "rgba(7,20,40,0.7)", backdropFilter: "blur(12px)" }}>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "radial-gradient(circle at 35% 35%, #AEE4FF33, #033495aa)", border: "1px solid #AEE4FF44" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <polygon points="6.5,1 12,10 1,10" fill="#AEE4FF" opacity="0.9" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 18, fontWeight: 800, color: "#cee0ff", letterSpacing: "0.08em" }}>
            DIVAS POP
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.2em", marginTop: 2 }}>
            MINHAS REDES
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5a7ab0" }}>
            {role}
          </span>
          <button onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all"
            style={{ borderColor: "rgba(106,156,253,0.2)", background: "rgba(106,156,253,0.06)" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.4)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.2)")}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #1d3a7a, #033495)", color: "#AEE4FF", fontFamily: "'JetBrains Mono', monospace" }}>
              {initial}
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#cee0ff" }}>
              {nome.split(" ")[0]}
            </span>
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all"
            style={{ borderColor: "rgba(239,68,68,0.2)", color: "#5a7ab0" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; e.currentTarget.style.color = "#ef4444" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#5a7ab0" }}>
            <LogOut size={13} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>Sair</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">

        <div className="mb-12">
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5a7ab0", letterSpacing: "0.2em", marginBottom: 8 }}>
            BEM-VINDO DE VOLTA
          </p>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 32, fontWeight: 800, color: "#cee0ff", lineHeight: 1.2 }}>
            Olá, {nome.split(" ")[0]}
          </h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#5a7ab0", marginTop: 8 }}>
            {loading
              ? "Carregando suas redes…"
              : redes.length === 0
                ? "Você ainda não tem nenhuma rede. Crie sua primeira rede de atores."
                : `${redes.length} rede${redes.length > 1 ? "s" : ""} criada${redes.length > 1 ? "s" : ""}.`}
          </p>
        </div>

        {isEditor ? (
          <button onClick={() => setShowNova(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-xl border mb-10 transition-all group"
            style={{ borderColor: "rgba(106,156,253,0.25)", background: "rgba(106,156,253,0.06)", borderStyle: "dashed" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.55)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.25)")}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(106,156,253,0.12)", border: "1px solid rgba(106,156,253,0.25)" }}>
              <Plus size={18} style={{ color: "#6A9CFD" }} />
            </div>
            <div className="text-left">
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 14, fontWeight: 700, color: "#6A9CFD" }}>
                Nova Rede
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5a7ab0" }}>
                Criar um novo mapa de atores e relações
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "#5a7ab0", marginLeft: "auto" }} />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-6 py-3 rounded-xl border mb-10"
            style={{ borderColor: "rgba(106,156,253,0.12)", background: "rgba(106,156,253,0.04)" }}>
            <Network size={16} style={{ color: "#5a7ab0" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5a7ab0" }}>
              Modo Leitor — visualize redes compartilhadas com você.
            </span>
          </div>
        )}

        {redes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {redes.map(rede => (
              <div key={rede.id} className="relative group rounded-xl border transition-all cursor-pointer"
                style={{ background: "#071428", borderColor: "rgba(106,156,253,0.15)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.35)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.15)")}
                onClick={() => onAbrirRede(rede)}>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "radial-gradient(circle at 30% 30%, #1d3a7a, #020c1e)", border: "1px solid rgba(106,156,253,0.2)" }}>
                      <Network size={16} style={{ color: "#6A9CFD" }} />
                    </div>
                    {isEditor && (
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingId(rede.id) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                        style={{ color: "#5a7ab0" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#5a7ab0")}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 15, fontWeight: 700, color: "#cee0ff", marginBottom: 4 }}>
                    {rede.nome}
                  </h3>
                  {rede.descricao && (
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5a7ab0", lineHeight: 1.6 }}>
                      {rede.descricao}
                    </p>
                  )}
                </div>

                <div className="px-5 pb-4 flex items-center justify-between border-t"
                  style={{ borderColor: "rgba(106,156,253,0.1)" }}>
                  <div className="flex gap-4 mt-3">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0" }}>
                      <span style={{ color: "#6A9CFD", fontWeight: 600 }}>{rede.totalAtores}</span> atores
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0" }}>
                      <span style={{ color: "#FFB8D0", fontWeight: 600 }}>{rede.totalRelacoes}</span> relações
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#3a5580" }}>
                    <Clock size={9} />
                    {fmtDate(rede.criadaEm)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "rgba(106,156,253,0.06)", border: "1px dashed rgba(106,156,253,0.2)" }}>
              <Network size={32} style={{ color: "rgba(106,156,253,0.35)" }} />
            </div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 16, fontWeight: 700, color: "#3a5580", marginBottom: 6 }}>
              Nenhuma rede ainda
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#3a4f70", maxWidth: 300 }}>
              {isEditor
                ? "Clique em \"Nova Rede\" para começar a mapear atores e relações."
                : "Aguarde que um Editor compartilhe uma rede com você."}
            </p>
          </div>
        )}
      </div>

      {showNova && <ModalNovaRede onClose={() => setShowNova(false)} onCreate={handleCriarRede} />}
      {showProfile && <EditarPerfil onClose={() => setShowProfile(false)} />}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(1,6,18,0.88)", backdropFilter: "blur(10px)" }}>
          <div className="w-full max-w-sm rounded-2xl border p-6"
            style={{ background: "#071428", borderColor: "rgba(239,68,68,0.25)" }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 15, fontWeight: 700, color: "#cee0ff", marginBottom: 8 }}>
              Excluir esta rede?
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5a7ab0", marginBottom: 20 }}>
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-lg border"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>
                Cancelar
              </button>
              <button onClick={() => handleDeletar(deletingId)}
                className="flex-1 py-2.5 rounded-lg font-semibold"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: "#ef4444", color: "#020c1e" }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal Nova Rede ─────────────��─────────────────────────────────────────────

function ModalNovaRede({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (nome: string, descricao: string) => Promise<void>
}) {
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)

  const inputStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
    background: "#020c1e", borderRadius: 8, border: "1px solid rgba(106,156,253,0.18)",
    color: "#cee0ff", padding: "10px 14px", width: "100%", outline: "none",
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError("Dê um nome para a rede."); return }
    setError("")
    setEnviando(true)
    try {
      await onCreate(nome.trim(), descricao.trim())
    } catch {
      setError("Não foi possível criar a rede. Tente novamente.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(1,6,18,0.88)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: "#071428", borderColor: "rgba(106,156,253,0.22)" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.2em" }}>
              NOVA REDE
            </p>
            <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 18, fontWeight: 800, color: "#cee0ff" }}>
              Criar mapa de atores
            </h3>
          </div>
          <button onClick={onClose} style={{ color: "#5a7ab0" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#cee0ff")}
            onMouseLeave={e => (e.currentTarget.style.color = "#5a7ab0")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Nome da Rede
            </label>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="ex: Indústria Fonográfica Brasileira"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.18)")}
            />
          </div>

          <div>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Descrição <span style={{ opacity: 0.5 }}>(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Contexto ou objetivo desta rede…"
              rows={3}
              style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.18)")}
            />
          </div>

          {error && (
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ef4444" }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={enviando}
              className="flex-1 py-2.5 rounded-lg border"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0", opacity: enviando ? 0.5 : 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={enviando}
              className="flex-1 py-2.5 rounded-lg font-semibold"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: "#6A9CFD", color: "#020c1e", opacity: enviando ? 0.7 : 1 }}>
              {enviando ? "Criando…" : "Criar e Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}