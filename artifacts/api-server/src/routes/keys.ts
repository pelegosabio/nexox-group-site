import { Router, type IRouter } from "express";
import { db, productKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "nexox-admin";

function requireAdmin(req: any, res: any, next: any) {
  const secret = req.headers["x-admin-secret"] as string | undefined;
  if (!secret || secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  next();
}

router.post("/keys/take", async (req, res) => {
  const { plan, buyerName } = req.body as { plan?: string; buyerName?: string };

  if (!plan) {
    res.status(400).json({ error: "Plano é obrigatório" });
    return;
  }

  try {
    const available = await db
      .select()
      .from(productKeysTable)
      .where(and(eq(productKeysTable.plan, plan), eq(productKeysTable.used, false)))
      .limit(1);

    if (available.length === 0) {
      res.status(404).json({ error: "Sem keys disponíveis para este plano. Entre em contato com o suporte." });
      return;
    }

    const key = available[0]!;

    await db
      .update(productKeysTable)
      .set({ used: true, usedAt: new Date(), buyerName: buyerName ?? null })
      .where(eq(productKeysTable.id, key.id));

    res.json({ key: key.keyValue });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar key");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/keys/stock/:plan", async (req, res) => {
  const { plan } = req.params as { plan: string };
  try {
    const available = await db
      .select()
      .from(productKeysTable)
      .where(and(eq(productKeysTable.plan, plan), eq(productKeysTable.used, false)));

    res.json({ plan, available: available.length });
  } catch (err) {
    req.log.error({ err }, "Erro ao verificar estoque");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/keys", requireAdmin, async (req, res) => {
  try {
    const keys = await db
      .select()
      .from(productKeysTable)
      .orderBy(productKeysTable.plan, productKeysTable.id);
    res.json(keys);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar keys");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/admin/keys", requireAdmin, async (req, res) => {
  const { plan, keys } = req.body as { plan?: string; keys?: string[] };

  if (!plan || !keys || !Array.isArray(keys) || keys.length === 0) {
    res.status(400).json({ error: "Plano e lista de keys são obrigatórios" });
    return;
  }

  try {
    const rows = keys
      .map((k) => k.trim())
      .filter(Boolean)
      .map((keyValue) => ({ plan, keyValue }));

    await db.insert(productKeysTable).values(rows);
    res.json({ inserted: rows.length });
  } catch (err) {
    req.log.error({ err }, "Erro ao inserir keys");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/admin/keys/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.delete(productKeysTable).where(eq(productKeysTable.id, id));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao deletar key");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
