import { Router, type IRouter } from "express";
import { db, ticketsTable, ticketMessagesTable, staffAccountsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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
  if (!token) {
    res.status(401).json({ error: "Token de staff obrigatório" });
    return;
  }
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, password] = decoded.split(":");
    if (!email || !password) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }
    const staff = await db
      .select()
      .from(staffAccountsTable)
      .where(eq(staffAccountsTable.email, email))
      .limit(1);
    if (staff.length === 0 || staff[0]!.password !== password) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    if (!staff[0]!.approved) {
      res.status(403).json({ error: "Conta aguardando aprovação do admin" });
      return;
    }
    req.staffUser = staff[0];
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// ── TICKETS (CLIENTE) ─────────────────────────────

// Abrir ticket
router.post("/tickets", async (req, res) => {
  const { clientName, clientEmail, subject, message } = req.body as {
    clientName?: string;
    clientEmail?: string;
    subject?: string;
    message?: string;
  };

  if (!clientName || !clientEmail || !subject || !message) {
    res.status(400).json({ error: "Todos os campos são obrigatórios" });
    return;
  }

  try {
    const [ticket] = await db
      .insert(ticketsTable)
      .values({ clientName, clientEmail, subject, status: "open" })
      .returning();

    await db.insert(ticketMessagesTable).values({
      ticketId: ticket!.id,
      senderType: "client",
      senderName: clientName,
      message,
    });

    res.json({ id: ticket!.id, subject: ticket!.subject, status: ticket!.status });
  } catch (err) {
    req.log.error({ err }, "Erro ao criar ticket");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Buscar ticket pelo ID (cliente usa email para confirmar)
router.get("/tickets/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const email = req.query["email"] as string | undefined;

  try {
    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, id))
      .limit(1);

    if (tickets.length === 0) {
      res.status(404).json({ error: "Ticket não encontrado" });
      return;
    }

    const ticket = tickets[0]!;

    if (email && ticket.clientEmail !== email) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const messages = await db
      .select()
      .from(ticketMessagesTable)
      .where(eq(ticketMessagesTable.ticketId, id))
      .orderBy(ticketMessagesTable.createdAt);

    res.json({ ...ticket, messages });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar ticket");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Cliente envia mensagem no ticket
router.post("/tickets/:id/messages", async (req, res) => {
  const id = Number(req.params["id"]);
  const { email, message } = req.body as { email?: string; message?: string };

  if (!email || !message) {
    res.status(400).json({ error: "Email e mensagem obrigatórios" });
    return;
  }

  try {
    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, id))
      .limit(1);

    if (tickets.length === 0) {
      res.status(404).json({ error: "Ticket não encontrado" });
      return;
    }

    const ticket = tickets[0]!;

    if (ticket.clientEmail !== email) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const [msg] = await db
      .insert(ticketMessagesTable)
      .values({ ticketId: id, senderType: "client", senderName: ticket.clientName, message })
      .returning();

    res.json(msg);
  } catch (err) {
    req.log.error({ err }, "Erro ao enviar mensagem");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ── STAFF ─────────────────────────────────────────

// Cadastro de staff
router.post("/staff/register", async (req, res) => {
  const { username, email, password } = req.body as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!username || !email || !password) {
    res.status(400).json({ error: "Todos os campos são obrigatórios" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(staffAccountsTable)
      .where(eq(staffAccountsTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email já cadastrado" });
      return;
    }

    await db.insert(staffAccountsTable).values({ username, email, password, approved: false });
    res.json({ message: "Cadastro realizado! Aguarde aprovação do admin." });
  } catch (err) {
    req.log.error({ err }, "Erro ao cadastrar staff");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Login de staff
router.post("/staff/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email e senha obrigatórios" });
    return;
  }

  try {
    const staff = await db
      .select()
      .from(staffAccountsTable)
      .where(eq(staffAccountsTable.email, email))
      .limit(1);

    if (staff.length === 0 || staff[0]!.password !== password) {
      res.status(401).json({ error: "Email ou senha incorretos" });
      return;
    }

    if (!staff[0]!.approved) {
      res.status(403).json({ error: "Conta aguardando aprovação do admin" });
      return;
    }

    const token = Buffer.from(`${email}:${password}`).toString("base64");
    res.json({ token, username: staff[0]!.username, email: staff[0]!.email });
  } catch (err) {
    req.log.error({ err }, "Erro ao fazer login");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Staff: listar todos os tickets
router.get("/staff/tickets", requireStaff, async (req, res) => {
  try {
    const tickets = await db
      .select()
      .from(ticketsTable)
      .orderBy(desc(ticketsTable.createdAt));
    res.json(tickets);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar tickets");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Staff: ver ticket com mensagens
router.get("/staff/tickets/:id", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, id))
      .limit(1);

    if (tickets.length === 0) {
      res.status(404).json({ error: "Ticket não encontrado" });
      return;
    }

    const messages = await db
      .select()
      .from(ticketMessagesTable)
      .where(eq(ticketMessagesTable.ticketId, id))
      .orderBy(ticketMessagesTable.createdAt);

    res.json({ ...tickets[0]!, messages });
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar ticket");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Staff: responder ticket
router.post("/staff/tickets/:id/messages", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  const { message } = req.body as { message?: string };

  if (!message) {
    res.status(400).json({ error: "Mensagem obrigatória" });
    return;
  }

  try {
    const [msg] = await db
      .insert(ticketMessagesTable)
      .values({
        ticketId: id,
        senderType: "staff",
        senderName: (req as any).staffUser.username,
        message,
      })
      .returning();

    res.json(msg);
  } catch (err) {
    req.log.error({ err }, "Erro ao responder ticket");
    res.status(500).json({ error: "Erro interno" });
  }
});

// Staff: atualizar status do ticket
router.put("/staff/tickets/:id/status", requireStaff, async (req, res) => {
  const id = Number(req.params["id"]);
  const { status } = req.body as { status?: string };

  if (!status || !["open", "in_progress", "closed"].includes(status)) {
    res.status(400).json({ error: "Status inválido" });
    return;
  }

  try {
    await db.update(ticketsTable).set({ status }).where(eq(ticketsTable.id, id));
    res.json({ updated: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao atualizar status");
    res.status(500).json({ error: "Erro interno" });
  }
});

// ── ADMIN: gerenciar staff ────────────────────────

router.get("/admin/staff", requireAdmin, async (req, res) => {
  try {
    const staff = await db
      .select()
      .from(staffAccountsTable)
      .orderBy(staffAccountsTable.createdAt);
    res.json(staff);
  } catch (err) {
    req.log.error({ err }, "Erro ao listar staff");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.put("/admin/staff/:id/approve", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  const { approved } = req.body as { approved?: boolean };
  try {
    await db
      .update(staffAccountsTable)
      .set({ approved: approved ?? true })
      .where(eq(staffAccountsTable.id, id));
    res.json({ updated: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao aprovar staff");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.delete("/admin/staff/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params["id"]);
  try {
    await db.delete(staffAccountsTable).where(eq(staffAccountsTable.id, id));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao remover staff");
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
