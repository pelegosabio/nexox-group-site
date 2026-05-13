import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";

type Purchase = { plan: string; planId: string; price: string; product: string; key: string; buyerName: string; date: string };
type PendingLocal = { id: number; token: string; planName: string; product: string; price: string; date: string };
type PendingStatus = { id: number; status: string; planName: string; product: string; price: string; buyerName: string; createdAt: string; keyValue: string | null; downloadUrl: string | null };
type CustomOrder = { id: number; clientName: string; projectName: string; packageType: string; price: string; status: string; createdAt: string; clientToken?: string };
type ChatMsg = { id: number; senderType: string; senderName: string; message: string; createdAt: string };

type Tab = "confirmed" | "pending" | "custom";

export default function MinhasCompras() {
  const [tab, setTab] = useState<Tab>("confirmed");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pendingLocals, setPendingLocals] = useState<PendingLocal[]>([]);
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, PendingStatus>>({});
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<(CustomOrder & { messages: ChatMsg[] }) | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loggedUser, setLoggedUser] = useState<{ username: string } | null>(null);
  const [, navigate] = useLocation();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };

  const statusInfo = (s: string) => {
    if (s === "confirmed") return { label: "Confirmado", cls: "bg-green-500/20 text-green-400" };
    if (s === "cancelled") return { label: "Cancelado", cls: "bg-red-500/20 text-red-400" };
    if (s === "in_progress") return { label: "Em Andamento", cls: "bg-blue-500/20 text-blue-400" };
    if (s === "completed") return { label: "Concluído", cls: "bg-green-500/20 text-green-400" };
    return { label: "Aguardando", cls: "bg-yellow-500/20 text-yellow-400" };
  };

  useEffect(() => {
    const user = localStorage.getItem("nexox_logged_user");
    if (!user) { navigate("/login"); return; }
    try { setLoggedUser(JSON.parse(user)); } catch {}
    const saved = localStorage.getItem("nexox_purchases");
    if (saved) { try { setPurchases(JSON.parse(saved)); } catch {} }
    const pending = localStorage.getItem("nexox_pending_purchases");
    if (pending) { try { setPendingLocals(JSON.parse(pending)); } catch {} }
    const customRaw = localStorage.getItem("nexox_custom_orders");
    if (customRaw) { try { setCustomOrders(JSON.parse(customRaw)); } catch {} }
  }, [navigate]);

  useEffect(() => {
    if (!pendingLocals.length) return;
    const fetchAll = async () => {
      const results: Record<string, PendingStatus> = {};
      await Promise.all(pendingLocals.map(async (p) => {
        try {
          const res = await fetch(`${BASE}/api/purchases/status?token=${p.token}`);
          if (res.ok) { const data = await res.json(); results[p.token] = data; }
        } catch {}
      }));
      setPendingStatuses(results);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [pendingLocals, BASE]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedOrder?.messages]);

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const openCustomOrder = async (order: CustomOrder) => {
    if (!order.clientToken) { setSelectedOrder({ ...order, messages: [] }); return; }
    try {
      const res = await fetch(`${BASE}/api/custom-orders/me?token=${order.clientToken}`);
      if (res.ok) { const data = await res.json(); setSelectedOrder({ ...order, messages: data.messages ?? [] }); }
      else setSelectedOrder({ ...order, messages: [] });
    } catch { setSelectedOrder({ ...order, messages: [] }); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedOrder?.clientToken) return;
    setChatSending(true);
    try {
      const res = await fetch(`${BASE}/api/custom-orders/me/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: selectedOrder.clientToken, message: chatInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder((prev) => prev ? { ...prev, messages: [...prev.messages, data] } : prev);
        setChatInput("");
      }
    } finally { setChatSending(false); }
  };

  const pendingCount = pendingLocals.filter((p) => (pendingStatuses[p.token]?.status ?? "pending") === "pending").length;

  const HEADER_BASE = "sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-zinc-950/95";
  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "confirmed", label: "Keys Ativas", count: purchases.length },
    { key: "pending", label: "Aguardando", count: pendingCount || undefined },
    { key: "custom", label: "Pedidos Custom", count: customOrders.length || undefined },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700" />
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <header className={HEADER_BASE}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">NEXOX GROUP</span>
          </Link>
          <div className="flex items-center gap-3">
            {loggedUser && <span className="hidden sm:block px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm">{loggedUser.username}</span>}
            <Link to="/produtos" className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition text-sm">← Loja</Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-black mb-2">Minhas Compras</h2>
          <p className="text-zinc-400">Acompanhe suas compras, keys e pedidos personalizados.</p>
        </div>

        <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 w-fit mb-8 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${tab === t.key ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === t.key ? "bg-black/10" : "bg-white/10"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "confirmed" && (
          purchases.length === 0 ? (
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              </div>
              <p className="text-xl font-black mb-2">Nenhuma key ativa</p>
              <p className="text-zinc-500 mb-8 text-sm">Suas keys aparecem aqui após o admin confirmar o pagamento.</p>
              <Link to="/produtos" className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition inline-block">Ver Produtos</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((p, idx) => (
                <div key={idx} className="rounded-[24px] border border-white/10 bg-white/5 p-6 hover:bg-white/[0.07] transition">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-xl shrink-0">
                        <img src={`${BASE}/logo.png`} alt="logo" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black">{p.product}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-white/10 text-xs text-zinc-300">{p.plan}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold">Ativa</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span>{p.price}</span><span>·</span><span>{fmt(p.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:max-w-xs w-full">
                      <div className="flex-1 px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-sm text-green-400 truncate tracking-wider">{p.key}</div>
                      <button onClick={() => copyKey(p.key, `c${idx}`)} className={`px-3 py-2.5 rounded-xl font-bold text-xs transition shrink-0 ${copiedId === `c${idx}` ? "bg-green-500 text-white" : "bg-white text-black hover:scale-105"}`}>
                        {copiedId === `c${idx}` ? "✓" : "Copiar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 text-center">
                <Link to="/produtos" className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition inline-block">Comprar mais</Link>
              </div>
            </div>
          )
        )}

        {tab === "pending" && (
          pendingLocals.length === 0 ? (
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xl font-black mb-2">Nenhuma compra pendente</p>
              <p className="text-zinc-500 text-sm">Compras aguardando confirmação do admin aparecem aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 px-5 py-3 flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <p className="text-yellow-300 text-sm"><strong>Como funciona:</strong> Após enviar o PIX, o admin confirma o pagamento manualmente e libera sua key. Atualizamos automaticamente a cada 15 segundos.</p>
              </div>
              {pendingLocals.map((p) => {
                const status = pendingStatuses[p.token];
                const st = statusInfo(status?.status ?? "pending");
                const isConfirmed = status?.status === "confirmed";
                const isCancelled = status?.status === "cancelled";
                return (
                  <div key={p.token} className={`rounded-[24px] border p-6 transition ${isConfirmed ? "border-green-500/30 bg-green-500/5" : isCancelled ? "border-red-500/20 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black">{p.product === "rage" ? "RAGE PANEL" : "LITE PANEL"}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-white/10 text-xs text-zinc-300">{p.planName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span>{p.price}</span><span>·</span><span>{fmt(p.date)}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black ${st.cls}`}>{st.label}</span>
                    </div>
                    {isConfirmed && status?.keyValue && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
                          <p className="text-green-400 font-black text-sm mb-2">✓ Pagamento confirmado! Sua key:</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-green-500/30 font-mono text-green-400 text-sm tracking-wider truncate">{status.keyValue}</div>
                            <button onClick={() => copyKey(status.keyValue!, `p${p.token}`)} className={`px-3 py-2 rounded-xl font-bold text-xs transition shrink-0 ${copiedId === `p${p.token}` ? "bg-green-500 text-white" : "bg-white text-black hover:scale-105"}`}>
                              {copiedId === `p${p.token}` ? "✓" : "Copiar"}
                            </button>
                          </div>
                        </div>
                        {status.downloadUrl && (
                          <a href={status.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-800 border border-white/10 font-bold text-sm hover:bg-zinc-700 transition">
                            ⬇️ Baixar {p.product === "rage" ? "RAGE PANEL" : "LITE PANEL"}
                          </a>
                        )}
                      </div>
                    )}
                    {isCancelled && (
                      <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                        <p className="text-red-400 text-sm">Esta compra foi cancelada. Entre em <Link to="/tickets" className="underline">contato com o suporte</Link> se precisar de ajuda.</p>
                      </div>
                    )}
                    {!isConfirmed && !isCancelled && (
                      <p className="text-zinc-500 text-xs mt-3">O admin verificará o PIX e liberará sua key em breve. Guarde esta página.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === "custom" && (
          customOrders.length === 0 ? (
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-xl font-black mb-2">Nenhum pedido custom</p>
              <p className="text-zinc-500 mb-8 text-sm">Seus pedidos de cheat personalizado aparecem aqui.</p>
              <Link to="/produtos" className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition inline-block">Fazer um Pedido</Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {customOrders.map((o) => {
                  const st = statusInfo(o.status);
                  return (
                    <button key={o.id} onClick={() => openCustomOrder(o)} className={`w-full text-left rounded-2xl border p-4 transition hover:bg-white/10 ${selectedOrder?.id === o.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">#{o.id} — {o.projectName}</p>
                          <p className="text-zinc-400 text-xs">{o.packageType} · {o.price}</p>
                          <p className="text-zinc-500 text-xs">{fmt(o.createdAt)}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ${st.cls}`}>{st.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                {!selectedOrder ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-12 text-center text-zinc-500 text-sm">Clique em um pedido para ver o chat com o admin.</div>
                ) : (
                  <div className="rounded-[28px] border border-white/10 bg-white/5 flex flex-col" style={{ height: "500px" }}>
                    <div className="px-5 py-4 border-b border-white/10 shrink-0">
                      <p className="font-bold text-sm">#{selectedOrder.id} — {selectedOrder.projectName}</p>
                      <p className="text-zinc-400 text-xs">{selectedOrder.packageType} · {selectedOrder.price}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-xs font-bold ${statusInfo(selectedOrder.status).cls}`}>{statusInfo(selectedOrder.status).label}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedOrder.messages.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center pt-8">Nenhuma mensagem ainda. O admin responderá em breve.</p>
                      ) : selectedOrder.messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-2 ${msg.senderType === "staff" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${msg.senderType === "staff" ? "bg-white text-black" : msg.senderType === "system" ? "bg-zinc-600" : "bg-zinc-700"}`}>
                            {msg.senderType === "staff" ? "A" : msg.senderType === "system" ? "N" : msg.senderName[0]?.toUpperCase()}
                          </div>
                          <div className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${msg.senderType === "staff" ? "bg-white text-black rounded-tr-none" : "bg-zinc-900 border border-white/10 rounded-tl-none"}`}>
                            <p className={`text-xs font-bold mb-0.5 ${msg.senderType === "staff" ? "text-black/50" : "text-zinc-500"}`}>{msg.senderType === "staff" ? "Admin" : msg.senderType === "system" ? "Sistema" : msg.senderName}</p>
                            <p>{msg.message}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>
                    {selectedOrder.clientToken && (
                      <div className="px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Enviar mensagem ao admin..." className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none text-sm" />
                        <button onClick={sendChat} disabled={chatSending || !chatInput.trim()} className="px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition disabled:opacity-50">
                          {chatSending ? "..." : "Enviar"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
