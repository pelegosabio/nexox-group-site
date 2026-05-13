import { useState, useEffect } from "react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { generatePixPayload } from "@/lib/pix";

const PIX_KEY = "9773c174-4a12-4099-9232-2ee3b79add8f";
const MERCHANT_NAME = "NEXOX GROUP";
const MERCHANT_CITY = "SAO PAULO";

function priceToNumber(price: string): number {
  return parseFloat(price.replace("R$ ", "").replace(",", "."));
}

type Plan = { name: string; price: string; planId: string };
type ModalState =
  | { step: "plans"; product: "rage" | "lite" }
  | { step: "pix"; product: "rage" | "lite"; plan: Plan }
  | { step: "key"; key: string; plan: Plan }
  | null;

const ragePlans: Plan[] = [
  { name: "Diário",      price: "R$ 5,00",  planId: "rage-diario" },
  { name: "Semanal",     price: "R$ 15,00", planId: "rage-semanal" },
  { name: "15 Dias",     price: "R$ 20,00", planId: "rage-15dias" },
  { name: "Mensal",      price: "R$ 30,00", planId: "rage-mensal" },
  { name: "Trimensal",   price: "R$ 43,99", planId: "rage-trimensal" },
  { name: "Permanente",  price: "R$ 50,00", planId: "rage-permanente" },
];

const litePlans: Plan[] = [
  { name: "Diário",     price: "R$ 4,00",  planId: "lite-diario" },
  { name: "Semanal",    price: "R$ 13,00", planId: "lite-semanal" },
  { name: "Mensal",     price: "R$ 27,00", planId: "lite-mensal" },
  { name: "Permanente", price: "R$ 45,90", planId: "lite-permanente" },
];

