import { Router, type IRouter } from "express";
import { db, couponsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

// Validar cupom (público)
router.post("/coupons/validate", async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ error: "Código obrigatório" });
    return;
  }
  try {
    const coupons = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.code, code.toUpperCase().trim()))
      .limit(1);

    if (coupons.length === 0) {
      res.status(404).json({ error: "Cupom não encontrado" });
      return;
    }

    const coupon = coupons[0]!;

    if (!coupon.active) {
      res.status(400).json({ error: "Cupom inativo" });
      return;
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ error: "Cupom atingiu o limite de usos" });
      return;
    }

    res.json({
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (err) {
    req.log.error({ err }, "Erro ao validar cupom");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Usar cupom (incrementa contador)
router.post("/coupons/use", async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ error: "Código obrigatório" });
    return;
  }
  try {
    const coupons = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.code, code.toUpperCase().trim()))
      .limit(1);

    if (coupons.length === 0 || !coupons[0]!.active) {
      res.status(400).json({ error: "Cupom inválido" });
      return;
    }

    const coupon = coupons[0]!;

    await db
      .update(couponsTable)
      .set({ usedCount: coupon.usedCount + 1 })
      .where(eq(couponsTable.id, coupon.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao usar cupom");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ADMIN: listar
router.get("/admin/coupons", requireAdmin, async (req, res) => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
    res.json(coupons);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar cupons");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ADMIN: criar
router.post("/admin/coupons", requireAdmin, async (req, res) => {
  const { code, discountType, discountValue, maxUses } = req.body as {
    code?: string;
    discountType?: string;
    discountValue?: number;
    maxUses?: number;
  };

  if (!code || !discountType || discountValue === undefined) {
    res.status(400).json({ error: "Campos obrigatórios: code, discountType, discountValue" });
    return;
  }
  if (!["percent", "fixed"].includes(discountType)) {
    res.status(400).json({ error: "discountType deve ser 'percent' ou 'fixed'" });
    return;
  }
  if (discountType === "percent" && (discountValue < 1 || discountValue > 100)) {
    res.status(400).json({ error: "Desconto percentual deve ser entre 1 e 100" });
    return;
  }

  try {
    const [coupon] = await db
      .insert(couponsTable)
      .values({
        code: code.toUpperCase().trim(),
        discountType,
        discountValue,
        maxUses: maxUses ?? 0,
        active: true,
      })
      .returning();
    res.json(coupon);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Código já existe" });
      return;
    }
    req.log.error({ err }, "Erro ao criar cupom");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ADMIN: ativar/desativar
router.put("/admin/coupons/:id/toggle", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const coupons = await db.select().from(couponsTable).where(eq(couponsTable.id, id)).limit(1);
    if (coupons.length === 0) {
      res.status(404).json({ error: "Cupom não encontrado" });
      return;
    }
    await db.update(couponsTable).set({ active: !coupons[0]!.active }).where(eq(couponsTable.id, id));
    res.json({ active: !coupons[0]!.active });
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar cupom");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ADMIN: deletar
router.delete("/admin/coupons/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao deletar cupom");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
