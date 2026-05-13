import { Router, type IRouter } from "express";
import { db, customOrdersTable, customOrderMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

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

async function requireStaff(req: any, res: any, next: any) {
  const token = req.headers["x-staff-token"] as string | undefined;
  if (!token) { res.status(401).json({ error: "Token de staff obrigatório" }); return; }
  try {
    const { staffAccountsTable } = await import("@workspace/db");
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, password] = decoded.split(":");
    if (!email || !password) { res.status(401).json({ error: "Token inválido" }); return; }
    const staff = await db.select().from(staffAccountsTable).where(eq(staffAccountsTable.email, email)).limit(1);
    if (staff.length === 0 || staff[0]!.password !== password || !staff[0]!.approved) {
      res.status(401).json({ error: "Não autorizado" }); return;
    }
    req.staffUser = staff[0];
    next();
  } catch { res.status(401).json({ error: "Token inválido" }); }
}

router.post("/custom-orders", async (req, res) => {
  const { clientName, clientEmail, packageType, projectName, logoBase64, referenceBase64, price } = req.body as {
    clientName?: string; clientEmail?: string; packageType?: string;
    projectName?: string; logoBase64?: string; referenceBase64?: string; price?: string;
  };

  if (!clientName || !clientEmail || !packageType || !projectName || !price) {
    res.status(400).json({ error: "Campos obrigatórios faltando" });
    return;
  }

  try {
    const clientToken = crypto.randomBytes(24).toString("hex");
    const [order] = await db.insert(customOrdersTable).values({
      clientName, clientEmail, packageType, projectName,
      logoBase64: logoBase64 ?? null,
      referenceBase64: referenceBase64 ?? null,
      price, clientToken,
    }).returning();

    await db.insert(customOrderMessagesTable).values({
      orderId: order!.id,
      senderType: "system",
      senderName: "NEXOX",
      message: `✅ Pedido recebido! Nome do cheat: "${projectName}" — Pacote: ${packageType} — Preço: ${price}. Nossa equipe entrará em contato em breve!`,
    });

    res.json({ id: order!.id, clientToken: order!.clientToken });
  } catch (err) {
    req.log.error({ err }, "Erro ao criar pedido custom");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/custom-orders/me", async (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) { res.status(400).json({ error: "Token obrigatório" }); return; }
  try {
    const orders = await db.select().from(customOrdersTable).where(eq(customOrdersTable.clientToken, token)).limit(1);
    if (orders.length === 0) { res.status(404).json({ error: "Pedido não encontrado" }); return; }
    const order = orders[0]!;
    const messages = await db.select().from(customOrderMessagesTable)
      .where(eq(customOrderMessagesTable.orderId, order.id))
      .orderBy(customOrderMessagesTable.createdAt);
    res.json({ ...order, messages });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar pedido");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/custom-orders/me/messages", async (req, res) => {
  const { token, message } = req.body as { token?: string; message?: string };
  if (!token || !message) { res.status(400).json({ error: "Token e mensagem obrigatórios" }); return; }
  try {
    const orders = await db.select().from(customOrdersTable).where(eq(customOrdersTable.clientToken, token)).limit(1);
    if (orders.length === 0) { res.status(404).json({ error: "Pedido não encontrado" }); return; }
    const order = orders[0]!;
    const [msg] = await db.insert(customOrderMessagesTable).values({
      orderId: order.id, senderType: "client", senderName: order.clientName, message,
    }).returning();
    res.json(msg);
  } catch (err) {
    req.log.error({ err }, "Erro ao enviar mensagem");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/staff/custom-orders", requireStaff, async (req, res) => {
  try {
    const orders = await db.select().from(customOrdersTable).orderBy(desc(customOrdersTable.createdAt));
    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar pedidos");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/staff/custom-orders/:id", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const orders = await db.select().from(customOrdersTable).where(eq(customOrdersTable.id, id)).limit(1);
    if (orders.length === 0) { res.status(404).json({ error: "Pedido não encontrado" }); return; }
    const messages = await db.select().from(customOrderMessagesTable)
      .where(eq(customOrderMessagesTable.orderId, id))
      .orderBy(customOrderMessagesTable.createdAt);
    res.json({ ...orders[0]!, messages });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar pedido");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/staff/custom-orders/:id/messages", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  const { message } = req.body as { message?: string };
  if (!message) { res.status(400).json({ error: "Mensagem obrigatória" }); return; }
  try {
    const [msg] = await db.insert(customOrderMessagesTable).values({
      orderId: id, senderType: "staff",
      senderName: (req as any).staffUser.username, message,
    }).returning();
    res.json(msg);
  } catch (err) {
    req.log.error({ err }, "Erro ao responder pedido");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/staff/custom-orders/:id/status", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  const { status } = req.body as { status?: string };
  if (!status || !["pending", "in_progress", "completed", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Status inválido" }); return;
  }
  try {
    await db.update(customOrdersTable).set({ status }).where(eq(customOrdersTable.id, id));
    res.json({ updated: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar status");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/custom-orders", requireAdmin, async (req, res) => {
  try {
    const orders = await db.select().from(customOrdersTable).orderBy(desc(customOrdersTable.createdAt));
    res.json(orders);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar pedidos");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/custom-orders/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const orders = await db.select().from(customOrdersTable).where(eq(customOrdersTable.id, id)).limit(1);
    if (orders.length === 0) { res.status(404).json({ error: "Pedido não encontrado" }); return; }
    const messages = await db.select().from(customOrderMessagesTable)
      .where(eq(customOrderMessagesTable.orderId, id))
      .orderBy(customOrderMessagesTable.createdAt);
    res.json({ ...orders[0]!, messages });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar pedido");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/admin/custom-orders/:id/messages", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  const { message } = req.body as { message?: string };
  if (!message) { res.status(400).json({ error: "Mensagem obrigatória" }); return; }
  try {
    const [msg] = await db.insert(customOrderMessagesTable).values({
      orderId: id, senderType: "staff", senderName: "Admin", message,
    }).returning();
    res.json(msg);
  } catch (err) {
    req.log.error({ err }, "Erro ao enviar mensagem");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/custom-orders/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  const { status } = req.body as { status?: string };
  if (!status || !["pending", "in_progress", "completed", "cancelled"].includes(status)) {
    res.status(400).json({ error: "Status inválido" }); return;
  }
  try {
    await db.update(customOrdersTable).set({ status }).where(eq(customOrdersTable.id, id));
    res.json({ updated: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar status");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
