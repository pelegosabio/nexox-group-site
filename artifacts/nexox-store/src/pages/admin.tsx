import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const PLANS = [
  { id: "rage-diario", label: "RAGE — Diário" }, { id: "rage-semanal", label: "RAGE — Semanal" },
  { id: "rage-15dias", label: "RAGE — 15 Dias" }, { id: "rage-mensal", label: "RAGE — Mensal" },
  { id: "rage-trimensal", label: "RAGE — Trimensal" }, { id: "rage-permanente", label: "RAGE — Permanente" },
  { id: "lite-diario", label: "LITE — Diário" }, { id: "lite-semanal", label: "LITE — Semanal" },
  { id: "lite-mensal", label: "LITE — Mensal" }, { id: "lite-permanente", label: "LITE — Permanente" },
];

const PLAN_PRICES: Record<string, string> = {
  "rage-diario": "R$ 5,00", "rage-semanal": "R$ 15,00", "rage-15dias": "R$ 20,00",
  "rage-mensal": "R$ 30,00", "rage-trimensal": "R$ 43,99", "rage-permanente": "R$ 50,00",
  "lite-diario": "R$ 4,00", "lite-semanal": "R$ 13,00", "lite-mensal": "R$ 27,00", "lite-permanente": "R$ 45,90",
};

type Key = { id: number; plan: string; keyValue: string; used: boolean; usedAt: string | null; buyerName: string | null; createdAt: string };
type StaffAccount = { id: number; username: string; email: string; approved: boolean; createdAt: string };
type Coupon = { id: number; code: string; discountType: string; discountValue: number; maxUses: number; usedCount: number; active: boolean; createdAt: string };
type DownloadLink = { id: number; productId: string; downloadUrl: string; updatedAt: string };
type CustomOrder = { id: number; clientName: string; clientEmail: string; packageType: string; projectName: string; price: string; status: string; createdAt: string; logoBase64?: string; referenceBase64?: string };
type ChatMsg = { id: number; senderType: string; senderName: string; message: string; createdAt: string };
type OrderDetail = CustomOrder & { messages: ChatMsg[] };

type AdminTab = "keys" | "staff" | "coupons" | "downloads" | "compras" | "custom" | "pendentes";
type PendingPurchase = { id: number; token: string; buyerName: string; product: string; planId: string; planName: string; price: string; pixAmount: string; status: string; keyValue: string | null; createdAt: string; confirmedAt: string | null };

const DOWNLOAD_PRODUCTS = [
  { id: "rage", label: "RAGE PANEL" },
  { id: "lite", label: "LITE PANEL" },
  { id: "free", label: "CHEAT FREE" },
];

