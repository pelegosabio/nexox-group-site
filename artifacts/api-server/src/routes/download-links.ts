import { Router, type IRouter } from "express";
import { db, downloadLinksTable } from "@workspace/db";
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

router.get("/downloads/:productId", async (req, res) => {
  const { productId } = req.params as { productId: string };
  try {
    const links = await db.select().from(downloadLinksTable).where(eq(downloadLinksTable.productId, productId)).limit(1);
    if (links.length === 0) { res.status(404).json({ error: "Link não encontrado" }); return; }
    res.json({ productId, downloadUrl: links[0]!.downloadUrl });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar download");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/admin/downloads", requireAdmin, async (req, res) => {
  try {
    const links = await db.select().from(downloadLinksTable);
    res.json(links);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar downloads");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/downloads/:productId", requireAdmin, async (req, res) => {
  const { productId } = req.params as { productId: string };
  const { downloadUrl } = req.body as { downloadUrl?: string };
  if (!downloadUrl) { res.status(400).json({ error: "URL obrigatória" }); return; }
  try {
    const existing = await db.select().from(downloadLinksTable).where(eq(downloadLinksTable.productId, productId)).limit(1);
    if (existing.length > 0) {
      await db.update(downloadLinksTable).set({ downloadUrl, updatedAt: new Date() }).where(eq(downloadLinksTable.productId, productId));
    } else {
      await db.insert(downloadLinksTable).values({ productId, downloadUrl });
    }
    res.json({ productId, downloadUrl });
  } catch (err) {
    req.log.error({ err }, "Erro ao salvar download");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
