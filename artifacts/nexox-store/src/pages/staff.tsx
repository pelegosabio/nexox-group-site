import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

type StaffUser = { username: string; email: string; token: string };
type Ticket = { id: number; clientName: string; clientEmail: string; subject: string; status: string; createdAt: string };
type Message = { id: number; senderType: "client" | "staff"; senderName: string; message: string; createdAt: string };
type TicketDetail = Ticket & { messages: Message[] };
type CustomOrder = { id: number; clientName: string; clientEmail: string; packageType: string; projectName: string; price: string; status: string; createdAt: string; logoBase64?: string; referenceBase64?: string };
type ChatMsg = { id: number; senderType: string; senderName: string; message: string; createdAt: string };
type OrderDetail = CustomOrder & { messages: ChatMsg[] };
type FreeVerif = { id: number; token: string; username: string; printBase64: string; status: string; createdAt: string; reviewedAt: string | null; freeKey: string | null };

function statusLabel(s: string) {
  if (s === "open") return { label: "Aberto", cls: "bg-blue-500/20 text-blue-400" };
  if (s === "in_progress") return { label: "Em Andamento", cls: "bg-yellow-500/20 text-yellow-400" };
  return { label: "Encerrado", cls: "bg-zinc-500/20 text-zinc-400" };
}

function orderStatusLabel(s: string) {
  if (s === "pending") return { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-400" };
  if (s === "in_progress") return { label: "Em Andamento", cls: "bg-blue-500/20 text-blue-400" };
  if (s === "completed") return { label: "Concluído", cls: "bg-green-500/20 text-green-400" };
  return { label: "Cancelado", cls: "bg-red-500/20 text-red-400" };
}

export default function StaffPage() {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [tab, setTab] = useState<"login" | "register">("login");

  useEffect(() => {
    const saved = localStorage.getItem("nexox_staff_user");
    if (saved) try { setStaffUser(JSON.parse(saved)); } catch {}
  }, []);

  const handleLogin = (user: StaffUser) => { localStorage.setItem("nexox_staff_user", JSON.stringify(user)); setStaffUser(user); };
  const handleLogout = () => { localStorage.removeItem("nexox_staff_user"); setStaffUser(null); };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-800 opacity-90" />
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">NEXOX GROUP</span>
          </Link>
          <div className="flex items-center gap-3">
            {staffUser && <span className="text-zinc-400 text-sm">{staffUser.username}</span>}
            <span className="text-zinc-400 text-sm">Painel Staff</span>
            {staffUser && <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Sair</button>}
          </div>
        </div>
      </header>
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {!staffUser ? <StaffAuth tab={tab} setTab={setTab} onLogin={handleLogin} /> : <StaffDashboard staffUser={staffUser} />}
      </div>
    </div>
  );
}

function StaffAuth({ tab, setTab, onLogin }: { tab: "login" | "register"; setTab: (t: "login" | "register") => void; onLogin: (u: StaffUser) => void }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setMsg(""); setIsError(false);
    try {
      const res = await fetch(`${BASE()}/api/staff/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password }) });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); setIsError(true); setLoading(false); return; }
      onLogin(data);
    } catch { setMsg("Erro de conexão."); setIsError(true); } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setLoading(true); setMsg(""); setIsError(false);
    try {
      const res = await fetch(`${BASE()}/api/staff/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); setIsError(true); setLoading(false); return; }
      setMsg(data.message); setIsError(false);
      setTimeout(() => setTab("login"), 2000);
    } catch { setMsg("Erro de conexão."); setIsError(true); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-3xl font-black mb-8 text-center">Acesso Staff</h1>
      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 mb-6">
        <button onClick={() => setTab("login")} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === "login" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>Entrar</button>
        <button onClick={() => setTab("register")} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${tab === "register" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>Solicitar Acesso</button>
      </div>
      <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 space-y-4">
        {tab === "register" && (
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Username</label>
            <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="staff_user" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
          </div>
        )}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@nexox.com" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Senha</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
        </div>
        {msg && <p className={`text-sm ${isError ? "text-red-400" : "text-green-400"}`}>{msg}</p>}
        <button onClick={tab === "login" ? handleLogin : handleRegister} disabled={loading} className="w-full py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50">
          {loading ? "Aguarde..." : tab === "login" ? "Entrar" : "Solicitar Acesso"}
        </button>
        {tab === "register" && <p className="text-zinc-500 text-xs text-center">Sua conta será ativada após aprovação do administrador.</p>}
      </div>
    </div>
  );
}