const statusLabel = (s: string) => {
  if (s === "pending") return { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-400" };
  if (s === "in_progress") return { label: "Em Andamento", cls: "bg-blue-500/20 text-blue-400" };
  if (s === "completed") return { label: "Concluído", cls: "bg-green-500/20 text-green-400" };
  return { label: "Cancelado", cls: "bg-red-500/20 text-red-400" };
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<AdminTab>("keys");
  const [keys, setKeys] = useState<Key[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]!.id);
  const [newKeys, setNewKeys] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", discountType: "percent", discountValue: "", maxUses: "" });
  const [couponMsg, setCouponMsg] = useState("");
  const [downloads, setDownloads] = useState<Record<string, string>>({ rage: "", lite: "", free: "" });
  const [dlMsg, setDlMsg] = useState("");
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [chatReply, setChatReply] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const headers = { "x-admin-secret": secret };

  const fetchKeys = async (s: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/keys`, { headers: { "x-admin-secret": s } });
      if (res.status === 401) { setMsg("Senha incorreta!"); setAuthed(false); return; }
      setKeys(await res.json()); setAuthed(true); setMsg("");
    } catch { setMsg("Erro ao conectar com a API."); } finally { setLoading(false); }
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    try { const res = await fetch(`${BASE}/api/admin/staff`, { headers }); if (res.ok) setStaffList(await res.json()); } finally { setStaffLoading(false); }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try { const res = await fetch(`${BASE}/api/admin/coupons`, { headers }); if (res.ok) setCoupons(await res.json()); } finally { setCouponsLoading(false); }
  };

  const fetchDownloads = async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/downloads`, { headers });
      if (res.ok) {
        const data: DownloadLink[] = await res.json();
        const map: Record<string, string> = { rage: "", lite: "", free: "" };
        data.forEach((d) => { map[d.productId] = d.downloadUrl; });
        setDownloads(map);
      }
    } catch {}
  };

  const fetchCustomOrders = async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/custom-orders`, { headers });
      if (res.ok) setCustomOrders(await res.json());
    } catch {}
  };

  const fetchPendingPurchases = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/purchases`, { headers });
      if (res.ok) setPendingPurchases(await res.json());
    } catch {} finally { setPendingLoading(false); }
  };

  const confirmPurchase = async (id: number) => {
    setPendingMsg("");
    try {
      const res = await fetch(`${BASE}/api/admin/purchases/${id}/confirm`, { method: "PUT", headers });
      const data = await res.json();
      if (!res.ok) { setPendingMsg(`Erro: ${data.error}`); return; }
      setPendingMsg(`✓ Compra #${id} confirmada! Key: ${data.keyValue}`);
      setPendingPurchases((prev) => prev.map((p) => p.id === id ? { ...p, status: "confirmed", keyValue: data.keyValue } : p));
    } catch { setPendingMsg("Erro ao confirmar."); }
    setTimeout(() => setPendingMsg(""), 6000);
  };

  const cancelPurchase = async (id: number) => {
    if (!confirm("Cancelar esta compra?")) return;
    try {
      await fetch(`${BASE}/api/admin/purchases/${id}/cancel`, { method: "PUT", headers });
      setPendingPurchases((prev) => prev.map((p) => p.id === id ? { ...p, status: "cancelled" } : p));
    } catch {}
  };

  useEffect(() => {
    if (!authed) return;
    if (tab === "staff") fetchStaff();
    if (tab === "coupons") fetchCoupons();
    if (tab === "downloads") fetchDownloads();
    if (tab === "custom") fetchCustomOrders();
    if (tab === "pendentes") fetchPendingPurchases();
  }, [tab, authed]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedOrder?.messages]);

  const openOrder = async (id: number) => {
    const res = await fetch(`${BASE}/api/admin/custom-orders/${id}`, { headers });
    if (res.ok) setSelectedOrder(await res.json());
  };

  const sendChatReply = async () => {
    if (!chatReply.trim() || !selectedOrder) return;
    setChatSending(true);
    try {
      const res = await fetch(`${BASE}/api/admin/custom-orders/${selectedOrder.id}/messages`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatReply }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder((prev) => prev ? { ...prev, messages: [...prev.messages, data] } : prev);
        setChatReply("");
      }
    } finally { setChatSending(false); }
  };

  const changeOrderStatus = async (id: number, status: string) => {
    await fetch(`${BASE}/api/admin/custom-orders/${id}/status`, {
      method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setCustomOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    setSelectedOrder((prev) => prev && prev.id === id ? { ...prev, status } : prev);
  };

  const saveDownload = async (productId: string) => {
    const url = downloads[productId] ?? "";
    if (!url.trim()) return;
    setDlMsg("");
    try {
      const res = await fetch(`${BASE}/api/admin/downloads/${productId}`, {
        method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ downloadUrl: url }),
      });
      if (res.ok) setDlMsg(`✓ Link do ${productId.toUpperCase()} salvo!`);
      else setDlMsg("Erro ao salvar.");
    } catch { setDlMsg("Erro ao salvar."); }
    setTimeout(() => setDlMsg(""), 3000);
  };

  const handleCreateCoupon = async () => {
    const { code, discountType, discountValue, maxUses } = couponForm;
    if (!code.trim() || !discountValue) { setCouponMsg("Preencha todos os campos."); return; }
    try {
      const res = await fetch(`${BASE}/api/admin/coupons`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), discountType, discountValue: Number(discountValue), maxUses: Number(maxUses) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponMsg(data.error); return; }
      setCouponMsg("Cupom criado!"); setCouponForm({ code: "", discountType: "percent", discountValue: "", maxUses: "" });
      fetchCoupons();
    } catch { setCouponMsg("Erro ao criar cupom."); }
  };

  const handleToggleCoupon = async (id: number) => {
    try {
      const res = await fetch(`${BASE}/api/admin/coupons/${id}/toggle`, { method: "PUT", headers });
      const data = await res.json();
      setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, active: data.active } : c));
    } catch {}
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm("Deletar este cupom?")) return;
    await fetch(`${BASE}/api/admin/coupons/${id}`, { method: "DELETE", headers });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddKeys = async () => {
    const lines = newKeys.split("\n").map((k) => k.trim()).filter(Boolean);
    if (!lines.length) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/keys`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, keys: lines }),
      });
      const data = await res.json();
      setMsg(`${data.inserted} keys adicionadas!`); setNewKeys(""); fetchKeys(secret);
    } catch { setMsg("Erro ao adicionar keys."); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar esta key?")) return;
    await fetch(`${BASE}/api/admin/keys/${id}`, { method: "DELETE", headers });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const handleApproveStaff = async (id: number, approved: boolean) => {
    await fetch(`${BASE}/api/admin/staff/${id}/approve`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ approved }) });
    setStaffList((prev) => prev.map((s) => s.id === id ? { ...s, approved } : s));
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm("Remover este membro?")) return;
    await fetch(`${BASE}/api/admin/staff/${id}`, { method: "DELETE", headers });
    setStaffList((prev) => prev.filter((s) => s.id !== id));
  };

  const planLabel = (id: string) => PLANS.find((p) => p.id === id)?.label ?? id;
  const grouped = PLANS.map((plan) => ({
    ...plan,
    available: keys.filter((k) => k.plan === plan.id && !k.used).length,
    used: keys.filter((k) => k.plan === plan.id && k.used).length,
  }));

  const usedKeys = keys.filter((k) => k.used).sort((a, b) => new Date(b.usedAt ?? b.createdAt).getTime() - new Date(a.usedAt ?? a.createdAt).getTime());

  const pendingCount = pendingPurchases.filter((p) => p.status === "pending").length;

  const TABS: { key: AdminTab; label: string; badge?: number }[] = [
    { key: "pendentes", label: "Compras Pendentes", badge: pendingCount },
    { key: "keys", label: "Gerenciar Keys" },
    { key: "staff", label: "Gerenciar Staff" },
    { key: "coupons", label: "Cupons" },
    { key: "downloads", label: "Downloads" },
    { key: "compras", label: "Registro de Compras" },
    { key: "custom", label: "Pedidos Custom" },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-800 opacity-90" />
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-zinc-950/95">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">NEXOX GROUP</span>
          </Link>
          <span className="text-zinc-400 text-sm">Painel Admin</span>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {!authed ? (
          <div className="max-w-sm mx-auto">
            <h1 className="text-3xl font-black mb-8 text-center">Acesso Admin</h1>
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Senha de Admin</label>
                <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchKeys(secret)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
              </div>
              {msg && <p className="text-red-400 text-sm">{msg}</p>}
              <button onClick={() => fetchKeys(secret)} disabled={loading} className="w-full py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50">
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black">Painel Admin</h1>
              <button onClick={() => setAuthed(false)} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Sair</button>
            </div>

            <div className="flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 w-fit">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${tab === t.key ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
                  {t.label}
                  {!!t.badge && <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === t.key ? "bg-black/10 text-black" : "bg-yellow-500/30 text-yellow-300"}`}>{t.badge}</span>}
                </button>
              ))}
            </div>

            {tab === "pendentes" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black mb-1">Compras Pendentes</h2>
                    <p className="text-zinc-400 text-sm">Clientes que enviaram o PIX e estão aguardando confirmação. Verifique no seu banco e confirme abaixo.</p>
                  </div>
                  <button onClick={fetchPendingPurchases} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Atualizar</button>
                </div>
                {pendingMsg && <div className={`rounded-xl px-4 py-3 text-sm font-bold ${pendingMsg.startsWith("✓") ? "bg-green-500/20 text-green-400 border border-green-500/20" : "bg-red-500/20 text-red-400 border border-red-500/20"}`}>{pendingMsg}</div>}
                {pendingLoading ? <p className="text-zinc-400">Carregando...</p> : pendingPurchases.length === 0 ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500">Nenhuma compra registrada ainda.</div>
                ) : (
                  <div className="space-y-3">
                    {pendingPurchases.map((p) => {
                      const isPending = p.status === "pending";
                      const isConfirmed = p.status === "confirmed";
                      const isCancelled = p.status === "cancelled";
                      return (
                        <div key={p.id} className={`rounded-[24px] border p-5 ${isPending ? "border-yellow-500/30 bg-yellow-500/5" : isConfirmed ? "border-green-500/20 bg-green-500/5" : "border-white/10 bg-white/5 opacity-60"}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-black">#{p.id} — {p.buyerName}</span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isPending ? "bg-yellow-500/20 text-yellow-400" : isConfirmed ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                                  {isPending ? "Aguardando" : isConfirmed ? "Confirmado" : "Cancelado"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm mt-2">
                                <div><p className="text-zinc-500 text-xs">Produto</p><p className="font-bold">{p.product === "rage" ? "RAGE PANEL" : "LITE PANEL"}</p></div>
                                <div><p className="text-zinc-500 text-xs">Plano</p><p className="font-bold">{p.planName}</p></div>
                                <div><p className="text-zinc-500 text-xs">Valor PIX</p><p className="font-black text-green-400">R$ {p.pixAmount}</p></div>
                                <div><p className="text-zinc-500 text-xs">Data</p><p className="text-zinc-300 text-xs">{new Date(p.createdAt).toLocaleString("pt-BR")}</p></div>
                              </div>
                              {isConfirmed && p.keyValue && (
                                <div className="mt-2 text-sm"><span className="text-zinc-500">Key entregue: </span><span className="font-mono text-green-400">{p.keyValue}</span></div>
                              )}
                            </div>
                            {isPending && (
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => confirmPurchase(p.id)} className="px-4 py-2 rounded-xl bg-green-500 text-black font-black text-sm hover:bg-green-400 transition">
                                  ✓ Confirmar
                                </button>
                                <button onClick={() => cancelPurchase(p.id)} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-sm hover:bg-red-500/30 transition">
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "keys" && (
              <>
                <div>
                  <h2 className="text-xl font-black mb-4">Estoque por Plano</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {grouped.map((plan) => (
                      <div key={plan.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-xs text-zinc-400 mb-1 leading-tight">{plan.label}</p>
                        <p className="text-2xl font-black">{plan.available}</p>
                        <p className="text-xs text-zinc-500">{plan.used} usadas</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
                  <h2 className="text-xl font-black mb-6">Adicionar Keys</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Plano</label>
                      <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none transition">
                        {PLANS.map((p) => <option key={p.id} value={p.id} className="bg-zinc-900">{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Keys (uma por linha)</label>
                      <textarea value={newKeys} onChange={(e) => setNewKeys(e.target.value)} placeholder={"XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY"} rows={5} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition font-mono text-sm resize-none" />
                    </div>
                    {msg && <p className="text-green-400 text-sm">{msg}</p>}
                    <button onClick={handleAddKeys} disabled={loading || !newKeys.trim()} className="px-8 py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50">
                      {loading ? "Adicionando..." : "Adicionar Keys"}
                    </button>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black mb-4">Todas as Keys</h2>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/10"><th className="text-left px-6 py-4 text-zinc-400 font-medium">Plano</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Key</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Status</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Comprador</th><th className="px-6 py-4" /></tr></thead>
                      <tbody>
                        {keys.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-12 text-zinc-500">Nenhuma key cadastrada ainda.</td></tr>
                        ) : keys.map((key) => (
                          <tr key={key.id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="px-6 py-3 text-zinc-300">{planLabel(key.plan)}</td>
                            <td className="px-6 py-3 font-mono text-white">{key.keyValue}</td>
                            <td className="px-6 py-3">{key.used ? <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Usada</span> : <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">Disponível</span>}</td>
                            <td className="px-6 py-3 text-zinc-400">{key.buyerName ?? "—"}</td>
                            <td className="px-6 py-3 text-right">{!key.used && <button onClick={() => handleDelete(key.id)} className="text-red-400 hover:text-red-300 transition text-xs">Deletar</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === "staff" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black">Contas de Staff</h2>
                  <button onClick={fetchStaff} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Atualizar</button>
                </div>
                {staffLoading ? <p className="text-zinc-400">Carregando...</p> : staffList.length === 0 ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500">
                    Nenhuma solicitação de staff ainda. Contas aparecem aqui após se cadastrarem em <Link to="/staff" className="text-white underline">/staff</Link>.
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/10"><th className="text-left px-6 py-4 text-zinc-400 font-medium">Username</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Email</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Status</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Cadastro</th><th className="px-6 py-4" /></tr></thead>
                      <tbody>
                        {staffList.map((s) => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="px-6 py-4 font-bold">{s.username}</td>
                            <td className="px-6 py-4 text-zinc-400">{s.email}</td>
                            <td className="px-6 py-4">{s.approved ? <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold">Aprovado</span> : <span className="px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-bold">Pendente</span>}</td>
                            <td className="px-6 py-4 text-zinc-500 text-xs">{new Date(s.createdAt).toLocaleDateString("pt-BR")}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!s.approved ? <button onClick={() => handleApproveStaff(s.id, true)} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition text-xs font-bold">Aprovar</button> : <button onClick={() => handleApproveStaff(s.id, false)} className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition text-xs font-bold">Revogar</button>}
                                <button onClick={() => handleDeleteStaff(s.id)} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-xs font-bold">Remover</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "coupons" && (
              <div className="space-y-8">
                <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
                  <h2 className="text-xl font-black mb-6">Criar Cupom</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Código *</label>
                      <input type="text" value={couponForm.code} onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="DESCONTO10" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-white/30 transition font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Tipo de Desconto *</label>
                      <select value={couponForm.discountType} onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none transition">
                        <option value="percent">Percentual (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Valor *</label>
                      <input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))} placeholder={couponForm.discountType === "percent" ? "10" : "5"} className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Limite de usos (0 = ilimitado)</label>
                      <input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm((f) => ({ ...f, maxUses: e.target.value }))} placeholder="0" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none transition" />
                    </div>
                  </div>
                  {couponMsg && <p className={`mt-4 text-sm ${couponMsg.startsWith("Cupom criado") ? "text-green-400" : "text-red-400"}`}>{couponMsg}</p>}
                  <button onClick={handleCreateCoupon} className="mt-4 px-8 py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition">Criar Cupom</button>
                </div>
                {couponsLoading ? <p className="text-zinc-400">Carregando...</p> : coupons.length > 0 && (
                  <div className="rounded-[28px] border border-white/10 bg-white/5 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/10"><th className="text-left px-6 py-4 text-zinc-400 font-medium">Código</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Desconto</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Usos</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Status</th><th className="px-6 py-4" /></tr></thead>
                      <tbody>
                        {coupons.map((c) => (
                          <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="px-6 py-3 font-mono font-bold">{c.code}</td>
                            <td className="px-6 py-3 text-zinc-300">{c.discountType === "percent" ? `${c.discountValue}%` : `R$ ${c.discountValue}`}</td>
                            <td className="px-6 py-3 text-zinc-400">{c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ""}</td>
                            <td className="px-6 py-3">{c.active ? <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">Ativo</span> : <span className="px-2 py-1 rounded-lg bg-zinc-500/20 text-zinc-400 text-xs">Inativo</span>}</td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleToggleCoupon(c.id)} className="px-3 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs transition">{c.active ? "Desativar" : "Ativar"}</button>
                                <button onClick={() => handleDeleteCoupon(c.id)} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs transition">Deletar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "downloads" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black mb-2">Configurar Links de Download</h2>
                  <p className="text-zinc-400 text-sm">Configure os links de download para cada produto. Após a compra, o cliente verá o botão de download.</p>
                </div>
                {dlMsg && <p className={`text-sm ${dlMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{dlMsg}</p>}
                <div className="space-y-4">
                  {DOWNLOAD_PRODUCTS.map((prod) => (
                    <div key={prod.id} className="rounded-[24px] border border-white/10 bg-white/5 p-6">
                      <h3 className="font-black mb-4">{prod.label}</h3>
                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={downloads[prod.id] ?? ""}
                          onChange={(e) => setDownloads((prev) => ({ ...prev, [prod.id]: e.target.value }))}
                          placeholder="https://drive.google.com/... ou outro link"
                          className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition text-sm"
                        />
                        <button onClick={() => saveDownload(prod.id)} className="px-6 py-3 rounded-xl bg-white text-black font-black hover:scale-[1.02] transition shrink-0 text-sm">
                          Salvar
                        </button>
                      </div>
                      {downloads[prod.id] && (
                        <p className="text-zinc-500 text-xs mt-2">Atual: <a href={downloads[prod.id]} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">{downloads[prod.id]}</a></p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "compras" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black mb-2">Registro de Compras</h2>
                  <p className="text-zinc-400 text-sm">Todas as keys utilizadas (compras de RAGE/LITE) e pedidos de cheat custom.</p>
                </div>
                <div>
                  <h3 className="font-black text-lg mb-4">Keys Vendidas <span className="text-zinc-500 font-normal text-sm">({usedKeys.length})</span></h3>
                  {usedKeys.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 text-sm">Nenhuma key vendida ainda.</div>
                  ) : (
                    <div className="rounded-[28px] border border-white/10 bg-white/5 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10"><th className="text-left px-6 py-4 text-zinc-400 font-medium">Data</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Comprador</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Plano</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Preço</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Key</th></tr></thead>
                        <tbody>
                          {usedKeys.map((k) => (
                            <tr key={k.id} className="border-b border-white/5 hover:bg-white/5 transition">
                              <td className="px-6 py-3 text-zinc-500 text-xs">{k.usedAt ? new Date(k.usedAt).toLocaleString("pt-BR") : "—"}</td>
                              <td className="px-6 py-3 font-bold">{k.buyerName ?? "—"}</td>
                              <td className="px-6 py-3 text-zinc-300">{planLabel(k.plan)}</td>
                              <td className="px-6 py-3 text-green-400 font-bold">{PLAN_PRICES[k.plan] ?? "—"}</td>
                              <td className="px-6 py-3 font-mono text-xs text-zinc-400">{k.keyValue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg mb-4">Pedidos Custom <span className="text-zinc-500 font-normal text-sm">({customOrders.length})</span></h3>
                  {customOrders.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 text-sm">Nenhum pedido custom ainda.</div>
                  ) : (
                    <div className="rounded-[28px] border border-white/10 bg-white/5 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10"><th className="text-left px-6 py-4 text-zinc-400 font-medium">Data</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Cliente</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Projeto</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Pacote</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Preço</th><th className="text-left px-6 py-4 text-zinc-400 font-medium">Status</th></tr></thead>
                        <tbody>
                          {customOrders.map((o) => {
                            const st = statusLabel(o.status);
                            return (
                              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="px-6 py-3 text-zinc-500 text-xs">{new Date(o.createdAt).toLocaleString("pt-BR")}</td>
                                <td className="px-6 py-3 font-bold">{o.clientName}</td>
                                <td className="px-6 py-3 text-zinc-300">{o.projectName}</td>
                                <td className="px-6 py-3 text-zinc-400">{o.packageType}</td>
                                <td className="px-6 py-3 text-green-400 font-bold">{o.price}</td>
                                <td className="px-6 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${st.cls}`}>{st.label}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "custom" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">Pedidos Custom</h2>
                  <button onClick={fetchCustomOrders} className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Atualizar</button>
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    {customOrders.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 text-sm">Nenhum pedido custom ainda.</div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                        {customOrders.map((o) => {
                          const st = statusLabel(o.status);
                          return (
                            <button key={o.id} onClick={() => openOrder(o.id)} className={`w-full text-left rounded-2xl border p-4 transition hover:bg-white/10 ${selectedOrder?.id === o.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"}`}>
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
                    {!selectedOrder ? (
                      <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500 text-sm">Selecione um pedido para ver os detalhes.</div>
                    ) : (
                      <div className="rounded-[28px] border border-white/10 bg-white/5 flex flex-col" style={{ height: "600px" }}>
                        <div className="px-5 py-4 border-b border-white/10 shrink-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm">#{selectedOrder.id} — {selectedOrder.projectName}</p>
                              <p className="text-zinc-400 text-xs">{selectedOrder.clientName} · {selectedOrder.clientEmail}</p>
                              <p className="text-zinc-400 text-xs mt-0.5">Pacote: {selectedOrder.packageType} · {selectedOrder.price}</p>
                            </div>
                            <select value={selectedOrder.status} onChange={(e) => changeOrderStatus(selectedOrder.id, e.target.value)} className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none transition">
                              <option value="pending">Pendente</option>
                              <option value="in_progress">Em Andamento</option>
                              <option value="completed">Concluído</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </div>
                          {(selectedOrder.logoBase64 || selectedOrder.referenceBase64) && (
                            <div className="flex gap-3 mt-3">
                              {selectedOrder.logoBase64 && (
                                <div>
                                  <p className="text-xs text-zinc-500 mb-1">Logo:</p>
                                  <img src={selectedOrder.logoBase64} alt="logo" className="h-12 rounded-lg object-contain border border-white/10" />
                                </div>
                              )}
                              {selectedOrder.referenceBase64 && (
                                <div>
                                  <p className="text-xs text-zinc-500 mb-1">Referência:</p>
                                  <img src={selectedOrder.referenceBase64} alt="ref" className="h-12 rounded-lg object-contain border border-white/10" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {selectedOrder.messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2 ${msg.senderType === "staff" ? "flex-row-reverse" : ""}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${msg.senderType === "staff" ? "bg-white text-black" : msg.senderType === "system" ? "bg-zinc-600" : "bg-zinc-700"}`}>
                                {msg.senderType === "staff" ? "A" : msg.senderType === "system" ? "N" : msg.senderName[0]?.toUpperCase()}
                              </div>
                              <div className={`rounded-2xl px-3 py-2 max-w-[78%] text-sm ${msg.senderType === "staff" ? "bg-white text-black rounded-tr-none" : "bg-zinc-900 border border-white/10 rounded-tl-none"}`}>
                                <p className={`text-xs font-bold mb-0.5 ${msg.senderType === "staff" ? "text-black/50" : "text-zinc-500"}`}>{msg.senderType === "staff" ? "Admin" : msg.senderType === "system" ? "Sistema" : msg.senderName}</p>
                                <p>{msg.message}</p>
                              </div>
                            </div>
                          ))}
                          <div ref={chatBottomRef} />
                        </div>
                        <div className="px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
                          <input type="text" value={chatReply} onChange={(e) => setChatReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatReply()} placeholder="Responder ao cliente..." className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none text-sm transition" />
                          <button onClick={sendChatReply} disabled={chatSending || !chatReply.trim()} className="px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition disabled:opacity-50">
                            {chatSending ? "..." : "Enviar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
