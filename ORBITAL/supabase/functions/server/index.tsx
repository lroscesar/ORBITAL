import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Identifica o usuário logado a partir do token enviado pelo front
async function getUserId(c: any): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

app.get("/make-server-08dcc7e8/health", (c) => c.json({ status: "ok" }));

// Lista só as redes do usuário logado
app.get("/make-server-08dcc7e8/redes", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Não autenticado" }, 401);
  const redes = await kv.getByPrefix(`rede:${userId}:`);
  return c.json({ redes });
});

// Cria uma rede NOVA e VAZIA
app.post("/make-server-08dcc7e8/redes", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Não autenticado" }, 401);
  const body = await c.req.json();
  const rede = {
    id: "rede-" + Date.now(),
    nome: body.nome,
    descricao: body.descricao ?? "",
    criadaEm: new Date().toISOString(),
    totalAtores: 0,
    totalRelacoes: 0,
    atores: [],
    relacoes: [],
    constelacoes: [],
  };
  await kv.set(`rede:${userId}:${rede.id}`, rede);
  return c.json({ rede });
});

// Busca uma rede específica (com o que já foi salvo nela)
app.get("/make-server-08dcc7e8/redes/:id", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Não autenticado" }, 401);
  const rede = await kv.get(`rede:${userId}:${c.req.param("id")}`);
  if (!rede) return c.json({ error: "Rede não encontrada" }, 404);
  return c.json({ rede });
});

// Autosave — atualiza atores/relações/constelações
app.put("/make-server-08dcc7e8/redes/:id", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Não autenticado" }, 401);
  const body = await c.req.json();
  const key = `rede:${userId}:${c.req.param("id")}`;
  const existing = await kv.get(key);
  if (!existing) return c.json({ error: "Rede não encontrada" }, 404);
  const atualizada = {
    ...existing, ...body,
    totalAtores: body.atores?.length ?? existing.totalAtores,
    totalRelacoes: body.relacoes?.length ?? existing.totalRelacoes,
  };
  await kv.set(key, atualizada);
  return c.json({ rede: atualizada });
});

app.delete("/make-server-08dcc7e8/redes/:id", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Não autenticado" }, 401);
  await kv.del(`rede:${userId}:${c.req.param("id")}`);
  return c.json({ ok: true });
});

Deno.serve(app.fetch);