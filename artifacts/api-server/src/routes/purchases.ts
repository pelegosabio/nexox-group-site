import { Router, type IRouter } from "express";
import { db, pendingPurchasesTable, productKeysTable, downloadLinksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";

const router: IRouter = Router();
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "nexox-admin";
const MP_ACCESS_TOKEN = process.env["MP_ACCESS_TOKEN"] ?? "";

function getMpClient() {
  return new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
}

function requireAdmin(req: any, res: any, next: any) {
  const secret = req.headers["x-admin-secret"] as string | undefined;
  if (!secret || secret !== ADMIN_SECRET) { res.status(401).json({ error: "Não autorizado" }); return; }
  next();
}

function getWebhookUrl(req: any): string | undefined {
  if (process.env["MP_WEBHOOK_URL"]) return process.env["MP_WEBHOOK_URL"];
  // Use REPLIT_DOMAINS (dev domain without port) if available
  const replitDomain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim();
  if (replitDomain) return `https://${replitDomain}/api/purchases/webhook`;
  return undefined; // skip notification_url if no valid URL
}

async function confirmPurchase(purchaseId: number, buyerName: string, planId: string, product: string) {
  const available = await db.select().from(productKeysTable)
    .where(and(eq(productKeysTable.plan, planId), eq(productKeysTable.used, false))).limit(1);
  if (!available.length) return false;

  const key = available[0]!;
  await db.update(productKeysTable)
    .set({ used: true, usedAt: new Date(), buyerName })
    .where(eq(productKeysTable.id, key.id));

  let downloadUrl: string | null = null;
  try {
    const dl = await db.select().from(downloadLinksTable)
      .where(eq(downloadLinksTable.productId, product)).limit(1);
    if (dl.length) downloadUrl = dl[0]!.downloadUrl;
  } catch {}

  await db.update(pendingPurchasesTable).set({
    status: "confirmed", keyValue: key.keyValue, downloadUrl, confirmedAt: new Date(),
  }).where(eq(pendingPurchasesTable.id, purchaseId));

  return true;
}

// Endpoint genérico para gerar um PIX MP (usado em pedidos customizados)
router.post("/payments/generate-pix", async (req, res) => {
  const { amount, description, buyerName } = req.body as {
    amount?: number; description?: string; buyerName?: string;
  };
  if (!amount || amount <= 0 || !description || !buyerName?.trim()) {
    res.status(400).json({ error: "Parâmetros inválidos." }); return;
  }
  if (!MP_ACCESS_TOKEN) {
    res.status(503).json({ error: "Pagamento MP não configurado." }); return;
  }
  try {
    const notifUrl = getWebhookUrl(req);
    const payment = new Payment(getMpClient());
    const mpResult = await payment.create({
      body: {
        transaction_amount: amount,
        description,
        payment_method_id: "pix",
        payer: {
          email: "comprador@nexox.app",
          first_name: buyerName.trim().split(" ")[0] ?? buyerName.trim(),
          last_name: buyerName.trim().split(" ").slice(1).join(" ") || ".",
        },
        ...(notifUrl ? { notification_url: notifUrl } : {}),
      },
    });
    res.json({
      mpQrCode: mpResult.point_of_interaction?.transaction_data?.qr_code ?? null,
      mpPaymentId: String(mpResult.id),
    });
  } catch (err: any) {
    req.log.error({ err }, "Erro ao gerar PIX MP");
    res.status(500).json({ error: "Erro ao gerar PIX. Tente novamente." });
  }
});

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
    const amount = parseFloat(pixAmount);

    let mpPaymentId: string | null = null;
    let mpQrCode: string | null = null;

    if (MP_ACCESS_TOKEN) {
      try {
        const payment = new Payment(getMpClient());
        const notifUrl = getWebhookUrl(req);
        const mpResult = await payment.create({
          body: {
            transaction_amount: amount,
            description: `NEXOX - ${product.toUpperCase()} ${planName}`,
            payment_method_id: "pix",
            payer: {
              email: "comprador@nexox.app",
              first_name: buyerName.trim().split(" ")[0] ?? buyerName.trim(),
              last_name: buyerName.trim().split(" ").slice(1).join(" ") || ".",
            },
            ...(notifUrl ? { notification_url: notifUrl } : {}),
          },
        });
        mpPaymentId = String(mpResult.id);
        mpQrCode = mpResult.point_of_interaction?.transaction_data?.qr_code ?? null;
      } catch (mpErr) {
        req.log.error({ mpErr }, "Erro Mercado Pago — continuando sem QR automático");
      }
    }

    const [row] = await db.insert(pendingPurchasesTable).values({
      token, buyerName: buyerName.trim(), product, planId, planName, price, pixAmount,
      status: "pending", mpPaymentId, mpQrCode,
    }).returning();

    res.json({ id: row!.id, token, mpQrCode, mpPaymentId });
  } catch (err) {
    req.log.error({ err }, "Erro ao criar compra pendente");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/purchases/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body as any;
    const type = (body?.type ?? req.query["type"]) as string | undefined;
    const dataId = body?.data?.id ?? req.query["data.id"] ?? req.query["id"];

    if (type !== "payment" || !dataId) return;

    const payment = new Payment(getMpClient());
    const mpPayment = await payment.get({ id: String(dataId) });

    if (mpPayment.status !== "approved") return;

    const mpPaymentId = String(mpPayment.id);
    const rows = await db.select().from(pendingPurchasesTable)
      .where(eq(pendingPurchasesTable.mpPaymentId, mpPaymentId)).limit(1);
    if (!rows.length) return;

    const purchase = rows[0]!;
    if (purchase.status === "confirmed") return;

    await confirmPurchase(purchase.id, purchase.buyerName, purchase.planId, purchase.product);
  } catch {}
});

