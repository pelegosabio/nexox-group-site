import { Router, type IRouter } from "express";
import { db, freeVerificationsTable, downloadLinksTable, staffAccountsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

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
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, password] = decoded.split(":");
    if (!email || !password) { res.status(401).json({ error: "Token inválido" }); return; }
    const staff = await db.select().from(staffAccountsTable).where(eq(staffAccountsTable.email, email)).limit(1);
    if (!staff.length || staff[0]!.password !== password) { res.status(401).json({ error: "Credenciais inválidas" }); return; }
    if (!staff[0]!.approved) { res.status(403).json({ error: "Conta aguardando aprovação do admin" }); return; }
    req.staffUser = staff[0];
    next();
  } catch { res.status(401).json({ error: "Token inválido" }); }
}

function requireAdminOrStaff(req: any, res: any, next: any) {
  const secret = req.headers["x-admin-secret"] as string | undefined;
  if (secret && secret === ADMIN_SECRET) { next(); return; }
  requireStaff(req, res, next);
}

async function getFreeKey(): Promise<string | null> {
  try {
    const rows = await db.select().from(downloadLinksTable).where(eq(downloadLinksTable.productId, "free-key")).limit(1);
    return rows.length ? rows[0]!.downloadUrl : null;
  } catch { return null; }
}

router.post("/free-verifications", async (req, res) => {
  const { username, printBase64 } = req.body as { username?: string; printBase64?: string };
  if (!username?.trim() || !printBase64) {
    res.status(400).json({ error: "Nome e print são obrigatórios." });
    return;
  }
  try {
    const token = randomBytes(24).toString("hex");
    const [row] = await db.insert(freeVerificationsTable).values({
      token,
      username: username.trim(),
      printBase64,
      status: "pending",
    }).returning();
    res.json({ id: row!.id, token });
  } catch (err) {
    req.log.error({ err }, "Erro ao criar verificação free");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/free-verifications/status", async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(400).json({ error: "Token obrigatório" }); return; }
  try {
    const rows = await db.select().from(freeVerificationsTable).where(eq(freeVerificationsTable.token, token)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Verificação não encontrada" }); return; }
    const v = rows[0]!;

    let downloadUrl: string | null = null;
    if (v.status === "approved") {
      try {
        const dl = await db.select().from(downloadLinksTable).where(eq(downloadLinksTable.productId, "free")).limit(1);
        if (dl.length) downloadUrl = dl[0]!.downloadUrl;
      } catch {}
    }

    res.json({ id: v.id, status: v.status, username: v.username, freeKey: v.freeKey ?? null, downloadUrl });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar status verificação free");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/free-verifications", requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(freeVerificationsTable).orderBy(desc(freeVerificationsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar verificações free");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/free-verifications/:id/approve", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const freeKey = await getFreeKey();
    await db.update(freeVerificationsTable)
      .set({ status: "approved", reviewedAt: new Date(), freeKey: freeKey ?? null })
      .where(eq(freeVerificationsTable.id, id));
    res.json({ approved: true, freeKey });
  } catch (err) {
    req.log.error({ err }, "Erro ao aprovar verificação free");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/free-verifications/:id/reject", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.update(freeVerificationsTable)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(freeVerificationsTable.id, id));
    res.json({ rejected: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao rejeitar verificação free");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/staff/free-verifications", requireStaff, async (req, res) => {
  try {
    const rows = await db.select().from(freeVerificationsTable).orderBy(desc(freeVerificationsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar verificações free (staff)");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/staff/free-verifications/:id/approve", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const freeKey = await getFreeKey();
    await db.update(freeVerificationsTable)
      .set({ status: "approved", reviewedAt: new Date(), freeKey: freeKey ?? null })
      .where(eq(freeVerificationsTable.id, id));
    res.json({ approved: true, freeKey });
  } catch (err) {
    req.log.error({ err }, "Erro ao aprovar verificação free (staff)");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/staff/free-verifications/:id/reject", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.update(freeVerificationsTable)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(freeVerificationsTable.id, id));
    res.json({ rejected: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao rejeitar verificação free (staff)");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