function StaffDashboard({ staffUser }: { staffUser: StaffUser }) {
  const [dashTab, setDashTab] = useState<"tickets" | "custom" | "free">("tickets");

  const tabs = [
    { key: "tickets" as const, label: "Tickets de Suporte" },
    { key: "free" as const, label: "Verificações Free" },
    { key: "custom" as const, label: "Pedidos Custom" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-black">Painel Staff</h1>
        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setDashTab(t.key)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${dashTab === t.key ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {dashTab === "tickets" && <TicketsDashboard staffUser={staffUser} />}
      {dashTab === "custom" && <CustomOrdersDashboard staffUser={staffUser} />}
      {dashTab === "free" && <FreeVerifDashboard staffUser={staffUser} />}
    </div>
  );
}

function TicketsDashboard({ staffUser }: { staffUser: StaffUser }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const headers = { "x-staff-token": staffUser.token };

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected?.messages]);

  const fetchTickets = async () => {
    setLoading(true);
    try { const res = await fetch(`${BASE()}/api/staff/tickets`, { headers }); if (res.ok) setTickets(await res.json()); } finally { setLoading(false); }
  };

  const openTicket = async (t: Ticket) => {
    const res = await fetch(`${BASE()}/api/staff/tickets/${t.id}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`${BASE()}/api/staff/tickets/${selected.id}/messages`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: reply }) });
      if (res.ok) { const data = await res.json(); setSelected((prev) => prev ? { ...prev, messages: [...prev.messages, data] } : prev); setReply(""); }
    } finally { setSending(false); }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    await fetch(`${BASE()}/api/staff/tickets/${selected.id}/status`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSelected((prev) => prev ? { ...prev, status } : prev);
    setTickets((prev) => prev.map((t) => t.id === selected.id ? { ...t, status } : t));
  };

  const filtered = filterStatus === "all" ? tickets : tickets.filter((t) => t.status === filterStatus);
  const countByStatus = (s: string) => tickets.filter((t) => t.status === s).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black">Tickets de Suporte</h2>
        <button onClick={fetchTickets} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Atualizar</button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ label: "Abertos", status: "open", cls: "text-blue-400" }, { label: "Em Andamento", status: "in_progress", cls: "text-yellow-400" }, { label: "Encerrados", status: "closed", cls: "text-zinc-400" }].map((s) => (
          <div key={s.status} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p className={`text-3xl font-black ${s.cls}`}>{countByStatus(s.status)}</p>
            <p className="text-zinc-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "open", "in_progress", "closed"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterStatus === s ? "bg-white text-black" : "border border-white/10 hover:bg-white/10"}`}>
                {s === "all" ? "Todos" : statusLabel(s).label}
              </button>
            ))}
          </div>
          {loading ? <p className="text-zinc-400 text-sm">Carregando...</p> : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 text-sm">Nenhum ticket encontrado.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((t) => {
                const st = statusLabel(t.status);
                return (
                  <button key={t.id} onClick={() => openTicket(t)} className={`w-full text-left rounded-2xl border p-4 transition hover:bg-white/10 ${selected?.id === t.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">#{t.id} — {t.subject}</p>
                        <p className="text-zinc-400 text-xs truncate">{t.clientName} · {t.clientEmail}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          {!selected ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500 text-sm">Selecione um ticket para ver as mensagens.</div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 flex flex-col" style={{ height: "500px" }}>
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">#{selected.id} — {selected.subject}</p>
                  <p className="text-zinc-400 text-xs">{selected.clientName} · {selected.clientEmail}</p>
                </div>
                <select value={selected.status} onChange={(e) => changeStatus(e.target.value)} className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none transition">
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="closed">Encerrado</option>
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.senderType === "staff" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${msg.senderType === "staff" ? "bg-white text-black" : "bg-zinc-700"}`}>
                      {msg.senderType === "staff" ? "S" : msg.senderName[0]?.toUpperCase()}
                    </div>
                    <div className={`rounded-2xl px-3 py-2 max-w-[78%] text-sm ${msg.senderType === "staff" ? "bg-white text-black rounded-tr-none" : "bg-zinc-900 border border-white/10 rounded-tl-none"}`}>
                      <p className={`text-xs font-bold mb-0.5 ${msg.senderType === "staff" ? "text-black/50" : "text-zinc-500"}`}>{msg.senderType === "staff" ? `Staff · ${msg.senderName}` : msg.senderName}</p>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {selected.status !== "closed" ? (
                <div className="px-4 py-3 border-t border-white/10 flex gap-2">
                  <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Responder..." className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none text-sm transition" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition disabled:opacity-50">Enviar</button>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-white/10 text-center text-zinc-500 text-xs">Ticket encerrado</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FreeVerifDashboard({ staffUser }: { staffUser: StaffUser }) {
  const [verifs, setVerifs] = useState<FreeVerif[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [expandedPrint, setExpandedPrint] = useState<string | null>(null);
  const headers = { "x-staff-token": staffUser.token };

  useEffect(() => { fetchVerifs(); }, []);

  const fetchVerifs = async () => {
    setLoading(true);
    try { const res = await fetch(`${BASE()}/api/staff/free-verifications`, { headers }); if (res.ok) setVerifs(await res.json()); } finally { setLoading(false); }
  };

  const approve = async (id: number) => {
    setMsg("");
    try {
      const res = await fetch(`${BASE()}/api/staff/free-verifications/${id}/approve`, { method: "PUT", headers });
      if (res.ok) { setVerifs((prev) => prev.map((v) => v.id === id ? { ...v, status: "approved", reviewedAt: new Date().toISOString() } : v)); setMsg("✓ Aprovado com sucesso!"); }
      else setMsg("Erro ao aprovar.");
    } catch { setMsg("Erro ao aprovar."); }
    setTimeout(() => setMsg(""), 4000);
  };

  const reject = async (id: number) => {
    setMsg("");
    try {
      const res = await fetch(`${BASE()}/api/staff/free-verifications/${id}/reject`, { method: "PUT", headers });
      if (res.ok) { setVerifs((prev) => prev.map((v) => v.id === id ? { ...v, status: "rejected", reviewedAt: new Date().toISOString() } : v)); setMsg("Verificação recusada."); }
      else setMsg("Erro ao recusar.");
    } catch { setMsg("Erro ao recusar."); }
    setTimeout(() => setMsg(""), 4000);
  };

  const pendingCount = verifs.filter((v) => v.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black mb-1">Verificações Free</h2>
          <p className="text-zinc-400 text-sm">Prints de inscrição no canal aguardando liberação do CHEAT FREE.</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-bold">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</span>}
          <button onClick={fetchVerifs} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Atualizar</button>
        </div>
      </div>
      {msg && <div className={`rounded-xl px-4 py-3 text-sm font-bold mb-4 ${msg.startsWith("✓") ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>{msg}</div>}
      {loading ? <p className="text-zinc-400 text-sm">Carregando...</p> : verifs.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500">Nenhuma verificação enviada ainda.</div>
      ) : (
        <div className="space-y-3">
          {verifs.map((v) => {
            const isPending = v.status === "pending";
            const isApproved = v.status === "approved";
            return (
              <div key={v.id} className={`rounded-[24px] border p-5 ${isPending ? "border-yellow-500/30 bg-yellow-500/5" : isApproved ? "border-green-500/20 bg-green-500/5" : "border-white/10 bg-white/5 opacity-60"}`}>
                <div className="flex items-start gap-5">
                  <button
                    onClick={() => setExpandedPrint(expandedPrint === v.token ? null : v.token)}
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/20 hover:border-white/50 transition bg-zinc-900"
                    title="Clique para ver o print"
                  >
                    <img src={v.printBase64} alt="print" className="w-full h-full object-cover" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black">#{v.id} — {v.username}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isPending ? "bg-yellow-500/20 text-yellow-400" : isApproved ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {isPending ? "Pendente" : isApproved ? "Aprovado" : "Recusado"}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs">{new Date(v.createdAt).toLocaleString("pt-BR")}</p>
                    {v.reviewedAt && <p className="text-zinc-600 text-xs">Revisado: {new Date(v.reviewedAt).toLocaleString("pt-BR")}</p>}
                    {isApproved && v.freeKey && <p className="text-green-400 text-xs mt-1 font-mono font-bold">Key: {v.freeKey}</p>}
                  </div>
                  {isPending && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approve(v.id)} className="px-4 py-2 rounded-xl bg-green-500 text-black font-black text-sm hover:bg-green-400 transition">✓ Aprovar</button>
                      <button onClick={() => reject(v.id)} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/30 transition">Recusar</button>
                    </div>
                  )}
                </div>
                {expandedPrint === v.token && (
                  <div className="mt-4 rounded-2xl overflow-hidden border border-white/20">
                    <img src={v.printBase64} alt="print completo" className="w-full max-h-96 object-contain bg-zinc-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {expandedPrint && (() => {
        const v = verifs.find((x) => x.token === expandedPrint);
        if (!v) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setExpandedPrint(null)}>
            <div className="relative max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <img src={v.printBase64} alt="print" className="w-full h-auto object-contain max-h-[85vh]" />
              <button onClick={() => setExpandedPrint(null)} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white font-bold hover:bg-black/90 transition flex items-center justify-center">✕</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function CustomOrdersDashboard({ staffUser }: { staffUser: StaffUser }) {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const headers = { "x-staff-token": staffUser.token };

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected?.messages]);

  const fetchOrders = async () => {
    setLoading(true);
    try { const res = await fetch(`${BASE()}/api/staff/custom-orders`, { headers }); if (res.ok) setOrders(await res.json()); } finally { setLoading(false); }
  };

  const openOrder = async (id: number) => {
    const res = await fetch(`${BASE()}/api/staff/custom-orders/${id}`, { headers });
    if (res.ok) setSelected(await res.json());
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch(`${BASE()}/api/staff/custom-orders/${selected.id}/messages`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: reply }) });
      if (res.ok) { const data = await res.json(); setSelected((prev) => prev ? { ...prev, messages: [...prev.messages, data] } : prev); setReply(""); }
    } finally { setSending(false); }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    await fetch(`${BASE()}/api/staff/custom-orders/${selected.id}/status`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrders((prev) => prev.map((o) => o.id === selected.id ? { ...o, status } : o));
    setSelected((prev) => prev ? { ...prev, status } : prev);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black">Pedidos Custom — Faça seu Cheat</h2>
        <button onClick={fetchOrders} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Atualizar</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          {loading ? <p className="text-zinc-400 text-sm">Carregando...</p> : orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 text-sm">Nenhum pedido custom ainda.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {orders.map((o) => {
                const st = orderStatusLabel(o.status);
                return (
                  <button key={o.id} onClick={() => openOrder(o.id)} className={`w-full text-left rounded-2xl border p-4 transition hover:bg-white/10 ${selected?.id === o.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">#{o.id} — {o.projectName}</p>
                        <p className="text-zinc-400 text-xs truncate">{o.clientName} · {o.packageType}</p>
                        <p className="text-green-400 text-xs font-bold">{o.price}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          {!selected ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500 text-sm">Selecione um pedido para ver os detalhes.</div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/5 flex flex-col" style={{ height: "600px" }}>
              <div className="px-5 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm">#{selected.id} — {selected.projectName}</p>
                    <p className="text-zinc-400 text-xs">{selected.clientName} · {selected.clientEmail}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">{selected.packageType} · {selected.price}</p>
                  </div>
                  <select value={selected.status} onChange={(e) => changeStatus(e.target.value)} className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none transition">
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                {(selected.logoBase64 || selected.referenceBase64) && (
                  <div className="flex gap-3 mt-3">
                    {selected.logoBase64 && <div><p className="text-xs text-zinc-500 mb-1">Logo:</p><img src={selected.logoBase64} alt="logo" className="h-12 rounded-lg object-contain border border-white/10" /></div>}
                    {selected.referenceBase64 && <div><p className="text-xs text-zinc-500 mb-1">Referência:</p><img src={selected.referenceBase64} alt="ref" className="h-12 rounded-lg object-contain border border-white/10" /></div>}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.senderType === "staff" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${msg.senderType === "staff" ? "bg-white text-black" : msg.senderType === "system" ? "bg-zinc-600" : "bg-zinc-700"}`}>
                      {msg.senderType === "staff" ? "S" : msg.senderType === "system" ? "N" : msg.senderName[0]?.toUpperCase()}
                    </div>
                    <div className={`rounded-2xl px-3 py-2 max-w-[78%] text-sm ${msg.senderType === "staff" ? "bg-white text-black rounded-tr-none" : "bg-zinc-900 border border-white/10 rounded-tl-none"}`}>
                      <p className={`text-xs font-bold mb-0.5 ${msg.senderType === "staff" ? "text-black/50" : "text-zinc-500"}`}>{msg.senderType === "staff" ? `Staff · ${msg.senderName}` : msg.senderType === "system" ? "Sistema" : msg.senderName}</p>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
                <input type="text" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Responder ao cliente..." className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none text-sm transition" />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition disabled:opacity-50">
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
