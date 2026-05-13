import { Router, type IRouter } from "express";
import { db, pendingPurchasesTable, productKeysTable, downloadLinksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

const router: IRouter = Router();
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "nexox-admin";

function requireAdmin(req: any, res: any, next: any) {
  const secret = req.headers["x-admin-secret"] as string | undefined;
  if (!secret || secret !== ADMIN_SECRET) { res.status(401).json({ error: "Não autorizado" }); return; }
  next();
}

router.post("/purchases/pending", async (req, res) => {
  const { buyerName, product, planId, planName, price, pixAmount } = req.body as {
    buyerName?: string; product?: string; planId?: string;
    planName?: string; price?: string; pixAmount?: string;
  };
  if (!buyerName?.trim() || !product || !planId || !planName || !price || !pixAmount) {
    res.status(400).json({ error: "Preencha todos os campos." }); return;
  }
  try {
    const token = randomBytes(24).toString("hex");
    const [row] = await db.insert(pendingPurchasesTable).values({
      token, buyerName: buyerName.trim(), product, planId, planName, price, pixAmount, status: "pending",
    }).returning();
    res.json({ id: row!.id, token });
  } catch (err) {
    req.log.error({ err }, "Erro ao criar compra pendente");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/purchases/status", async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(400).json({ error: "Token obrigatório" }); return; }
  try {
    const rows = await db.select().from(pendingPurchasesTable).where(eq(pendingPurchasesTable.token, token)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Compra não encontrada" }); return; }
    const p = rows[0]!;
    res.json({
      id: p.id, status: p.status, planName: p.planName, product: p.product,
      price: p.price, buyerName: p.buyerName, createdAt: p.createdAt,
      keyValue: p.status === "confirmed" ? p.keyValue : null,
      downloadUrl: p.status === "confirmed" ? p.downloadUrl : null,
    });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar status");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/purchases", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(pendingPurchasesTable).orderBy(desc(pendingPurchasesTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar compras");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/purchases/:id/confirm", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const rows = await db.select().from(pendingPurchasesTable).where(eq(pendingPurchasesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Compra não encontrada" }); return; }
    const purchase = rows[0]!;
    if (purchase.status === "confirmed") { res.status(400).json({ error: "Já confirmado" }); return; }

    const available = await db.select().from(productKeysTable)
      .where(and(eq(productKeysTable.plan, purchase.planId), eq(productKeysTable.used, false))).limit(1);
    if (!available.length) { res.status(404).json({ error: "Sem keys disponíveis para este plano." }); return; }

    const key = available[0]!;
    await db.update(productKeysTable).set({ used: true, usedAt: new Date(), buyerName: purchase.buyerName }).where(eq(productKeysTable.id, key.id));

    let downloadUrl: string | null = null;
    try {
      const dl = await db.select().from(downloadLinksTable).where(eq(downloadLinksTable.productId, purchase.product)).limit(1);
      if (dl.length) downloadUrl = dl[0]!.downloadUrl;
    } catch {}

    await db.update(pendingPurchasesTable).set({
      status: "confirmed", keyValue: key.keyValue, downloadUrl, confirmedAt: new Date(),
    }).where(eq(pendingPurchasesTable.id, id));

    res.json({ confirmed: true, keyValue: key.keyValue });
  } catch (err) {
    req.log.error({ err }, "Erro ao confirmar compra");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/purchases/:id/cancel", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.update(pendingPurchasesTable).set({ status: "cancelled" }).where(eq(pendingPurchasesTable.id, id));
    res.json({ cancelled: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao cancelar compra");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
