import { useState, useRef, useEffect } from "react"
import { Plus, X, GitBranch, Download, ChevronRight, UserCircle, ArrowLeft } from "lucide-react"
import { AuthProvider } from "../auth/AuthContext"
import { AuthGate } from "../auth/AuthGate"
import { useAuth } from "../auth/AuthContext"
import { EditarPerfil } from "../auth/AuthScreens"
import { Dashboard, type RedeItem } from "./Dashboard"
import { supabase } from "../lib/supabase"
import { projectId, publicAnonKey } from "../utils/supabase/info" // ajuste o caminho se necessário

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

// ── Types ────────────────────────────────────────────────────────────────────

type AtorClasse = "Humano" | "Organizacional" | "Não humano"
type RelacaoTipo = "Promessa" | "Imposição" | "Obrigação" | "Delegação"

interface Ator {
  id: string
  nome: string
  classe: AtorClasse
  peso_hierarquico: number
  eh_ppo: boolean
  eh_caixa_preta: boolean
  x: number
  y: number
  parent_id?: string
}

interface Relacao {
  id: string
  tipo: RelacaoTipo
  ator_origem_id: string
  ator_destino_id: string
  custo_recusa?: number
  distancia_regulatoria?: number
}

interface Constelacao {
  id: string
  nome: string
  corpo_central_id: string
  satelites: string[]
}

// ── Initial data ──────────────────────────────────────────────────────────────