export default function Home() {
  const [loggedUser, setLoggedUser] = useState<{
    username: string;
    email: string;
    password: string;
  } | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [buyerName, setBuyerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const user = localStorage.getItem("nexox_logged_user");
    if (user) {
      try { setLoggedUser(JSON.parse(user)); } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nexox_logged_user");
    setLoggedUser(null);
  };

  const closeModal = () => {
    setModal(null);
    setBuyerName("");
    setError("");
    setCopied(false);
  };

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    if (modal?.step !== "pix") return;
    if (!buyerName.trim()) {
      setError("Informe seu nome para receber a key.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/keys/take`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: modal.plan.planId, buyerName: buyerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao buscar sua key. Contate o suporte.");
        setLoading(false);
        return;
      }
      // Salvar compra no localStorage
      const purchase = {
        plan: modal.plan.name,
        planId: modal.plan.planId,
        price: modal.plan.price,
        product: modal.product === "rage" ? "RAGE PANEL" : "LITE PANEL",
        key: data.key,
        buyerName: buyerName.trim(),
        date: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("nexox_purchases") ?? "[]");
      localStorage.setItem("nexox_purchases", JSON.stringify([purchase, ...existing]));

      setModal({ step: "key", key: data.key, plan: modal.plan });
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const products = [
    { id: "rage", title: "RAGE PANEL", desc: "Melhor performance e funções premium." },
    { id: "lite", title: "LITE PANEL", desc: "Mais leve e otimizado para qualquer PC." },
    { id: "free", title: "CHEAT FREE", desc: "Versão gratuita para testar o sistema." },
  ];

  const plans = modal?.step === "plans" || modal?.step === "pix"
    ? (modal.product === "rage" ? ragePlans : litePlans)
    : [];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
              <img src={`${BASE}/logo.png`} alt="logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide">NEXOX GROUP</h1>
              <p className="text-zinc-400 text-sm">Premium PC Store</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loggedUser ? (
              <>
                <Link to="/minhas-compras" className="px-5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                  {loggedUser.username}
                </Link>
                <Link to="/minhas-compras" className="px-5 py-2 rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all text-sm">
                  Minhas Compras
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 rounded-xl bg-white text-black font-bold hover:scale-105 transition-all"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-5 py-2 rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all">
                  Entrar
                </Link>
                <Link to="/login" className="px-5 py-2 rounded-xl bg-white text-black font-bold hover:scale-105 transition-all">
                  Cadastro
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 backdrop-blur-xl">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm text-zinc-300">Entrega automática via PIX</span>
          </div>
          <h2 className="text-6xl leading-tight font-black mb-6">
            NEXOX<br />
            <span className="text-zinc-400">GROUP STORE</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-xl mb-10">
            Loja premium focada em performance, visual moderno e sistema
            automatizado. Compre, pague no PIX e receba instantaneamente.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all duration-300 shadow-2xl"
            >
              Comprar Agora
            </button>
            <button
              onClick={() => document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 rounded-2xl border border-white/20 backdrop-blur-xl hover:bg-white/10 transition-all duration-300"
            >
              Ver Catálogo
            </button>
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute w-96 h-96 bg-white/20 blur-[120px] rounded-full" />
          <div className="relative w-full max-w-md rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-[0_0_80px_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-2xl">PAINEL PREMIUM</h3>
                <p className="text-zinc-400 text-sm">Atualização diária</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white text-black font-black text-sm">ONLINE</div>
            </div>
            <div className="space-y-4">
              {["Aim Assist", "Visual Premium", "Performance Mode", "Menu Clean", "Suporte 24h"].map((item) => (
                <div key={item} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/10">
                  <span>{item}</span>
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-4xl font-black mb-2">Produtos</h3>
            <p className="text-zinc-400">Escolha seu plano ideal</p>
          </div>
          <div className="px-5 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            PIX AUTOMÁTICO
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {products.map((product) => (
            <div
              key={product.title}
              className="group relative rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-8 shadow-2xl">
                  <img src={`${BASE}/logo.png`} alt="logo" className="w-12 h-12 object-contain" />
                </div>
                <h4 className="text-3xl font-black mb-3">{product.title}</h4>
                <p className="text-zinc-400 mb-8 leading-relaxed">{product.desc}</p>

                {product.id === "free" ? (
                  <Link
                    to="/cheat-free"
                    className="w-full px-6 py-3 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 hover:scale-105 transition-all duration-300 block text-center"
                  >
                    Baixar Grátis
                  </Link>
                ) : (
                  <button
                    onClick={() => setModal({ step: "plans", product: product.id as "rage" | "lite" })}
                    className="w-full px-6 py-3 rounded-2xl bg-white text-black font-bold hover:scale-105 transition-all duration-300"
                  >
                    Comprar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUPORTE */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <div className="rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-2xl p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-4xl font-black mb-4">Sistema de Tickets</h3>
            <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
              Suporte integrado com tickets, Discord webhook, notificações e atendimento rápido.
            </p>
          </div>
          <button className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all duration-300 whitespace-nowrap">
            Abrir Ticket
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-8 text-center text-zinc-500">
        © 2026 NEXOX GROUP — Todos os direitos reservados.
      </footer>

      {/* ─── MODAL ────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">

            {/* Header do modal */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                {modal.step === "plans" && (
                  <h2 className="text-2xl font-black">
                    Comprar {modal.product === "rage" ? "RAGE" : "LITE"} PANEL
                  </h2>
                )}
                {modal.step === "pix" && (
                  <>
                    <p className="text-xs text-zinc-500 mb-1">
                      {modal.product === "rage" ? "RAGE" : "LITE"} — {modal.plan.name}
                    </p>
                    <h2 className="text-2xl font-black">Pagar via PIX</h2>
                  </>
                )}
                {modal.step === "key" && (
                  <h2 className="text-2xl font-black text-green-400">Compra Confirmada!</h2>
                )}
              </div>
              <button
                onClick={closeModal}
                className="rounded-xl bg-zinc-800 hover:bg-red-500 px-3 py-2 text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="px-8 pb-8">

              {/* ── STEP 1: Selecionar plano ── */}
              {modal.step === "plans" && (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-sm mb-4">Escolha a duração do plano:</p>
                  {plans.map((plan) => (
                    <button
                      key={plan.planId}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:bg-white/10 hover:border-white/20"
                      onClick={() => {
                        setBuyerName("");
                        setError("");
                        setModal({ step: "pix", product: modal.product, plan });
                      }}
                    >
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="text-sm text-zinc-400">Key de acesso premium</p>
                      </div>
                      <span className="text-lg font-black">{plan.price}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── STEP 2: QR Code PIX ── */}
              {modal.step === "pix" && (() => {
                const amount = priceToNumber(modal.plan.price);
                const txId = `NEXOX${modal.plan.planId.toUpperCase().replace(/-/g, "")}`;
                const pixPayload = generatePixPayload({
                  pixKey: PIX_KEY,
                  amount,
                  merchantName: MERCHANT_NAME,
                  merchantCity: MERCHANT_CITY,
                  txId,
                });
                return (
                  <div className="space-y-5">
                    {/* Valor */}
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-zinc-400 text-xs mb-0.5">Plano selecionado</p>
                        <p className="font-black text-lg">{modal.plan.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-400 text-xs mb-0.5">Valor</p>
                        <p className="text-3xl font-black">{modal.plan.price}</p>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-zinc-400 text-sm">Escaneie o QR Code com o app do seu banco:</p>
                      <div className="p-4 rounded-2xl bg-white shadow-2xl">
                        <QRCodeSVG
                          value={pixPayload}
                          size={200}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                        />
                      </div>
                      <p className="text-zinc-500 text-xs">O valor já está preenchido automaticamente</p>
                    </div>

                    {/* Chave PIX para copiar */}
                    <div>
                      <p className="text-zinc-400 text-xs mb-2">Ou copie a chave PIX manualmente:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-white truncate">
                          {PIX_KEY}
                        </div>
                        <button
                          onClick={copyPix}
                          className={`px-3 py-2 rounded-xl font-bold text-xs transition shrink-0 ${copied ? "bg-green-500 text-white" : "bg-zinc-700 text-white hover:bg-zinc-600"}`}
                        >
                          {copied ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>

                    {/* Nome do comprador */}
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Seu nome (para registrar a compra):</label>
                      <input
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                      />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                      onClick={handleConfirmPayment}
                      disabled={loading}
                      className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Verificando..." : "Já paguei — Receber minha key"}
                    </button>

                    <button
                      onClick={() => setModal({ step: "plans", product: modal.product })}
                      className="w-full text-center text-zinc-500 text-sm hover:text-white transition"
                    >
                      ← Voltar aos planos
                    </button>
                  </div>
                );
              })()}

              {/* ── STEP 3: Key entregue ── */}
              {modal.step === "key" && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Plano <strong className="text-white">{modal.plan.name}</strong> ativado com sucesso!
                    </p>
                  </div>

                  <div>
                    <p className="text-zinc-400 text-sm mb-2">Sua key de acesso:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-4 rounded-xl bg-black/60 border border-green-500/30 font-mono text-green-400 text-center text-lg font-black tracking-widest">
                        {modal.key}
                      </div>
                    </div>
                    <button
                      onClick={() => copyKey(modal.key)}
                      className={`mt-3 w-full py-3 rounded-2xl font-bold transition ${copied ? "bg-green-500 text-white" : "bg-white text-black hover:scale-[1.02]"}`}
                    >
                      {copied ? "Copiado!" : "Copiar Key"}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-zinc-900 border border-white/5 p-4 text-sm text-zinc-400">
                    <strong className="text-white">Guarde sua key!</strong> Ela é única e não pode ser recuperada depois. Use no launcher do NEXOX GROUP.
                  </div>

                  <button
                    onClick={closeModal}
                    className="w-full text-center text-zinc-500 text-sm hover:text-white transition"
                  >
                    Fechar
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
