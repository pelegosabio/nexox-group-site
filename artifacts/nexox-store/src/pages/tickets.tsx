import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = {
  id: number;
  senderType: "client" | "staff";
  senderName: string;
  message: string;
  createdAt: string;
};

type Ticket = {
  id: number;
  clientName: string;
  clientEmail: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: Message[];
};

type SavedTicket = { id: number; subject: string; email: string };

function statusLabel(s: string) {
  if (s === "open") return { label: "Aberto", cls: "bg-blue-500/20 text-blue-400" };
  if (s === "in_progress") return { label: "Em Andamento", cls: "bg-yellow-500/20 text-yellow-400" };
  return { label: "Encerrado", cls: "bg-zinc-500/20 text-zinc-400" };
}

// ── PÁGINA PRINCIPAL DE TICKETS ──────────────────
export default function TicketsPage() {
  const params = useParams<{ id?: string }>();
  if (params.id) return <TicketChat id={Number(params.id)} />;
  return <TicketsList />;
}

// ── LISTA + FORMULÁRIO ───────────────────────────
function TicketsList() {
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [form, setForm] = useState({ clientName: "", clientEmail: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SavedTicket | null>(null);
  const [myTickets, setMyTickets] = useState<SavedTicket[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("nexox_tickets");
    if (saved) try { setMyTickets(JSON.parse(saved)); } catch {}
    // pre-fill name/email from logged user
    const user = localStorage.getItem("nexox_logged_user");
    if (user) {
      try {
        const u = JSON.parse(user);
        setForm((f) => ({ ...f, clientName: u.username ?? "", clientEmail: u.email ?? "" }));
      } catch {}
    }
  }, []);

  const handleSubmit = async () => {
    if (!form.clientName || !form.clientEmail || !form.subject || !form.message) {
      setError("Preencha todos os campos.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE()}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      const ticket: SavedTicket = { id: data.id, subject: data.subject, email: form.clientEmail };
      const existing = JSON.parse(localStorage.getItem("nexox_tickets") ?? "[]");
      localStorage.setItem("nexox_tickets", JSON.stringify([ticket, ...existing]));
      setMyTickets([ticket, ...myTickets]);
      setSuccess(ticket);
      setForm((f) => ({ ...f, subject: "", message: "" }));
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">NEXOX GROUP</span>
          </Link>
          <Link to="/" className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all text-sm">
            ← Voltar
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black mb-2">Suporte</h1>
        <p className="text-zinc-400 mb-8">Abra um ticket e nossa equipe responderá em breve.</p>

        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 mb-8 w-fit">
          <button
            onClick={() => setTab("new")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === "new" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
          >
            Novo Ticket
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === "mine" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
          >
            Meus Tickets {myTickets.length > 0 && `(${myTickets.length})`}
          </button>
        </div>

        {tab === "new" && (
          <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 space-y-4">
            {success && (
              <div className="rounded-2xl bg-green-500/10 border border-green-500/30 p-4">
                <p className="text-green-400 font-bold mb-1">Ticket #{success.id} criado!</p>
                <p className="text-zinc-400 text-sm">
                  Você pode acompanhar{" "}
                  <Link to={`/tickets/${success.id}`} className="text-white underline">
                    clicando aqui
                  </Link>
                  . Guarde seu email para acessar depois.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Seu nome</label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="João Silva"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Seu email</label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Assunto</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex: Problema com minha key"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Descreva seu problema</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Explique em detalhes o que aconteceu..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Abrir Ticket"}
            </button>
          </div>
        )}

        {tab === "mine" && (
          <div>
            {myTickets.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 text-center text-zinc-500">
                Nenhum ticket aberto neste dispositivo.
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map((t) => (
                  <Link key={t.id} to={`/tickets/${t.id}`}>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition cursor-pointer flex items-center justify-between">
                      <div>
                        <p className="font-bold">#{t.id} — {t.subject}</p>
                        <p className="text-zinc-400 text-sm">{t.email}</p>
                      </div>
                      <span className="text-zinc-400 text-sm">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHAT DO TICKET ───────────────────────────────
function TicketChat({ id }: { id: number }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved: SavedTicket[] = JSON.parse(localStorage.getItem("nexox_tickets") ?? "[]");
    const found = saved.find((t) => t.id === id);
    if (found) {
      setEmail(found.email);
      loadTicket(found.email);
    }
    // pre-fill from logged user
    const user = localStorage.getItem("nexox_logged_user");
    if (user) try { setEmailInput(JSON.parse(user).email ?? ""); } catch {}
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const loadTicket = async (e: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE()}/api/tickets/${id}?email=${encodeURIComponent(e)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setTicket(data);
      setEmail(e);
      setError("");
    } catch {
      setError("Erro ao carregar ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !ticket) return;
    setSending(true);
    try {
      const res = await fetch(`${BASE()}/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSending(false); return; }
      setTicket((prev) => prev ? { ...prev, messages: [...prev.messages, data] } : prev);
      setMessage("");
    } catch {
      setError("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  const st = ticket ? statusLabel(ticket.status) : null;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-5">
          <Link to="/tickets" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">Tickets</span>
          </Link>
          {st && (
            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${st.cls}`}>{st.label}</span>
          )}
        </div>
      </header>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col">
        {!ticket && !loading && (
          <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 max-w-sm mx-auto space-y-4">
            <h2 className="text-2xl font-black">Ticket #{id}</h2>
            <p className="text-zinc-400 text-sm">Informe seu email para acessar</p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
              onKeyDown={(e) => e.key === "Enter" && loadTicket(emailInput)}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={() => loadTicket(emailInput)}
              className="w-full py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition"
            >
              Acessar
            </button>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center text-zinc-400">Carregando...</div>
        )}

        {ticket && (
          <div className="flex flex-col flex-1 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-zinc-500 mb-1">Ticket #{ticket.id}</p>
              <h2 className="font-black text-xl">{ticket.subject}</h2>
              <p className="text-zinc-400 text-sm">{ticket.clientName} · {ticket.clientEmail}</p>
            </div>

            <div className="flex-1 space-y-3 min-h-[200px]">
              {ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.senderType === "client" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${msg.senderType === "staff" ? "bg-white text-black" : "bg-zinc-700"}`}>
                    {msg.senderType === "staff" ? "S" : msg.senderName[0]?.toUpperCase()}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm ${
                      msg.senderType === "client"
                        ? "bg-white text-black rounded-tr-none"
                        : "bg-zinc-900 border border-white/10 rounded-tl-none"
                    }`}
                  >
                    <p className={`text-xs font-bold mb-1 ${msg.senderType === "client" ? "text-black/50" : "text-zinc-500"}`}>
                      {msg.senderType === "staff" ? `Staff · ${msg.senderName}` : msg.senderName}
                    </p>
                    <p>{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {ticket.status !== "closed" ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escreva sua mensagem..."
                  className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-sm py-2">
                Este ticket foi encerrado.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