function DivasPop({ rede, onVoltar }: { rede: RedeItem; onVoltar: () => void }) {
  const { user, isEditor, role } = useAuth()
  const [atores, setAtores] = useState<Ator[]>([])
  const [relacoes, setRelacoes] = useState<Relacao[]>([])
  const [constelacoes, setConstelacoes] = useState<Constelacao[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiFetch(`/redes/${rede.id}`)
      .then(({ rede: salva }) => {
        setAtores(salva.atores ?? [])
        setRelacoes(salva.relacoes ?? [])
        setConstelacoes(salva.constelacoes ?? [])
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [rede.id])

  useEffect(() => {
    if (!loaded || !isEditor) return
    const t = setTimeout(() => {
      apiFetch(`/redes/${rede.id}`, { method: "PUT", body: JSON.stringify({ atores, relacoes, constelacoes }) }).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [atores, relacoes, constelacoes, loaded, isEditor, rede.id])

// ── Static star field ─────────────────────────────────────────────────────────

const STARS = Array.from({ length: 160 }, (_, i) => ({
  x: (i * 97 + 43) % 1400,
  y: (i * 137 + 71) % 1000,
  r: i % 9 < 2 ? 1.3 : i % 9 < 5 ? 0.7 : 0.4,
  o: 0.06 + (i % 6) * 0.06,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const nR = (peso: number) => 10 + peso * 4.5

const NODE_FILL: Record<AtorClasse, string> = {
  Humano:          "url(#grad-humano)",
  Organizacional:  "url(#grad-org)",
  "Não humano":    "url(#grad-naohum)",
}

const EDGE_CFG: Record<RelacaoTipo, { stroke: string; width: number; dash?: string; marker: string }> = {
  Promessa:  { stroke: "#6A9CFD", width: 1.5,                marker: "url(#arr-blue)"  },
  Imposição: { stroke: "#4B7BFF", width: 3.5,                marker: "url(#arr-navy)"  },
  Obrigação: { stroke: "#2452C9", width: 3.5,                marker: "url(#arr-navy)"  },
  Delegação: { stroke: "#FFB8D0", width: 1.5, dash: "6 3",  marker: "url(#arr-pink)"  },
}

const TIPO_COLOR: Record<RelacaoTipo, string> = {
  Promessa: "#6A9CFD", Imposição: "#4B7BFF", Obrigação: "#2452C9", Delegação: "#FFB8D0",
}

const CLASSE_COLOR: Record<AtorClasse, string> = {
  Humano: "#977DFF", Organizacional: "#4B7BFF", "Não humano": "#FFCCF2",
}

function curvePath(a: Ator, b: Ator, curve = 28) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.sqrt(dx * dx + dy * dy) || 1
  const cpx = mx + (-dy / d) * curve
  const cpy = my + (dx / d) * curve
  const rA = nR(a.peso_hierarquico)
  const rB = nR(b.peso_hierarquico)
  const ds = Math.sqrt((cpx - a.x) ** 2 + (cpy - a.y) ** 2) || 1
  const de = Math.sqrt((cpx - b.x) ** 2 + (cpy - b.y) ** 2) || 1
  const sx = a.x + ((cpx - a.x) / ds) * rA
  const sy = a.y + ((cpy - a.y) / ds) * rA
  const ex = b.x + ((cpx - b.x) / de) * rB
  const ey = b.y + ((cpy - b.y) / de) * rB
  return { path: `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`, cpx, cpy }
}

// ── Root export (wraps with Auth) ─────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppRouter />
      </AuthGate>
    </AuthProvider>
  )
}

function AppRouter() {
  const [redeAtiva, setRedeAtiva] = useState<RedeItem | null>(null)

  if (!redeAtiva) {
    return <Dashboard onAbrirRede={(rede) => setRedeAtiva(rede)} />
  }
  return <DivasPop rede={redeAtiva} onVoltar={() => setRedeAtiva(null)} />
}

// ── Main app (authenticated) ──────────────────────────────────────────────────

function DivasPop({ rede, onVoltar }: { rede: RedeItem; onVoltar: () => void }) {
  const { user, isEditor, role } = useAuth()
  const [atores, setAtores] = useState<Ator[]>(INITIAL_ATORES)
  const [relacoes, setRelacoes] = useState<Relacao[]>(INITIAL_RELACOES)
  const [constelacoes] = useState<Constelacao[]>(INITIAL_CONSTELACOES)

  const [tr, setTr] = useState({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const [draggingNode, setDraggingNode] = useState(false)
  const dragRef = useRef({ sx: 0, sy: 0, tx: 0, ty: 0, moved: false })
  const nodeDragRef = useRef<{ id: string; startMX: number; startMY: number; startNX: number; startNY: number; scale: number } | null>(null)
  const nodeWasDragged = useRef(false)

  const [showProfile, setShowProfile] = useState(false)
  const [selected, setSelected] = useState<{ kind: "actor" | "relation"; id: string } | null>(null)
  const [viewMode, setViewMode] = useState<"orbital" | "grafo">("orbital")
  const [cascadeIds, setCascadeIds] = useState<Set<string>>(new Set())
  const [showAddActor, setShowAddActor] = useState(false)
  const [showAddRelation, setShowAddRelation] = useState(false)
  const [showLegend, setShowLegend] = useState(true)

  const svgRef = useRef<SVGSVGElement>(null)

  // Non-passive wheel for zoom
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const f = e.deltaY < 0 ? 1.12 : 0.89
      const rect = svg.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setTr(t => ({
        scale: Math.max(0.18, Math.min(7, t.scale * f)),
        x: cx - (cx - t.x) * f,
        y: cy - (cy - t.y) * f,
      }))
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [])

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    setDragging(true)
    dragRef.current = { sx: e.clientX, sy: e.clientY, tx: tr.x, ty: tr.y, moved: false }
  }
  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // Node drag takes priority
    if (nodeDragRef.current) {
      const nd = nodeDragRef.current
      const dx = e.clientX - nd.startMX
      const dy = e.clientY - nd.startMY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) nodeWasDragged.current = true
      const newX = nd.startNX + dx / nd.scale
      const newY = nd.startNY + dy / nd.scale
      setAtores(prev => prev.map(a => a.id === nd.id ? { ...a, x: newX, y: newY } : a))
      return
    }
    if (!dragging) return
    const dx = e.clientX - dragRef.current.sx
    const dy = e.clientY - dragRef.current.sy
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true
    setTr(t => ({ ...t, x: dragRef.current.tx + dx, y: dragRef.current.ty + dy }))
  }
  const onMouseUp = () => {
    if (nodeDragRef.current) {
      nodeDragRef.current = null
      setDraggingNode(false)
    }
    setDragging(false)
  }
  const onCanvasClick = () => { if (!dragRef.current.moved) setSelected(null) }

  const handleNodeMouseDown = (e: React.MouseEvent, ator: Ator) => {
    e.stopPropagation()
    nodeWasDragged.current = false
    nodeDragRef.current = {
      id: ator.id,
      startMX: e.clientX,
      startMY: e.clientY,
      startNX: ator.x,
      startNY: ator.y,
      scale: tr.scale,
    }
    setDraggingNode(true)
  }

  const handleNodeClick = (e: React.MouseEvent, atorId: string) => {
    e.stopPropagation()
    if (nodeWasDragged.current) { nodeWasDragged.current = false; return }
    setSelected({ kind: "actor", id: atorId })
  }

  const runCascade = (startId: string) => {
    const aff = new Set<string>()
    const q = [startId]
    while (q.length) {
      const curr = q.shift()!
      if (aff.has(curr)) continue
      aff.add(curr)
      relacoes
        .filter(r => r.ator_origem_id === curr || r.ator_destino_id === curr)
        .forEach(r => {
          const other = r.ator_origem_id === curr ? r.ator_destino_id : r.ator_origem_id
          if (!aff.has(other)) q.push(other)
        })
    }
    setCascadeIds(aff)
  }

  const actorMap = Object.fromEntries(atores.map(a => [a.id, a]))
  const selAtor    = selected?.kind === "actor"    ? actorMap[selected.id]                   : null
  const selRelacao = selected?.kind === "relation" ? relacoes.find(r => r.id === selected.id) : null
  const hasCascade = cascadeIds.size > 0

  const mono = "'JetBrains Mono', monospace"

  return (
    <div className="size-full flex flex-col overflow-hidden" style={{ fontFamily: "'Exo 2', sans-serif", background: "#020c1e" }}>

      {/* ── Top bar ── */}
      <div className="h-14 shrink-0 flex items-center px-4 gap-3 border-b border-border" style={{ background: "#071428" }}>

        {/* Back to dashboard */}
        <button onClick={onVoltar}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all mr-1"
          style={{ fontFamily: mono, fontSize: 10, border: "1px solid rgba(106,156,253,0.18)", color: "#5a7ab0", background: "transparent" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#6A9CFD"; e.currentTarget.style.borderColor = "rgba(106,156,253,0.45)" }}
          onMouseLeave={e => { e.currentTarget.style.color = "#5a7ab0"; e.currentTarget.style.borderColor = "rgba(106,156,253,0.18)" }}>
          <ArrowLeft size={11} />
          <span>Redes</span>
        </button>

        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle at 35% 35%, #AEE4FF33, #033495aa)", border: "1.5px solid #6A9CFD55", boxShadow: "0 0 14px #6A9CFD44" }}>
            <span style={{ fontFamily: mono, fontSize: 13, color: "#AEE4FF" }}>✦</span>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 600, color: "#cee0ff", letterSpacing: "0.18em" }}>DIVAS POP</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.1em" }}>{rede.nome}</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(106,156,253,0.2)", background: "#020c1e" }}>
          {(["orbital", "grafo"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ fontFamily: mono, fontSize: 11, padding: "6px 16px", transition: "all 0.2s",
                background: viewMode === m ? "#6A9CFD" : "transparent",
                color:      viewMode === m ? "#020c1e" : "#5a7ab0" }}>
              {m === "orbital" ? "⊙ Orbital" : "⇌ Grafo"}
            </button>
          ))}
        </div>

        {isEditor && (
          <>
            <TBtn icon={<Plus size={11} />} label="Ator"    color="#6A9CFD" onClick={() => setShowAddActor(true)} />
            <TBtn icon={<GitBranch size={11} />} label="Relação" color="#FFB8D0" onClick={() => setShowAddRelation(true)} />
          </>
        )}

        {hasCascade && (
          <TBtn icon={<X size={11} />} label="Cascata" color="#FFD700" onClick={() => setCascadeIds(new Set())} />
        )}

        <button style={{ fontFamily: mono, fontSize: 11, padding: "6px 12px", borderRadius: 8,
          border: "1px solid rgba(106,156,253,0.15)", color: "#5a7ab0", background: "transparent",
          display: "flex", alignItems: "center", gap: 6 }}>
          <Download size={11} /> Export
        </button>

        {/* Profile button */}
        <button onClick={() => setShowProfile(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
          style={{ fontFamily: mono, fontSize: 10, border: "1px solid rgba(106,156,253,0.2)",
            color: "#5a7ab0", background: "transparent" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#cee0ff"; e.currentTarget.style.borderColor = "rgba(106,156,253,0.4)" }}
          onMouseLeave={e => { e.currentTarget.style.color = "#5a7ab0"; e.currentTarget.style.borderColor = "rgba(106,156,253,0.2)" }}
          title={`${user?.user_metadata?.nome ?? user?.email} · ${role}`}>
          <UserCircle size={13} />
          <span>{role}</span>
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 relative overflow-hidden">
        <svg ref={svgRef} className="size-full"
          style={{ cursor: dragging || draggingNode ? "grabbing" : "grab",
            background: "radial-gradient(ellipse 90% 80% at 28% 35%, #081830 0%, #020c1e 55%, #010815 100%)" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={onCanvasClick}
        >
          <defs>
            <radialGradient id="grad-humano" cx="35%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#C4B5FF" />
              <stop offset="100%" stopColor="#6A4FD8" />
            </radialGradient>
            <radialGradient id="grad-org" cx="35%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#5B8FE8" />
              <stop offset="100%" stopColor="#033495" />
            </radialGradient>
            <radialGradient id="grad-naohum" cx="35%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#FFE8F8" />
              <stop offset="100%" stopColor="#E89FD8" />
            </radialGradient>

            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-ppo" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-sel" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {[{ id: "arr-blue", fill: "#6A9CFD" }, { id: "arr-navy", fill: "#4B7BFF" }, { id: "arr-pink", fill: "#FFB8D0" }].map(({ id, fill }) => (
              <marker key={id} id={id} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5 Z" fill={fill} />
              </marker>
            ))}

            <pattern id="hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(0,0,0,0.55)" strokeWidth="3.5" />
            </pattern>
          </defs>

          <g transform={`translate(${tr.x},${tr.y}) scale(${tr.scale})`}>

            {/* Stars */}
            {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />)}

            {/* Orbital rings — constelações */}
            {viewMode === "orbital" && constelacoes.map(cons => {
              const central = actorMap[cons.corpo_central_id]
              if (!central) return null
              return cons.satelites.map(satId => {
                const sat = actorMap[satId]
                if (!sat) return null
                const dist = Math.sqrt((central.x - sat.x) ** 2 + (central.y - sat.y) ** 2)
                if (dist > 490) return null
                const dim = hasCascade && !(cascadeIds.has(satId) && cascadeIds.has(cons.corpo_central_id))
                return (
                  <circle key={`orb-${cons.id}-${satId}`}
                    cx={central.x} cy={central.y} r={dist}
                    fill="none" stroke={dim ? "rgba(106,156,253,0.025)" : "rgba(106,156,253,0.09)"}
                    strokeWidth={1} strokeDasharray="3 8" />
                )
              })
            })}

            {/* Orbital rings — filhos de caixa-preta expandida */}
            {viewMode === "orbital" && atores.filter(a => a.parent_id && !actorMap[a.parent_id]?.eh_caixa_preta).map(child => {
              const parent = actorMap[child.parent_id!]
              if (!parent) return null
              const dist = Math.sqrt((parent.x - child.x) ** 2 + (parent.y - child.y) ** 2)
              return (
                <circle key={`inner-orb-${child.id}`}
                  cx={parent.x} cy={parent.y} r={dist}
                  fill="none" stroke="rgba(255,184,208,0.15)"
                  strokeWidth={1} strokeDasharray="2 5" />
              )
            })}

            {/* Constellation name labels */}
            {viewMode === "orbital" && constelacoes.map(cons => {
              const central = actorMap[cons.corpo_central_id]
              if (!central) return null
              const r = nR(central.peso_hierarquico)
              return (
                <text key={`lbl-${cons.id}`} x={central.x} y={central.y - r - 20}
                  textAnchor="middle" fill="rgba(106,156,253,0.28)" fontSize={9}
                  style={{ fontFamily: mono, letterSpacing: "0.18em" }}>
                  {cons.nome.toUpperCase()}
                </text>
              )
            })}

            {/* Edges */}
            {relacoes.map(rel => {
              const src = actorMap[rel.ator_origem_id]
              const dst = actorMap[rel.ator_destino_id]
              if (!src || !dst) return null
              const cfg = EDGE_CFG[rel.tipo]
              const { path, cpx, cpy } = curvePath(src, dst)
              const isSel = selected?.kind === "relation" && selected.id === rel.id
              const isAff = hasCascade && cascadeIds.has(src.id) && cascadeIds.has(dst.id)
              const opacity = hasCascade ? (isAff ? 0.95 : 0.06) : 0.82

              return (
                <g key={rel.id} onClick={e => { e.stopPropagation(); setSelected({ kind: "relation", id: rel.id }) }} style={{ cursor: "pointer" }}>
                  <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
                  <path d={path} fill="none"
                    stroke={isSel ? "#ffffff" : isAff ? "#FFD700" : cfg.stroke}
                    strokeWidth={isSel ? cfg.width + 1 : cfg.width}
                    strokeDasharray={cfg.dash}
                    markerEnd={cfg.marker}
                    opacity={opacity} />
                  {rel.tipo === "Obrigação" && (
                    <g transform={`translate(${cpx},${cpy})`} opacity={opacity}>
                      <path d="M0,-8 L7,0 L0,8 L-7,0 Z" fill="#2452C9" stroke="#AEE4FF" strokeWidth={0.7} />
                      {rel.custo_recusa !== undefined && (
                        <text x={11} y={4} fill="#AEE4FF" fontSize={8} style={{ fontFamily: mono }}>{rel.custo_recusa}</text>
                      )}
                    </g>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {atores.map(ator => {
              // Ocultar filhos cujo pai está colapsado
              if (ator.parent_id && actorMap[ator.parent_id]?.eh_caixa_preta) return null

              const r = nR(ator.peso_hierarquico)
              const isSel = selected?.kind === "actor" && selected.id === ator.id
              const isAff = hasCascade && cascadeIds.has(ator.id)
              const dimmed = hasCascade && !isAff
              const childCount = atores.filter(a => a.parent_id === ator.id).length

              return (
                <g key={ator.id}
                  transform={`translate(${ator.x},${ator.y})`}
                  onMouseDown={e => handleNodeMouseDown(e, ator)}
                  onClick={e => handleNodeClick(e, ator.id)}
                  style={{ cursor: draggingNode && nodeDragRef.current?.id === ator.id ? "grabbing" : "grab", opacity: dimmed ? 0.15 : 1 }}
                  filter={isSel ? "url(#glow-sel)" : ator.eh_ppo ? "url(#glow-ppo)" : "url(#glow)"}
                >
                  {isAff && <circle r={r + 12} fill="rgba(255,215,0,0.1)" />}
                  {ator.eh_ppo && (
                    <circle r={r + 8} fill="none" stroke="#FFD700" strokeWidth={1.5} opacity={0.55} strokeDasharray="4 4" />
                  )}
                  {isSel && (
                    <circle r={r + 5} fill="none" stroke="white" strokeWidth={2} opacity={0.85} />
                  )}
                  <circle r={r} fill={NODE_FILL[ator.classe]} />
                  {ator.eh_caixa_preta && (
                    <>
                      <circle r={r} fill="url(#hatch)" opacity={0.45} />
                      <circle r={r} fill="rgba(2,12,30,0.35)" />
                      {childCount > 0 ? (
                        <>
                          <text textAnchor="middle" y={-3} dominantBaseline="middle"
                            fontSize={r * 0.52} fontWeight={600} fill="rgba(174,228,255,0.75)"
                            style={{ fontFamily: mono }}>
                            {childCount}
                          </text>
                          <text textAnchor="middle" y={r * 0.38} dominantBaseline="middle"
                            fontSize={r * 0.28} fill="rgba(174,228,255,0.4)"
                            style={{ fontFamily: mono }}>
                            ATORES
                          </text>
                        </>
                      ) : (
                        <text textAnchor="middle" dominantBaseline="middle"
                          fontSize={r * 0.5} fill="rgba(174,228,255,0.4)"
                          style={{ fontFamily: mono }}>
                          ▪
                        </text>
                      )}
                    </>
                  )}
                  {ator.eh_ppo && (
                    <text x={r - 1} y={-r + 5} textAnchor="middle" dominantBaseline="middle"
                      fontSize={11} fill="#FFD700">★</text>
                  )}
                  {/* Badge de filho */}
                  {ator.parent_id && (
                    <circle cx={r - 3} cy={-r + 3} r={5} fill="#FFB8D0" opacity={0.85} />
                  )}
                  <text y={r + 13} textAnchor="middle" fontSize={10}
                    fill={isSel ? "#ffffff" : isAff ? "#FFD700" : "#9dc8f5"}
                    fontWeight={isSel || ator.eh_ppo ? 600 : 400}
                    style={{ fontFamily: mono }}>
                    {ator.nome.length > 14 ? ator.nome.slice(0, 12) + "…" : ator.nome}
                  </text>
                  {viewMode === "grafo" && (
                    <text x={-r + 5} y={-r + 8} fontSize={8} fill="#AEE4FF" style={{ fontFamily: mono }}>
                      {ator.peso_hierarquico}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Hint */}
        <div className="absolute top-3 right-3 text-[9px] text-muted-foreground px-2.5 py-1.5 rounded-lg border border-border/40"
          style={{ fontFamily: mono, background: "rgba(7,20,40,0.75)", backdropFilter: "blur(6px)" }}>
          scroll: zoom · drag: pan · click: selecionar
        </div>

        {/* Legend toggle */}
        <button onClick={() => setShowLegend(v => !v)}
          className="absolute bottom-4 left-4 text-[10px] px-3 py-1.5 rounded-lg border transition-all duration-200"
          style={{ fontFamily: mono, background: "rgba(7,20,40,0.88)", backdropFilter: "blur(8px)",
            borderColor: showLegend ? "rgba(106,156,253,0.4)" : "rgba(106,156,253,0.15)",
            color: showLegend ? "#6A9CFD" : "#5a7ab0",
            transform: showLegend ? "scale(1.04)" : "scale(1)" }}>
          {showLegend ? "✕ Legenda" : "ℹ Legenda"}
        </button>

        {/* Legend panel */}
        {showLegend && (
          <div className="absolute bottom-12 left-4 rounded-xl border p-4 space-y-3 w-56"
            style={{ background: "rgba(7,20,40,0.93)", backdropFilter: "blur(14px)", borderColor: "rgba(106,156,253,0.18)",
              animation: "legendIn 0.22s cubic-bezier(0.22,1,0.36,1) both" }}>
            <LgSection title="Classe do Ator">
              {[{ color: "#977DFF", label: "Humano" }, { color: "#4B7BFF", label: "Organizacional" }, { color: "#FFCCF2", label: "Não humano" }].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}66` }} />
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#9dc8f5" }}>{label}</span>
                </div>
              ))}
            </LgSection>
            <LgSection title="Tipo de Relação">
              {[
                { color: "#6A9CFD", thick: false, dash: false, label: "Promessa"    },
                { color: "#4B7BFF", thick: true,  dash: false, label: "Imposição"   },
                { color: "#2452C9", thick: true,  dash: false, label: "Obrigação ◆" },
                { color: "#FFB8D0", thick: false, dash: true,  label: "Delegação"   },
              ].map(({ color, thick, dash, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <svg width="24" height="10" className="flex-shrink-0">
                    <line x1="0" y1="5" x2="24" y2="5" stroke={color}
                      strokeWidth={thick ? 3 : 1.5} strokeDasharray={dash ? "4 2" : undefined} />
                  </svg>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#9dc8f5" }}>{label}</span>
                </div>
              ))}
            </LgSection>
            <LgSection title="Marcadores">
              {[{ sym: "★", color: "#FFD700", label: "PPO" }, { sym: "▪", color: "#6A9CFD", label: "Caixa-preta" }].map(({ sym, color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-4 text-center flex-shrink-0" style={{ color, fontSize: 12 }}>{sym}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#9dc8f5" }}>{label}</span>
                </div>
              ))}
            </LgSection>
          </div>
        )}

        {/* Right panel */}
        {(selAtor || selRelacao) && (
          <RightPanel
            ator={selAtor ?? null}
            relacao={selRelacao ?? null}
            actorMap={actorMap}
            atores={atores}
            onClose={() => setSelected(null)}
            onToggleBlackBox={id => setAtores(prev => prev.map(a => a.id === id ? { ...a, eh_caixa_preta: !a.eh_caixa_preta } : a))}
            onCascade={runCascade}
            hasCascade={hasCascade}
            onAddChildActor={(child) => setAtores(prev => [...prev, child])}
            canEdit={isEditor}
            onDeleteAtor={id => { setAtores(prev => prev.filter(a => a.id !== id && a.parent_id !== id)); setRelacoes(prev => prev.filter(r => r.ator_origem_id !== id && r.ator_destino_id !== id)); setSelected(null) }}
            onDeleteRelacao={id => { setRelacoes(prev => prev.filter(r => r.id !== id)); setSelected(null) }}
            onEditAtor={(updated) => setAtores(prev => prev.map(a => a.id === updated.id ? updated : a))}
            onEditRelacao={(updated) => setRelacoes(prev => prev.map(r => r.id === updated.id ? updated : r))}
          />
        )}
      </div>

      {/* Modals — editor-only */}
      {isEditor && showAddActor    && <AddActorModal    atores={atores} onAdd={a => { setAtores(p => [...p, a]);    setShowAddActor(false)    }} onClose={() => setShowAddActor(false)} />}
      {isEditor && showAddRelation && <AddRelationModal atores={atores} onAdd={r => { setRelacoes(p => [...p, r]); setShowAddRelation(false) }} onClose={() => setShowAddRelation(false)} />}

      {/* Profile modal */}
      {showProfile && user && <EditarPerfil user={user} onClose={() => setShowProfile(false)} />}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────────────────────

function ComposicaoTab({ parent, children, canEdit, onToggleBlackBox, onAddChildActor }:
  { parent: Ator; children: Ator[]; canEdit: boolean; onToggleBlackBox: (id: string) => void; onAddChildActor: (a: Ator) => void }) {
  const mono = "'JetBrains Mono', monospace"
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState("")
  const [classe, setClasse] = useState<AtorClasse>("Humano")
  const [peso, setPeso] = useState(4)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    const angle = Math.random() * Math.PI * 2
    const dist = 80 + Math.random() * 60
    onAddChildActor({
      id: nome.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now(),
      nome: nome.trim(),
      classe,
      peso_hierarquico: peso,
      eh_ppo: false,
      eh_caixa_preta: false,
      x: parent.x + Math.cos(angle) * dist,
      y: parent.y + Math.sin(angle) * dist,
      parent_id: parent.id,
    })
    setNome("")
    setClasse("Humano")
    setPeso(4)
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Estado da caixa */}
      <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "rgba(106,156,253,0.15)", background: "rgba(106,156,253,0.04)" }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 3 }}>Estado</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: parent.eh_caixa_preta ? "#6A9CFD" : "#9dc8f5" }}>
            {parent.eh_caixa_preta ? "▪ Colapsada" : "□ Expandida"}
          </div>
        </div>
        <button onClick={() => onToggleBlackBox(parent.id)}
          className="text-[10px] px-2.5 py-1.5 rounded-lg border transition-all"
          style={{ fontFamily: mono, background: parent.eh_caixa_preta ? "rgba(106,156,253,0.12)" : "transparent",
            borderColor: "rgba(106,156,253,0.25)", color: "#6A9CFD" }}>
          {parent.eh_caixa_preta ? "Expandir" : "Colapsar"}
        </button>
      </div>

      {/* Lista de atores internos */}
      <div>
        <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>
          Atores internos ({children.length})
        </div>

        {children.length === 0 ? (
          <div className="py-4 text-center rounded-lg border border-dashed" style={{ borderColor: "rgba(106,156,253,0.15)" }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "#5a7ab0" }}>Nenhum ator interno</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#3a5070", marginTop: 3 }}>TAR: composição oculta</div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {children.map(child => (
              <div key={child.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "rgba(106,156,253,0.05)", border: "1px solid rgba(106,156,253,0.1)" }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CLASSE_COLOR[child.classe], boxShadow: `0 0 5px ${CLASSE_COLOR[child.classe]}55` }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: mono, fontSize: 11, color: "#cee0ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{child.nome}</div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0" }}>{child.classe} · peso {child.peso_hierarquico}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão / Formulário de adição — Editor only (RD05) */}
      {canEdit && !showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all"
          style={{ fontFamily: mono, fontSize: 11, borderColor: "rgba(255,184,208,0.3)",
            background: "rgba(255,184,208,0.06)", color: "#FFB8D0", borderStyle: "dashed" }}>
          <Plus size={12} /> Adicionar Ator
        </button>
      ) : canEdit ? (
        <form onSubmit={handleAdd} className="rounded-lg border p-3 space-y-3" style={{ borderColor: "rgba(255,184,208,0.2)", background: "rgba(255,184,208,0.04)" }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: "#FFB8D0", textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Novo ator interno · RF08
          </div>

          <input value={nome} onChange={e => setNome(e.target.value)} autoFocus
            placeholder="Nome do ator"
            className="w-full px-2.5 py-1.5 rounded-lg border outline-none text-xs"
            style={{ fontFamily: mono, background: "rgba(255,184,208,0.06)", borderColor: "rgba(255,184,208,0.2)", color: "#cee0ff" }} />

          <div className="flex gap-1.5">
            {(["Humano", "Organizacional", "Não humano"] as AtorClasse[]).map(c => (
              <button key={c} type="button" onClick={() => setClasse(c)}
                className="flex-1 py-1 rounded-md border text-[9px] transition-all"
                style={{ fontFamily: mono, background: classe === c ? `${CLASSE_COLOR[c]}18` : "transparent",
                  borderColor: classe === c ? `${CLASSE_COLOR[c]}44` : "rgba(106,156,253,0.12)",
                  color: classe === c ? CLASSE_COLOR[c] : "#5a7ab0" }}>
                {c === "Não humano" ? "Não-hum." : c}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", marginBottom: 4 }}>Peso: {peso}/10</div>
            <input type="range" min={1} max={10} value={peso} onChange={e => setPeso(Number(e.target.value))}
              className="w-full" style={{ accentColor: "#FFB8D0" }} />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ fontFamily: mono, background: "#FFB8D0", color: "#1a0820" }}>
              Cadastrar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ fontFamily: mono, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

function TBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "6px 12px", borderRadius: 8,
        border: `1px solid ${color}44`, color, background: `${color}0d`,
        display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}1a`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}0d`)}>
      {icon} {label}
    </button>
  )
}

function LgSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function RightPanel({ ator, relacao, actorMap, atores, onClose, onToggleBlackBox, onCascade, hasCascade, onAddChildActor, canEdit, onDeleteAtor, onDeleteRelacao, onEditAtor, onEditRelacao }:
  { ator: Ator | null; relacao: Relacao | null; actorMap: Record<string, Ator>; atores: Ator[]; onClose: () => void; onToggleBlackBox: (id: string) => void; onCascade: (id: string) => void; hasCascade: boolean; onAddChildActor: (a: Ator) => void; canEdit: boolean; onDeleteAtor: (id: string) => void; onDeleteRelacao: (id: string) => void; onEditAtor: (a: Ator) => void; onEditRelacao: (r: Relacao) => void }) {
  const mono = "'JetBrains Mono', monospace"
  const panelBg = { background: "rgba(7,20,40,0.96)", backdropFilter: "blur(18px)", borderLeft: "1px solid rgba(106,156,253,0.15)" }
  const [tab, setTab] = useState<"info" | "composicao">("info")
  const [editingAtor, setEditingAtor] = useState<Ator | null>(null)
  const [editingRelacao, setEditingRelacao] = useState<Relacao | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset tab when selection changes
  useEffect(() => { setTab("info"); setConfirmDelete(false); setEditingAtor(null); setEditingRelacao(null) }, [ator?.id, relacao?.id])

  const children = ator ? atores.filter(a => a.parent_id === ator.id) : []

  return (
    <div className="absolute top-0 right-0 h-full w-72 flex flex-col" style={panelBg}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <span style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          {ator ? "Painel do Ator" : "Painel da Relação"}
        </span>
        <button onClick={onClose} style={{ color: "#5a7ab0", lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#cee0ff")}
          onMouseLeave={e => (e.currentTarget.style.color = "#5a7ab0")}>
          <X size={13} />
        </button>
      </div>

      {/* Tabs — só para atores */}
      {ator && (
        <div className="flex mx-5 mb-1 shrink-0 border-b" style={{ borderColor: "rgba(106,156,253,0.12)" }}>
          {([
            { key: "info",       label: "Ator"         },
            { key: "composicao", label: `Caixa-preta${children.length ? ` (${children.length})` : ""}` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-3 py-2 text-[10px] border-b-2 transition-all -mb-px"
              style={{ fontFamily: mono, letterSpacing: "0.06em",
                borderBottomColor: tab === t.key ? "#6A9CFD" : "transparent",
                color: tab === t.key ? "#6A9CFD" : "#5a7ab0" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

      {ator && tab === "info" && (
        <>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex-shrink-0" style={{
              background: `radial-gradient(circle at 35% 35%, ${CLASSE_COLOR[ator.classe]}44, ${CLASSE_COLOR[ator.classe]}11)`,
              border: `2px solid ${CLASSE_COLOR[ator.classe]}55`,
              boxShadow: `0 0 18px ${CLASSE_COLOR[ator.classe]}33`,
            }} />
            <div>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 15, fontWeight: 700, color: "#cee0ff", lineHeight: 1.2 }}>{ator.nome}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: CLASSE_COLOR[ator.classe], marginTop: 2 }}>{ator.classe}</div>
            </div>
          </div>

          <div className="space-y-4">
            <PField label="Peso Hierárquico">
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-0.5 flex-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 h-2 rounded-sm" style={{ background: i < ator.peso_hierarquico ? "#6A9CFD" : "rgba(106,156,253,0.1)" }} />
                  ))}
                </div>
                <span style={{ fontFamily: mono, fontSize: 11, color: "#6A9CFD" }}>{ator.peso_hierarquico}</span>
              </div>
            </PField>

            <PField label="PPO">
              <span style={{ fontFamily: mono, fontSize: 11, color: ator.eh_ppo ? "#FFD700" : "#5a7ab0" }}>
                {ator.eh_ppo ? "★ Sim — Ponto de Passagem Obrigatório" : "Não"}
              </span>
            </PField>

            <PField label="Caixa-preta (TAR)">
              <button onClick={() => onToggleBlackBox(ator.id)}
                className="mt-1 text-xs px-3 py-1.5 rounded-lg border transition-all"
                style={{ fontFamily: mono, background: ator.eh_caixa_preta ? "rgba(106,156,253,0.1)" : "transparent",
                  borderColor: ator.eh_caixa_preta ? "#6A9CFD55" : "rgba(106,156,253,0.18)",
                  color: ator.eh_caixa_preta ? "#6A9CFD" : "#5a7ab0" }}>
                {ator.eh_caixa_preta ? "▪ Colapsado — clique p/ expandir" : "□ Expandido — clique p/ colapsar"}
              </button>
            </PField>

            <PField label="Classe (TAR)">
              <span style={{ fontFamily: mono, fontSize: 11, color: "#9dc8f5" }}>{ator.classe}</span>
            </PField>
          </div>

          <div className="mt-auto pt-4 border-t" style={{ borderColor: "rgba(106,156,253,0.12)" }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>Ações · RF12</div>
            <button onClick={() => onCascade(ator.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all"
              style={{ fontFamily: mono, fontSize: 11,
                background: hasCascade ? "rgba(255,215,0,0.12)" : "rgba(255,215,0,0.05)",
                borderColor: "rgba(255,215,0,0.28)", color: "#FFD700" }}>
              <span>⚡ Simular Cascata</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </>
      )}

      {ator && tab === "composicao" && (
        <ComposicaoTab
          parent={ator}
          children={children}
          canEdit={canEdit}
          onToggleBlackBox={onToggleBlackBox}
          onAddChildActor={onAddChildActor}
        />
      )}

      {relacao && (
        <>
          <div>
            <div className="inline-block px-3 py-1 rounded-md text-xs font-semibold" style={{
              fontFamily: mono, background: `${TIPO_COLOR[relacao.tipo]}22`,
              color: TIPO_COLOR[relacao.tipo], border: `1px solid ${TIPO_COLOR[relacao.tipo]}44`,
            }}>
              {relacao.tipo}
            </div>
          </div>

          <div className="space-y-4">
            <PField label="Origem">
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CLASSE_COLOR[actorMap[relacao.ator_origem_id]?.classe ?? "Humano"] ?? "#6A9CFD" }} />
                <span style={{ fontFamily: mono, fontSize: 11, color: "#cee0ff" }}>{actorMap[relacao.ator_origem_id]?.nome ?? relacao.ator_origem_id}</span>
              </div>
            </PField>
            <PField label="Destino">
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CLASSE_COLOR[actorMap[relacao.ator_destino_id]?.classe ?? "Humano"] ?? "#6A9CFD" }} />
                <span style={{ fontFamily: mono, fontSize: 11, color: "#cee0ff" }}>{actorMap[relacao.ator_destino_id]?.nome ?? relacao.ator_destino_id}</span>
              </div>
            </PField>

            {relacao.custo_recusa !== undefined && (
              <PField label="Custo de Recusa">
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(106,156,253,0.12)" }}>
                    <div className="h-full rounded-full" style={{ width: `${relacao.custo_recusa * 10}%`, background: "#6A9CFD", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#6A9CFD" }}>{relacao.custo_recusa}/10</span>
                </div>
              </PField>
            )}

            {relacao.distancia_regulatoria !== undefined && (
              <PField label="Distância Regulatória">
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,184,208,0.12)" }}>
                    <div className="h-full rounded-full" style={{ width: `${relacao.distancia_regulatoria * 20}%`, background: "#FFB8D0", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#FFB8D0" }}>{relacao.distancia_regulatoria}/5</span>
                </div>
              </PField>
            )}
          </div>

          <div className="p-3 rounded-lg text-[10px] leading-relaxed" style={{
            background: `${TIPO_COLOR[relacao.tipo]}0e`,
            border: `1px solid ${TIPO_COLOR[relacao.tipo]}22`,
            color: `${TIPO_COLOR[relacao.tipo]}cc`,
            fontFamily: mono,
          }}>
            {relacao.tipo === "Promessa"  && "Burgess: a promessa é sempre e unicamente do promitente. A origem nunca pode ser o agente que impôs (RF07/RD02)."}
            {relacao.tipo === "Imposição" && "Burgess: a imposição vem de fora. O agente decide apenas sua resposta, nunca a origem da pressão (RF04)."}
            {relacao.tipo === "Obrigação" && "Imposição + custo de recusa. O raio orbital encoda a distância regulatória (RF17). ◆ indica o custo de recusa."}
            {relacao.tipo === "Delegação" && "Transferência de agência a um ator (ex: equipe, plataforma). Visualmente distinta da Promessa (RF06)."}
          </div>
        </>
      )}

      </div>

      {/* ── Action bar (Editor only — RD05) ── */}
      {canEdit && (ator || relacao) && (
        <div className="px-5 pb-5 pt-3 shrink-0 border-t flex flex-col gap-2" style={{ borderColor: "rgba(106,156,253,0.1)" }}>

          {/* Edit inline form for ator */}
          {editingAtor && ator && (
            <form onSubmit={e => { e.preventDefault(); onEditAtor(editingAtor); setEditingAtor(null) }} className="space-y-2 mb-1">
              <input value={editingAtor.nome} onChange={e => setEditingAtor(p => p && ({ ...p, nome: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                style={{ fontFamily: mono, background: "#0a1535", borderColor: "rgba(106,156,253,0.25)", color: "#cee0ff" }} />
              <select value={editingAtor.classe} onChange={e => setEditingAtor(p => p && ({ ...p, classe: e.target.value as AtorClasse }))}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                style={{ fontFamily: mono, background: "#0a1535", borderColor: "rgba(106,156,253,0.25)", color: "#cee0ff" }}>
                {(["Humano", "Organizacional", "Não humano"] as AtorClasse[]).map(c => <option key={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: mono, fontSize: 10, color: "#5a7ab0" }}>Peso</span>
                <input type="range" min={1} max={10} value={editingAtor.peso_hierarquico}
                  onChange={e => setEditingAtor(p => p && ({ ...p, peso_hierarquico: +e.target.value }))}
                  className="flex-1" />
                <span style={{ fontFamily: mono, fontSize: 10, color: "#6A9CFD" }}>{editingAtor.peso_hierarquico}</span>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ fontFamily: mono, background: "#6A9CFD", color: "#020c1e" }}>Salvar</button>
                <button type="button" onClick={() => setEditingAtor(null)} className="flex-1 py-1.5 rounded-lg text-xs border" style={{ fontFamily: mono, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>Cancelar</button>
              </div>
            </form>
          )}

          {/* Edit inline form for relacao */}
          {editingRelacao && relacao && (
            <form onSubmit={e => { e.preventDefault(); onEditRelacao(editingRelacao); setEditingRelacao(null) }} className="space-y-2 mb-1">
              <select value={editingRelacao.tipo} onChange={e => setEditingRelacao(p => p && ({ ...p, tipo: e.target.value as RelacaoTipo }))}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                style={{ fontFamily: mono, background: "#0a1535", borderColor: "rgba(106,156,253,0.25)", color: "#cee0ff" }}>
                {(["Promessa", "Imposição", "Obrigação", "Delegação"] as RelacaoTipo[]).map(t => <option key={t}>{t}</option>)}
              </select>
              {(editingRelacao.tipo === "Obrigação") && (
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: mono, fontSize: 10, color: "#5a7ab0" }}>Custo recusa</span>
                  <input type="range" min={1} max={10} value={editingRelacao.custo_recusa ?? 5}
                    onChange={e => setEditingRelacao(p => p && ({ ...p, custo_recusa: +e.target.value }))}
                    className="flex-1" />
                  <span style={{ fontFamily: mono, fontSize: 10, color: "#6A9CFD" }}>{editingRelacao.custo_recusa ?? 5}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ fontFamily: mono, background: "#6A9CFD", color: "#020c1e" }}>Salvar</button>
                <button type="button" onClick={() => setEditingRelacao(null)} className="flex-1 py-1.5 rounded-lg text-xs border" style={{ fontFamily: mono, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>Cancelar</button>
              </div>
            </form>
          )}

          {/* Confirm delete */}
          {confirmDelete ? (
            <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p style={{ fontFamily: mono, fontSize: 10, color: "#ef4444" }}>Confirmar exclusão?{ator && " As relações vinculadas também serão removidas."}</p>
              <div className="flex gap-2">
                <button onClick={() => ator ? onDeleteAtor(ator.id) : relacao && onDeleteRelacao(relacao.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ fontFamily: mono, background: "#ef4444", color: "#fff" }}>Excluir</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 rounded-lg text-xs border"
                  style={{ fontFamily: mono, borderColor: "rgba(106,156,253,0.2)", color: "#5a7ab0" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {!editingAtor && !editingRelacao && (
                <button onClick={() => ator ? setEditingAtor(ator) : relacao && setEditingRelacao(relacao)}
                  className="flex-1 py-1.5 rounded-lg text-xs border transition-all"
                  style={{ fontFamily: mono, borderColor: "rgba(106,156,253,0.25)", color: "#6A9CFD", background: "rgba(106,156,253,0.05)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(106,156,253,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(106,156,253,0.05)")}>
                  ✎ Editar
                </button>
              )}
              <button onClick={() => setConfirmDelete(true)}
                className="flex-1 py-1.5 rounded-lg text-xs border transition-all"
                style={{ fontFamily: mono, borderColor: "rgba(239,68,68,0.25)", color: "#ef4444", background: "rgba(239,68,68,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.05)")}>
                ✕ Excluir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function AddActorModal({ atores: _atores, onAdd, onClose }: { atores: Ator[]; onAdd: (a: Ator) => void; onClose: () => void }) {
  const [nome, setNome] = useState("")
  const [classe, setClasse] = useState<AtorClasse>("Humano")
  const [peso, setPeso] = useState(5)
  const [ppo, setPpo] = useState(false)
  const [caixaPreta, setCaixaPreta] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    onAdd({
      id: nome.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now(),
      nome: nome.trim(),
      classe,
      peso_hierarquico: peso,
      eh_ppo: ppo,
      eh_caixa_preta: caixaPreta,
      x: 300 + Math.random() * 600,
      y: 200 + Math.random() * 450,
    })
  }

  return (
    <ModalShell title="Cadastrar Ator · RF01/RF02" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <MField label="Nome do Ator">
          <input value={nome} onChange={e => setNome(e.target.value)} autoFocus
            placeholder="ex: Billie Eilish"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace", background: "rgba(106,156,253,0.05)", borderColor: "rgba(106,156,253,0.2)", color: "#cee0ff" }} />
        </MField>

        <MField label="Classe (TAR)">
          <div className="flex gap-2">
            {(["Humano", "Organizacional", "Não humano"] as AtorClasse[]).map(c => (
              <button key={c} type="button" onClick={() => setClasse(c)}
                className="flex-1 py-1.5 rounded-lg text-xs border transition-all"
                style={{ fontFamily: "'JetBrains Mono', monospace",
                  background: classe === c ? `${CLASSE_COLOR[c]}18` : "transparent",
                  borderColor: classe === c ? `${CLASSE_COLOR[c]}55` : "rgba(106,156,253,0.15)",
                  color: classe === c ? CLASSE_COLOR[c] : "#5a7ab0" }}>
                {c}
              </button>
            ))}
          </div>
        </MField>

        <MField label={`Peso Hierárquico · RF10/RF16: ${peso}/10`}>
          <input type="range" min={1} max={10} value={peso} onChange={e => setPeso(Number(e.target.value))}
            className="w-full mt-1" style={{ accentColor: "#6A9CFD" }} />
          <div className="flex justify-between mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0" }}>
            <span>menor poder</span><span>maior poder</span>
          </div>
        </MField>

        <div className="flex gap-6">
          {[
            { label: "★ PPO · RF09", val: ppo, set: setPpo, color: "#FFD700" },
            { label: "▪ Caixa-preta · RF08", val: caixaPreta, set: setCaixaPreta, color: "#6A9CFD" },
          ].map(({ label, val, set, color }) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer" onClick={() => set(!val)}>
              <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                style={{ background: val ? `${color}22` : "transparent", borderColor: val ? `${color}88` : "rgba(106,156,253,0.25)" }}>
                {val && <span style={{ color, fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: val ? color : "#5a7ab0" }}>{label}</span>
            </label>
          ))}
        </div>

        <button type="submit" className="w-full py-2.5 rounded-lg font-semibold transition-all"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: "#6A9CFD", color: "#020c1e" }}>
          Cadastrar Ator
        </button>
      </form>
    </ModalShell>
  )
}

function AddRelationModal({ atores, onAdd, onClose }: { atores: Ator[]; onAdd: (r: Relacao) => void; onClose: () => void }) {
  const [tipo, setTipo] = useState<RelacaoTipo>("Promessa")
  const [origemId, setOrigemId] = useState(atores[0]?.id ?? "")
  const [destinoId, setDestinoId] = useState(atores[1]?.id ?? "")
  const [custo, setCusto] = useState(5)
  const [dist, setDist] = useState(3)
  const [error, setError] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (origemId === destinoId) { setError("Origem e destino devem ser distintos."); return }
    setError("")
    onAdd({
      id: "r-" + Date.now(),
      tipo,
      ator_origem_id: origemId,
      ator_destino_id: destinoId,
      ...(tipo === "Obrigação" ? { custo_recusa: custo, distancia_regulatoria: dist } : {}),
    })
  }

  const selStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
    background: "#020c1e", borderRadius: 8, border: "1px solid rgba(106,156,253,0.2)",
    color: "#cee0ff", padding: "8px 12px", width: "100%", outline: "none",
  }

  return (
    <ModalShell title="Registrar Relação · RF03–RF06" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <MField label="Tipo de Relação">
          <div className="grid grid-cols-2 gap-2">
            {(["Promessa", "Imposição", "Obrigação", "Delegação"] as RelacaoTipo[]).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className="py-2 rounded-lg text-xs border transition-all"
                style={{ fontFamily: "'JetBrains Mono', monospace",
                  background: tipo === t ? `${TIPO_COLOR[t]}18` : "transparent",
                  borderColor: tipo === t ? `${TIPO_COLOR[t]}55` : "rgba(106,156,253,0.15)",
                  color: tipo === t ? TIPO_COLOR[t] : "#5a7ab0" }}>
                {t}
              </button>
            ))}
          </div>
        </MField>

        {tipo === "Promessa" && (
          <div className="p-3 rounded-lg" style={{ background: "rgba(106,156,253,0.07)", borderLeft: "2px solid #6A9CFD66", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6A9CFDbb", lineHeight: 1.6 }}>
            RF07: A Promessa só pode partir do próprio promitente — nunca do agente que impôs (RD02).
          </div>
        )}

        <MField label="Ator de Origem">
          <select value={origemId} onChange={e => setOrigemId(e.target.value)} style={selStyle}>
            {atores.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.classe})</option>)}
          </select>
        </MField>

        <MField label="Ator de Destino">
          <select value={destinoId} onChange={e => setDestinoId(e.target.value)} style={selStyle}>
            {atores.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.classe})</option>)}
          </select>
        </MField>

        {tipo === "Obrigação" && (
          <>
            <MField label={`Custo de Recusa · RF10: ${custo}/10`}>
              <input type="range" min={1} max={10} value={custo} onChange={e => setCusto(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: "#6A9CFD" }} />
            </MField>
            <MField label={`Distância Regulatória · RF17: ${dist}/5`}>
              <input type="range" min={1} max={5} value={dist} onChange={e => setDist(Number(e.target.value))} className="w-full mt-1" style={{ accentColor: "#FFB8D0" }} />
            </MField>
          </>
        )}

        {error && <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ef4444" }}>{error}</p>}

        <button type="submit" className="w-full py-2.5 rounded-lg font-semibold"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: "#6A9CFD", color: "#020c1e" }}>
          Registrar Relação
        </button>
      </form>
    </ModalShell>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(1,6,18,0.82)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: "#071428", borderColor: "rgba(106,156,253,0.22)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "#cee0ff", letterSpacing: "0.05em" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "#5a7ab0" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#cee0ff")}
            onMouseLeave={e => (e.currentTarget.style.color = "#5a7ab0")}>
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5a7ab0", letterSpacing: "0.16em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  )
}
}