router.get("/purchases/status", async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(400).json({ error: "Token obrigatório" }); return; }
  try {
    const rows = await db.select().from(pendingPurchasesTable)
      .where(eq(pendingPurchasesTable.token, token)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Compra não encontrada" }); return; }
    let p = rows[0]!;

    // Se ainda pendente e tem pagamento MP, verifica status diretamente na API do MP
    if (p.status === "pending" && p.mpPaymentId && MP_ACCESS_TOKEN) {
      try {
        const payment = new Payment(getMpClient());
        const mpPayment = await payment.get({ id: p.mpPaymentId });
        if (mpPayment.status === "approved") {
          await confirmPurchase(p.id, p.buyerName, p.planId, p.product);
          const updated = await db.select().from(pendingPurchasesTable)
            .where(eq(pendingPurchasesTable.token, token)).limit(1);
          p = updated[0] ?? p;
        }
      } catch {}
    }

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
    const rows = await db.select().from(pendingPurchasesTable)
      .orderBy(desc(pendingPurchasesTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar compras");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/purchases/:id/confirm", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const rows = await db.select().from(pendingPurchasesTable)
      .where(eq(pendingPurchasesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Compra não encontrada" }); return; }
    const purchase = rows[0]!;
    if (purchase.status === "confirmed") { res.status(400).json({ error: "Já confirmado" }); return; }

    const ok = await confirmPurchase(purchase.id, purchase.buyerName, purchase.planId, purchase.product);
    if (!ok) { res.status(404).json({ error: "Sem keys disponíveis para este plano." }); return; }

    const updated = await db.select().from(pendingPurchasesTable)
      .where(eq(pendingPurchasesTable.id, id)).limit(1);
    res.json({ confirmed: true, keyValue: updated[0]?.keyValue });
  } catch (err) {
    req.log.error({ err }, "Erro ao confirmar compra");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/purchases/:id/cancel", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.update(pendingPurchasesTable)
      .set({ status: "cancelled" })
      .where(eq(pendingPurchasesTable.id, id));
    res.json({ cancelled: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao cancelar compra");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
