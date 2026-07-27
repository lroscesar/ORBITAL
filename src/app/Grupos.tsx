import { useState, useEffect, useCallback } from "react"
import { Plus, X, Users, Mail, Check, Trash2, ArrowLeft, UserPlus, Crown } from "lucide-react"
import { useAuth } from "../auth/AuthContext"
import { supabase } from "../lib/supabase"

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface Grupo {
  id: string
  nome: string
  dono_id: string
  criado_em: string
}
interface Membro {
  grupo_id: string
  user_id: string
  papel: string
  entrou_em: string
  nome: string | null
  email: string | null
}
interface Convite {
  id: string
  grupo_id: string
  email: string
  papel: string
  status: string
  convidado_por: string
  criado_em: string
}

const mono = "'JetBrains Mono', monospace"
const exo = "'Exo 2', sans-serif"

interface GruposProps {
  onVoltar: () => void
}

export function Grupos({ onVoltar }: GruposProps) {
  const { user } = useAuth()
  const meuEmail = (user?.email ?? "").toLowerCase()

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [convitesRecebidos, setConvitesRecebidos] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [showNovo, setShowNovo] = useState(false)
  const [grupoAberto, setGrupoAberto] = useState<Grupo | null>(null)

  // ── Carrega meus grupos + convites que recebi ──────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    setErro("")
    const [g, c] = await Promise.all([
      supabase.from("grupos").select("*").order("criado_em", { ascending: false }),
      supabase.from("convites").select("*").eq("status", "pendente"),
    ])
    if (g.error) setErro("Erro ao carregar grupos: " + g.error.message)
    setGrupos(g.data ?? [])
    // convites: a policy já filtra pelos que são meus; garanto pelo e-mail
    setConvitesRecebidos((c.data ?? []).filter(cv => cv.email.toLowerCase() === meuEmail))
    setLoading(false)
  }, [meuEmail])

  useEffect(() => { carregar() }, [carregar])

  // ── Criar grupo (viro dono + entro como membro) ────────────────────────────
  async function criarGrupo(nome: string) {
    if (!user) return
    const { data, error } = await supabase
      .from("grupos")
      .insert({ nome, dono_id: user.id })
      .select("*")
      .single()
    if (error) { setErro("Erro ao criar grupo: " + error.message); return }
    // entra como membro (papel dono) — guarda meu nome/e-mail pra exibir na lista
    const meuNome = user.user_metadata?.nome ?? user.email ?? null
    await supabase.from("grupo_membros").insert({
      grupo_id: data.id, user_id: user.id, papel: "dono",
      nome: meuNome, email: user.email ?? null,
    })
    setShowNovo(false)
    carregar()
  }

  // ── Aceitar convite: marca aceito + me insere como membro ──────────────────
  async function aceitarConvite(cv: Convite) {
    if (!user) return
    // guarda meu nome/e-mail junto pra aparecer na lista de membros
    const meuNome = user.user_metadata?.nome ?? user.email ?? null
    const ins = await supabase.from("grupo_membros")
      .insert({
        grupo_id: cv.grupo_id, user_id: user.id, papel: cv.papel,
        nome: meuNome, email: user.email ?? null,
      })
    if (ins.error && !ins.error.message.includes("duplicate")) {
      setErro("Erro ao entrar no grupo: " + ins.error.message); return
    }
    await supabase.from("convites").update({ status: "aceito" }).eq("id", cv.id)
    carregar()
  }

  // ── Recusar convite (dono cancela, ou pessoa ignora apagando) ──────────────
  async function recusarConvite(cv: Convite) {
    await supabase.from("convites").delete().eq("id", cv.id)
    carregar()
  }

  // Se um grupo está aberto, mostra o detalhe (membros + convidar)
  if (grupoAberto) {
    return <DetalheGrupo grupo={grupoAberto} onVoltar={() => { setGrupoAberto(null); carregar() }} />
  }

  return (
    <div className="min-h-screen relative"
      style={{ background: "radial-gradient(ellipse 90% 80% at 28% 35%, #081830 0%, #020c1e 55%, #010815 100%)" }}>

      {/* Topbar */}
      <div className="flex items-center gap-3 px-8 py-4 border-b"
        style={{ borderColor: "rgba(106,156,253,0.12)", background: "rgba(7,20,40,0.7)", backdropFilter: "blur(12px)" }}>
        <button onClick={onVoltar}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ fontFamily: mono, fontSize: 10, border: "1px solid rgba(106,156,253,0.18)", color: "#5a7ab0" }}>
          <ArrowLeft size={11} /> Redes
        </button>
        <Users size={16} style={{ color: "#6A9CFD" }} />
        <span style={{ fontFamily: exo, fontSize: 16, fontWeight: 800, color: "#cee0ff", letterSpacing: "0.06em" }}>
          GRUPOS
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">

        {erro && (
          <p style={{ fontFamily: mono, fontSize: 11, color: "#ef4444", marginBottom: 16 }}>{erro}</p>
        )}

        {/* Convites recebidos */}
        {convitesRecebidos.length > 0 && (
          <div className="mb-10">
            <p style={{ fontFamily: mono, fontSize: 9, color: "#FFB8D0", letterSpacing: "0.2em", marginBottom: 10 }}>
              CONVITES RECEBIDOS
            </p>
            <div className="space-y-2">
              {convitesRecebidos.map(cv => (
                <div key={cv.id} className="flex items-center justify-between px-4 py-3 rounded-xl border"
                  style={{ borderColor: "rgba(255,184,208,0.25)", background: "rgba(255,184,208,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <Mail size={14} style={{ color: "#FFB8D0" }} />
                    <span style={{ fontFamily: mono, fontSize: 12, color: "#cee0ff" }}>
                      Você foi convidado para um grupo
                      <span style={{ color: "#5a7ab0" }}> · como {cv.papel}</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => aceitarConvite(cv)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold"
                      style={{ fontFamily: mono, fontSize: 10, background: "#6A9CFD", color: "#020c1e" }}>
                      <Check size={11} /> Aceitar
                    </button>
                    <button onClick={() => recusarConvite(cv)}
                      className="px-3 py-1.5 rounded-lg border"
                      style={{ fontFamily: mono, fontSize: 10, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão criar */}
        <button onClick={() => setShowNovo(true)}
          className="flex items-center gap-3 px-5 py-3.5 rounded-xl border mb-8"
          style={{ borderColor: "rgba(106,156,253,0.25)", background: "rgba(106,156,253,0.06)", borderStyle: "dashed" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(106,156,253,0.12)", border: "1px solid rgba(106,156,253,0.25)" }}>
            <Plus size={16} style={{ color: "#6A9CFD" }} />
          </div>
          <div className="text-left">
            <div style={{ fontFamily: exo, fontSize: 13, fontWeight: 700, color: "#6A9CFD" }}>Criar grupo</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0" }}>Reúna sua equipe de pesquisa</div>
          </div>
        </button>

        {/* Lista de grupos */}
        <p style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.2em", marginBottom: 12 }}>
          MEUS GRUPOS {loading && "· carregando…"}
        </p>

        {grupos.length === 0 && !loading ? (
          <div className="py-16 text-center">
            <Users size={30} style={{ color: "rgba(106,156,253,0.3)", margin: "0 auto 12px" }} />
            <p style={{ fontFamily: mono, fontSize: 11, color: "#3a5580" }}>
              Você ainda não participa de nenhum grupo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {grupos.map(g => (
              <button key={g.id} onClick={() => setGrupoAberto(g)}
                className="flex items-center gap-3 p-4 rounded-xl border text-left transition-all"
                style={{ background: "#071428", borderColor: "rgba(106,156,253,0.15)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.35)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(106,156,253,0.15)")}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "radial-gradient(circle at 30% 30%, #1d3a7a, #020c1e)", border: "1px solid rgba(106,156,253,0.2)" }}>
                  <Users size={16} style={{ color: "#6A9CFD" }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontFamily: exo, fontSize: 14, fontWeight: 700, color: "#cee0ff" }}>{g.nome}</span>
                    {g.dono_id === user?.id && <Crown size={11} style={{ color: "#FFD700" }} />}
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0" }}>
                    {g.dono_id === user?.id ? "Você é o dono" : "Membro"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showNovo && <ModalNovoGrupo onClose={() => setShowNovo(false)} onCreate={criarGrupo} />}
    </div>
  )
}

// ── Detalhe do grupo: membros + convidar ──────────────────────────────────────
function DetalheGrupo({ grupo, onVoltar }: { grupo: Grupo; onVoltar: () => void }) {
  const { user } = useAuth()
  const souDono = grupo.dono_id === user?.id
  const [membros, setMembros] = useState<Membro[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [email, setEmail] = useState("")
  const [papelConvite, setPapelConvite] = useState<"editor" | "leitor">("editor")
  const [msg, setMsg] = useState("")
  const [erro, setErro] = useState("")

  const carregar = useCallback(async () => {
    const [m, c] = await Promise.all([
      supabase.from("grupo_membros").select("*").eq("grupo_id", grupo.id),
      supabase.from("convites").select("*").eq("grupo_id", grupo.id).eq("status", "pendente"),
    ])
    setMembros(m.data ?? [])
    setConvites(c.data ?? [])
  }, [grupo.id])

  useEffect(() => { carregar() }, [carregar])

  async function convidar(e: React.FormEvent) {
    e.preventDefault()
    setErro(""); setMsg("")
    const alvo = email.trim().toLowerCase()
    if (!alvo || !alvo.includes("@")) { setErro("Digite um e-mail válido."); return }
    const { error } = await supabase.from("convites")
      .insert({ grupo_id: grupo.id, email: alvo, papel: papelConvite, convidado_por: user!.id })
    if (error) { setErro("Erro ao convidar: " + error.message); return }
    setMsg(`Convite registrado para ${alvo} como ${papelConvite}. A pessoa verá ao logar com esse e-mail.`)
    setEmail("")
    carregar()
  }

  async function cancelarConvite(id: string) {
    await supabase.from("convites").delete().eq("id", id)
    carregar()
  }

  // Dono troca o papel de um membro (editor <-> leitor)
  async function trocarPapel(m: Membro) {
    if (m.papel === "dono") return // não mexe no dono
    const novo = m.papel === "editor" ? "leitor" : "editor"
    const { error } = await supabase.from("grupo_membros")
      .update({ papel: novo }).eq("grupo_id", grupo.id).eq("user_id", m.user_id)
    if (error) { setErro("Erro ao trocar papel: " + error.message); return }
    carregar()
  }

  // Dono remove um membro do grupo
  async function removerMembro(m: Membro) {
    if (m.papel === "dono") return // não remove o dono
    const { error } = await supabase.from("grupo_membros")
      .delete().eq("grupo_id", grupo.id).eq("user_id", m.user_id)
    if (error) { setErro("Erro ao remover: " + error.message); return }
    carregar()
  }

  return (
    <div className="min-h-screen relative"
      style={{ background: "radial-gradient(ellipse 90% 80% at 28% 35%, #081830 0%, #020c1e 55%, #010815 100%)" }}>
      <div className="flex items-center gap-3 px-8 py-4 border-b"
        style={{ borderColor: "rgba(106,156,253,0.12)", background: "rgba(7,20,40,0.7)", backdropFilter: "blur(12px)" }}>
        <button onClick={onVoltar}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ fontFamily: mono, fontSize: 10, border: "1px solid rgba(106,156,253,0.18)", color: "#5a7ab0" }}>
          <ArrowLeft size={11} /> Grupos
        </button>
        <Users size={16} style={{ color: "#6A9CFD" }} />
        <span style={{ fontFamily: exo, fontSize: 16, fontWeight: 800, color: "#cee0ff" }}>{grupo.nome}</span>
        {souDono && <Crown size={13} style={{ color: "#FFD700" }} />}
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">

        {/* Convidar (só dono) */}
        {souDono && (
          <div>
            <p style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.2em", marginBottom: 10 }}>
              CONVIDAR POR E-MAIL
            </p>
            <form onSubmit={convidar} className="flex gap-2">
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                style={{ flex: 1, fontFamily: mono, fontSize: 12, background: "#020c1e", borderRadius: 8,
                  border: "1px solid rgba(106,156,253,0.18)", color: "#cee0ff", padding: "10px 14px", outline: "none" }} />
              {/* Seletor editor / leitor */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(106,156,253,0.18)" }}>
                {(["editor", "leitor"] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPapelConvite(p)}
                    className="px-3"
                    style={{
                      fontFamily: mono, fontSize: 10,
                      background: papelConvite === p ? "rgba(106,156,253,0.18)" : "transparent",
                      color: papelConvite === p ? "#cee0ff" : "#5a7ab0",
                    }}>
                    {p === "editor" ? "Editor" : "Leitor"}
                  </button>
                ))}
              </div>
              <button type="submit"
                className="flex items-center gap-1.5 px-4 rounded-lg font-semibold"
                style={{ fontFamily: mono, fontSize: 11, background: "#6A9CFD", color: "#020c1e" }}>
                <UserPlus size={13} /> Convidar
              </button>
            </form>
            <p style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", marginTop: 6 }}>
              Editor mexe nas redes do grupo · Leitor só visualiza
            </p>
            {msg && <p style={{ fontFamily: mono, fontSize: 10, color: "#6A9CFD", marginTop: 8 }}>{msg}</p>}
            {erro && <p style={{ fontFamily: mono, fontSize: 10, color: "#ef4444", marginTop: 8 }}>{erro}</p>}
          </div>
        )}

        {/* Convites pendentes */}
        {convites.length > 0 && (
          <div>
            <p style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.2em", marginBottom: 10 }}>
              CONVITES PENDENTES
            </p>
            <div className="space-y-2">
              {convites.map(cv => (
                <div key={cv.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg border"
                  style={{ borderColor: "rgba(106,156,253,0.12)", background: "rgba(106,156,253,0.03)" }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#9dc8f5" }}>
                    <Mail size={11} style={{ display: "inline", marginRight: 6, color: "#5a7ab0" }} />
                    {cv.email}
                  </span>
                  {souDono && (
                    <button onClick={() => cancelarConvite(cv.id)} style={{ color: "#5a7ab0" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#5a7ab0")}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Membros */}
        <div>
          <p style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.2em", marginBottom: 10 }}>
            MEMBROS · {membros.length}
          </p>
          <div className="space-y-2">
            {membros.map(m => (
              <div key={m.user_id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
                style={{ borderColor: "rgba(106,156,253,0.12)", background: "#071428" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #1d3a7a, #033495)", color: "#AEE4FF", fontFamily: mono }}>
                  {m.papel[0]?.toUpperCase()}
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: "#cee0ff" }}>
                  {m.user_id === user?.id ? "Você" : (m.nome || m.email || "Membro")}
                </span>
                <span style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", marginLeft: "auto" }}>
                  {m.papel}
                </span>
                {m.papel === "dono" && <Crown size={11} style={{ color: "#FFD700" }} />}
                {/* Controles do dono: trocar papel + remover (não para o próprio dono) */}
                {souDono && m.papel !== "dono" && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => trocarPapel(m)}
                      className="px-2 py-1 rounded-md border"
                      style={{ fontFamily: mono, fontSize: 9, borderColor: "rgba(106,156,253,0.25)", color: "#9dc8f5" }}
                      title="Alternar editor/leitor">
                      {m.papel === "editor" ? "→ leitor" : "→ editor"}
                    </button>
                    <button onClick={() => removerMembro(m)} style={{ color: "#5a7ab0" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#5a7ab0")}
                      title="Remover do grupo">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal novo grupo ──────────────────────────────────────────────────────────
function ModalNovoGrupo({ onClose, onCreate }: { onClose: () => void; onCreate: (nome: string) => void | Promise<void> }) {
  const [nome, setNome] = useState("")
  const [salvando, setSalvando] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    await onCreate(nome.trim())
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(1,6,18,0.88)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: "#071428", borderColor: "rgba(106,156,253,0.22)" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 style={{ fontFamily: exo, fontSize: 18, fontWeight: 800, color: "#cee0ff" }}>Novo grupo</h3>
          <button onClick={onClose} style={{ color: "#5a7ab0" }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Nome do grupo
            </label>
            <input autoFocus value={nome} onChange={e => setNome(e.target.value)}
              placeholder="ex: Pesquisa SFN"
              style={{ width: "100%", fontFamily: mono, fontSize: 12, background: "#020c1e", borderRadius: 8,
                border: "1px solid rgba(106,156,253,0.18)", color: "#cee0ff", padding: "10px 14px", outline: "none" }} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={salvando}
              className="flex-1 py-2.5 rounded-lg border"
              style={{ fontFamily: mono, fontSize: 12, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 py-2.5 rounded-lg font-semibold"
              style={{ fontFamily: mono, fontSize: 12, background: "#6A9CFD", color: "#020c1e", opacity: salvando ? 0.6 : 1 }}>
              {salvando ? "Criando…" : "Criar grupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
