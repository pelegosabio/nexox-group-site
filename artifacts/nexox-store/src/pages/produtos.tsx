import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { generatePixPayload } from "@/lib/pix";
import { useCart } from "@/contexts/CartContext";
import { CartButton } from "@/components/CartSidebar";

const PIX_KEY = "9773c174-4a12-4099-9232-2ee3b79add8f";
const MERCHANT_NAME = "NEXOX GROUP";
const MERCHANT_CITY = "SAO PAULO";
const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

function priceToNumber(price: string): number {
  return parseFloat(price.replace("R$ ", "").replace(",", "."));
}

type Plan = { name: string; price: string; planId: string; popular?: boolean };
type CouponData = { id: number; code: string; discountType: string; discountValue: number };
type ChatMsg = { id: number; senderType: string; senderName: string; message: string; createdAt: string };

type BuyModal =
  | { step: "terms"; product: "rage" | "lite"; plan: Plan }
  | { step: "pix"; product: "rage" | "lite"; plan: Plan }
  | { step: "pending"; token: string; plan: Plan; product: "rage" | "lite" }
  | { step: "key"; key: string; plan: Plan; product: "rage" | "lite"; downloadUrl?: string }
  | null;

type CustomPkg = { id: string; name: string; price: string; amount: number; desc: string };
const customPlans: CustomPkg[] = [
  { id: "external-basic", name: "External Basic", price: "R$ 50,00", amount: 50, desc: "Cheat externo básico com recursos essenciais e baixa detecção." },
  { id: "external-premium", name: "External Premium", price: "R$ 80,00", amount: 80, desc: "Cheat externo premium com recursos avançados e design personalizado." },
  { id: "internal-basic", name: "Internal Basic", price: "R$ 90,00", amount: 90, desc: "Cheat interno básico com maior performance e recursos avançados." },
  { id: "internal-premium", name: "Internal Premium", price: "R$ 160,00", amount: 160, desc: "Cheat interno premium completo — máxima performance e personalização total." },
];

type WizardStep = "info" | "project" | "logo" | "reference" | "pix" | "chat";
type CustomModal = {
  pkg: CustomPkg;
  step: WizardStep;
  clientName: string;
  clientEmail: string;
  projectName: string;
  logoBase64: string | null;
  referenceBase64: string | null;
  orderId: number | null;
  clientToken: string | null;
  chatMessages: ChatMsg[];
  chatInput: string;
  sending: boolean;
  loading: boolean;
  error: string;
} | null;

const ragePlans: Plan[] = [
  { name: "Diário", price: "R$ 5,00", planId: "rage-diario" },
  { name: "Semanal", price: "R$ 15,00", planId: "rage-semanal" },
  { name: "15 Dias", price: "R$ 20,00", planId: "rage-15dias" },
  { name: "Mensal", price: "R$ 30,00", planId: "rage-mensal", popular: true },
  { name: "Trimensal", price: "R$ 43,99", planId: "rage-trimensal" },
  { name: "Permanente", price: "R$ 50,00", planId: "rage-permanente" },
];
const litePlans: Plan[] = [
  { name: "Diário", price: "R$ 4,00", planId: "lite-diario" },
  { name: "Semanal", price: "R$ 13,00", planId: "lite-semanal" },
  { name: "Mensal", price: "R$ 27,00", planId: "lite-mensal", popular: true },
  { name: "Permanente", price: "R$ 45,90", planId: "lite-permanente" },
];
const rageFeatures = ["Aim Assist Avançado","ESP / Wallhack Visual","No Recoil Premium","Radar Hack","Speed Hack","Bhop Integrado","Menu Ultra Clean","Atualização Diária","Anti-Ban Avançado","Suporte Prioritário 24h"];
const liteFeatures = ["Aim Assist Suave","ESP Básico","No Recoil","Menu Clean","Atualização Semanal","Anti-Ban Básico","Suporte 24h"];
const freeFeatures = ["Aim Assist Básico","No Recoil Simples","Menu Limitado","Atualização Mensal","Suporte por Ticket"];

export default function ProdutosPage() {
  const [tab, setTab] = useState<"rage" | "lite" | "free" | "custom">("rage");
  const [buyModal, setBuyModal] = useState<BuyModal>(null);
  const [customModal, setCustomModal] = useState<CustomModal>(null);
  const [buyerName, setBuyerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [termsChecked, setTermsChecked] = useState({ noRefund: false, riskAccepted: false });
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const { addItem, removeItem } = useCart();

  useEffect(() => {
    const saved = localStorage.getItem("nexox_checkout_plan");
    if (saved) {
      try {
        const { product, planId, planName, price, cartItemId } = JSON.parse(saved);
        localStorage.removeItem("nexox_checkout_plan");
        const plan = { name: planName, price, planId };
        setBuyModal({ step: "pix", product, plan });
        if (cartItemId) removeItem(cartItemId);
      } catch {}
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [customModal?.chatMessages]);

  const closeBuyModal = () => {
    setBuyModal(null); setBuyerName(""); setError(""); setCopied(false);
    setCouponCode(""); setCouponData(null); setCouponError("");
    setTermsChecked({ noRefund: false, riskAccepted: false });
  };

  const applyDiscount = (amount: number): number => {
    if (!couponData) return amount;
    if (couponData.discountType === "percent") return Math.max(0.01, amount * (1 - couponData.discountValue / 100));
    return Math.max(0.01, amount - couponData.discountValue);
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError(""); setCouponData(null);
    try {
      const res = await fetch(`${BASE()}/api/coupons/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponCode }) });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error); setCouponLoading(false); return; }
      setCouponData(data);
    } catch { setCouponError("Erro ao validar cupom."); } finally { setCouponLoading(false); }
  };

  const handleConfirmPayment = async () => {
    if (buyModal?.step !== "pix") return;
    if (!buyerName.trim()) { setError("Informe seu nome para registrar o pagamento."); return; }
    setError(""); setLoading(true);
    try {
      const orig = priceToNumber(buyModal.plan.price);
      const final = applyDiscount(orig);
      const res = await fetch(`${BASE()}/api/purchases/pending`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: buyerName.trim(), product: buyModal.product,
          planId: buyModal.plan.planId, planName: buyModal.plan.name,
          price: buyModal.plan.price, pixAmount: final.toFixed(2),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao registrar compra. Contate o suporte."); setLoading(false); return; }
      if (couponData) {
        await fetch(`${BASE()}/api/coupons/use`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponData.code }) }).catch(() => {});
      }
      const pending = JSON.parse(localStorage.getItem("nexox_pending_purchases") ?? "[]");
      localStorage.setItem("nexox_pending_purchases", JSON.stringify([
        { id: data.id, token: data.token, planName: buyModal.plan.name, product: buyModal.product, price: buyModal.plan.price, date: new Date().toISOString() },
        ...pending,
      ]));
      setBuyModal({ step: "pending", token: data.token, plan: buyModal.plan, product: buyModal.product });
    } catch { setError("Erro de conexão. Tente novamente."); } finally { setLoading(false); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const copyPix = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const openCustomWizard = (pkg: CustomPkg) => {
    const user = (() => { try { return JSON.parse(localStorage.getItem("nexox_logged_user") ?? "null"); } catch { return null; } })();
    setCustomModal({ pkg, step: "info", clientName: user?.username ?? "", clientEmail: user?.email ?? "", projectName: "", logoBase64: null, referenceBase64: null, orderId: null, clientToken: null, chatMessages: [], chatInput: "", sending: false, loading: false, error: "" });
  };

  const updateCustomModal = (patch: Partial<NonNullable<CustomModal>>) => {
    setCustomModal((prev) => prev ? { ...prev, ...patch } : prev);
  };

  const handleImageFile = (file: File, field: "logoBase64" | "referenceBase64") => {
    const reader = new FileReader();
    reader.onloadend = () => updateCustomModal({ [field]: reader.result as string });
    reader.readAsDataURL(file);
  };

  const submitCustomOrder = async () => {
    if (!customModal) return;
    updateCustomModal({ loading: true, error: "" });
    try {
      const res = await fetch(`${BASE()}/api/custom-orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: customModal.clientName, clientEmail: customModal.clientEmail,
          packageType: customModal.pkg.id, projectName: customModal.projectName,
          logoBase64: customModal.logoBase64, referenceBase64: customModal.referenceBase64,
          price: customModal.pkg.price,
        }),
      });
      const data = await res.json();
      if (!res.ok) { updateCustomModal({ error: data.error ?? "Erro ao criar pedido.", loading: false }); return; }
      const savedOrders = JSON.parse(localStorage.getItem("nexox_custom_orders") ?? "[]");
      localStorage.setItem("nexox_custom_orders", JSON.stringify([{ id: data.id, clientToken: data.clientToken, projectName: customModal.projectName, pkg: customModal.pkg.name, date: new Date().toISOString() }, ...savedOrders]));
      const chatRes = await fetch(`${BASE()}/api/custom-orders/me?token=${data.clientToken}`);
      const chatData = await chatRes.json();
      updateCustomModal({ step: "chat", orderId: data.id, clientToken: data.clientToken, chatMessages: chatData.messages ?? [], loading: false });
    } catch { updateCustomModal({ error: "Erro de conexão.", loading: false }); }
  };

  const sendCustomChat = async () => {
    if (!customModal?.clientToken || !customModal.chatInput.trim()) return;
    updateCustomModal({ sending: true });
    try {
      const res = await fetch(`${BASE()}/api/custom-orders/me/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customModal.clientToken, message: customModal.chatInput }),
      });
      const data = await res.json();
      if (res.ok) updateCustomModal({ chatMessages: [...customModal.chatMessages, data], chatInput: "", sending: false });
      else updateCustomModal({ sending: false });
    } catch { updateCustomModal({ sending: false }); }
  };

  const plans = tab === "rage" ? ragePlans : litePlans;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700" />
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-zinc-950/95">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">NEXOX GROUP</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link to="/" className="hover:text-white transition">Início</Link>
            <Link to="/produtos" className="text-white font-bold">Produtos</Link>
            <Link to="/tickets" className="hover:text-white transition">Suporte</Link>
          </nav>
          <div className="flex items-center gap-3">
            <CartButton />
            <Link to="/minhas-compras" className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">Compras</Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-5 text-sm text-zinc-300">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Entrega automática via PIX • Online agora
          </div>
          <h1 className="text-5xl font-black mb-4">Escolha seu Produto</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">Produtos premium com entrega instantânea. PIX confirmado, key na hora.</p>
        </div>

        <div className="flex justify-center mb-12 overflow-x-auto pb-2">
          <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1.5 gap-1 shrink-0">
            {(["rage", "lite", "free", "custom"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${tab === t ? "bg-white text-black shadow-lg scale-[1.02]" : "text-zinc-400 hover:text-white"}`}>
                {t === "rage" ? "RAGE PANEL" : t === "lite" ? "LITE PANEL" : t === "free" ? "CHEAT FREE" : "✨ FAÇA SEU CHEAT"}
              </button>
            ))}
          </div>
        </div>

        {(tab === "rage" || tab === "lite") && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-8">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-xl">
                <img src={`${BASE()}/logo.png`} alt="logo" className="w-10 h-10 object-contain" />
              </div>
              <h2 className="text-2xl font-black mb-2">{tab === "rage" ? "RAGE PANEL" : "LITE PANEL"}</h2>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{tab === "rage" ? "Versão completa com todos os recursos premium." : "Versão otimizada, mais leve para qualquer PC."}</p>
              <div className="space-y-2">
                {(tab === "rage" ? rageFeatures : liteFeatures).map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <span className="text-zinc-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div key={plan.planId} className={`relative rounded-[24px] border p-6 flex flex-col justify-between transition-all hover:scale-[1.01] group ${plan.popular ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-black text-xs font-black">MAIS POPULAR</div>
                  )}
                  <div>
                    <h3 className="text-xl font-black mb-1">{plan.name}</h3>
                    <p className="text-zinc-400 text-xs">Key de acesso {tab === "rage" ? "RAGE" : "LITE"}</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-black block mb-4">{plan.price}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBuyModal({ step: "terms", product: tab as "rage" | "lite", plan })}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition"
                      >
                        Comprar
                      </button>
                      <button
                        onClick={() => addItem({ product: tab as "rage" | "lite", planId: plan.planId, planName: plan.name, price: plan.price })}
                        className="px-3 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 transition text-sm"
                        title="Adicionar ao carrinho"
                      >
                        🛒
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "free" && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-10 text-center">
              <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <img src={`${BASE()}/logo.png`} alt="logo" className="w-12 h-12 object-contain" />
              </div>
              <h2 className="text-3xl font-black mb-3">CHEAT FREE</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed max-w-sm mx-auto">Versão gratuita para testar o sistema NEXOX. Sem custo.</p>
              <div className="grid grid-cols-2 gap-3 mb-8 text-left max-w-sm mx-auto">
                {freeFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-zinc-400" /></div>
                    <span className="text-zinc-300">{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/cheat-free" className="inline-block px-10 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition text-lg">Baixar Grátis</Link>
              <p className="text-zinc-500 text-xs mt-4">Sem cadastro • Sem pagamento • Imediato</p>
            </div>
          </div>
        )}

        {tab === "custom" && (
          <div>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-4 text-sm text-zinc-300">
                <span>✨</span> Crie o seu cheat do zero
              </div>
              <h2 className="text-4xl font-black mb-3">Faça seu Próprio Cheat</h2>
              <p className="text-zinc-400 max-w-lg mx-auto">Nossa equipe cria um cheat personalizado com seu nome, logo e design. Selecione o pacote ideal:</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {customPlans.map((pkg, i) => (
                <div key={pkg.id} className={`relative rounded-[28px] border p-7 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 group ${i === 3 ? "border-white/40 bg-white/10 shadow-[0_0_40px_rgba(255,255,255,0.06)]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  {i === 3 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-black text-xs font-black">MELHOR OPÇÃO</div>}
                  <div>
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/10 text-zinc-300 text-xs font-black mb-4 tracking-widest">{pkg.id.includes("external") ? "EXTERNO" : "INTERNO"}</span>
                    <h3 className="text-xl font-black mb-2">{pkg.name}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">{pkg.desc}</p>
                    <div className="space-y-1.5 mb-5">
                      {["Nome personalizado", "Logo própria", "Design exclusivo", pkg.id.includes("premium") ? "Suporte prioritário" : "Suporte padrão"].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-black mb-4">{pkg.price}</p>
                    <button onClick={() => openCustomWizard(pkg)} className={`w-full py-3.5 rounded-2xl font-black text-sm transition hover:scale-[1.02] ${i === 3 ? "bg-white text-black" : "bg-white/10 border border-white/20 hover:bg-white hover:text-black"}`}>
                      Começar Pedido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            { icon: "⚡", title: "Entrega Instantânea", desc: "Receba sua key logo após confirmar o PIX." },
            { icon: "🛡️", title: "Anti-Ban Integrado", desc: "Sistema de proteção avançado para manter sua conta segura." },
            { icon: "🎧", title: "Suporte 24h", desc: "Nossa equipe de staff sempre disponível." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-black mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {buyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={(e) => e.target === e.currentTarget && closeBuyModal()}>
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                {buyModal.step === "terms" && (
                  <>
                    <p className="text-xs text-zinc-500 mb-1">{buyModal.product.toUpperCase()} — {buyModal.plan.name}</p>
                    <h2 className="text-2xl font-black">Termos de Uso</h2>
                  </>
                )}
                {buyModal.step === "pix" && (
                  <>
                    <p className="text-xs text-zinc-500 mb-1">{buyModal.product.toUpperCase()} — {buyModal.plan.name}</p>
                    <h2 className="text-2xl font-black">Pagar via PIX</h2>
                  </>
                )}
                {buyModal.step === "pending" && (
                  <>
                    <p className="text-xs text-zinc-500 mb-1">{buyModal.product.toUpperCase()} — {buyModal.plan.name}</p>
                    <h2 className="text-2xl font-black text-yellow-400">Aguardando Confirmação</h2>
                  </>
                )}
                {buyModal.step === "key" && <h2 className="text-2xl font-black text-green-400">Compra Confirmada!</h2>}
              </div>
              <button onClick={closeBuyModal} className="rounded-xl bg-zinc-800 hover:bg-red-500 px-3 py-2 text-sm font-bold transition">✕</button>
            </div>
            <div className="px-8 pb-8">
              {buyModal.step === "terms" && (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
                    <p className="text-red-400 font-black text-sm mb-1">⚠️ AVISO IMPORTANTE</p>
                    <p className="text-zinc-300 text-xs leading-relaxed">Leia com atenção antes de prosseguir com a compra.</p>
                  </div>
                  <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                    {[
                      { icon: "🚫", title: "Sem Reembolso", text: "Após a confirmação do pagamento, não realizamos reembolsos. A key é entregue imediatamente e não pode ser devolvida." },
                      { icon: "⚠️", title: "Risco de Ban", text: "O uso de cheats viola os termos de serviço dos jogos. A NEXOX GROUP não se responsabiliza pelo banimento de contas." },
                      { icon: "🔒", title: "Uso por Sua Conta e Risco", text: "Você assume total responsabilidade pelo uso do software. A NEXOX não se responsabiliza por quaisquer danos ou consequências." },
                      { icon: "📋", title: "Revenda Proibida", text: "É proibida a revenda ou redistribuição das keys adquiridas." },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-xl shrink-0">{item.icon}</span>
                        <div>
                          <p className="font-black text-white mb-0.5">{item.title}</p>
                          <p className="text-zinc-400 text-xs">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${termsChecked.noRefund ? "bg-white border-white" : "border-white/30 group-hover:border-white/60"}`} onClick={() => setTermsChecked((p) => ({ ...p, noRefund: !p.noRefund }))}>
                        {termsChecked.noRefund && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-zinc-300">Entendo que <strong className="text-white">não há reembolso</strong> após a confirmação do pagamento.</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${termsChecked.riskAccepted ? "bg-white border-white" : "border-white/30 group-hover:border-white/60"}`} onClick={() => setTermsChecked((p) => ({ ...p, riskAccepted: !p.riskAccepted }))}>
                        {termsChecked.riskAccepted && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm text-zinc-300">Estou ciente dos riscos e <strong className="text-white">uso o software por minha conta e risco</strong>.</span>
                    </label>
                  </div>
                  <button
                    disabled={!termsChecked.noRefund || !termsChecked.riskAccepted}
                    onClick={() => { if (buyModal.step === "terms") setBuyModal({ step: "pix", product: buyModal.product, plan: buyModal.plan }); }}
                    className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    Aceitar e Continuar →
                  </button>
                  <button onClick={closeBuyModal} className="w-full text-center text-zinc-500 text-sm hover:text-white transition">Cancelar</button>
                </div>
              )}
              {buyModal.step === "pix" && (() => {
                const orig = priceToNumber(buyModal.plan.price);
                const final = applyDiscount(orig);
                const hasDiscount = couponData !== null;
                const txId = `NEXOX${buyModal.plan.planId.toUpperCase().replace(/-/g, "")}`;
                const pixPayload = generatePixPayload({ pixKey: PIX_KEY, amount: final, merchantName: MERCHANT_NAME, merchantCity: MERCHANT_CITY, txId });
                return (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
                      <div><p className="text-zinc-400 text-xs mb-0.5">Plano</p><p className="font-black text-lg">{buyModal.plan.name}</p></div>
                      <div className="text-right">
                        {hasDiscount && <p className="text-zinc-500 text-xs line-through">{buyModal.plan.price}</p>}
                        <p className={`text-2xl font-black ${hasDiscount ? "text-green-400" : ""}`}>R$ {final.toFixed(2).replace(".", ",")}</p>
                        {hasDiscount && <p className="text-green-400 text-xs">-{couponData!.discountType === "percent" ? `${couponData!.discountValue}%` : `R$ ${couponData!.discountValue}`}</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-xs mb-2">Cupom de desconto (opcional):</p>
                      <div className="flex gap-2">
                        <input type="text" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }} onKeyDown={(e) => e.key === "Enter" && validateCoupon()} placeholder="EX: DESCONTO10" disabled={!!couponData} className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition text-sm font-mono disabled:opacity-50" />
                        {couponData ? (
                          <button onClick={() => { setCouponData(null); setCouponCode(""); }} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 font-bold text-xs transition hover:bg-red-500/30">✕</button>
                        ) : (
                          <button onClick={validateCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-bold text-xs transition disabled:opacity-50">{couponLoading ? "..." : "Aplicar"}</button>
                        )}
                      </div>
                      {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
                      {couponData && <p className="text-green-400 text-xs mt-1">✓ Cupom {couponData.code} aplicado!</p>}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-zinc-400 text-sm">Escaneie com o app do seu banco:</p>
                      <div className="p-4 rounded-2xl bg-white shadow-2xl">
                        <QRCodeSVG value={pixPayload} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-xs mb-2">Ou copie a chave PIX:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-white truncate">{PIX_KEY}</div>
                        <button onClick={() => copyPix(PIX_KEY)} className={`px-3 py-2 rounded-xl font-bold text-xs transition shrink-0 ${copied ? "bg-green-500 text-white" : "bg-zinc-700 hover:bg-zinc-600"}`}>{copied ? "Copiado!" : "Copiar"}</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Seu nome (para registrar a compra):</label>
                      <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Ex: João Silva" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button onClick={handleConfirmPayment} disabled={loading} className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50">
                      {loading ? "Registrando..." : "Já enviei o PIX →"}
                    </button>
                    <button onClick={closeBuyModal} className="w-full text-center text-zinc-500 text-sm hover:text-white transition">← Voltar</button>
                  </div>
                );
              })()}
              {buyModal.step === "pending" && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
                      <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="font-black text-lg text-yellow-400">PIX Recebido!</p>
                    <p className="text-zinc-400 text-sm mt-1">Seu pagamento foi registrado e está aguardando confirmação do admin.</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-900 border border-white/10 p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-400">Plano</span><span className="font-bold">{buyModal.plan.name}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Produto</span><span className="font-bold">{buyModal.product === "rage" ? "RAGE PANEL" : "LITE PANEL"}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Valor</span><span className="font-bold text-green-400">{buyModal.plan.price}</span></div>
                  </div>
                  <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-300">
                    <p className="font-black mb-1">O que acontece agora?</p>
                    <p className="text-zinc-400 leading-relaxed">O admin irá verificar se o PIX caiu na conta e liberar sua key. Você pode acompanhar o status em <strong className="text-white">Minhas Compras</strong>.</p>
                  </div>
                  <Link to="/minhas-compras" onClick={closeBuyModal} className="block w-full py-4 rounded-2xl bg-white text-black font-black text-center hover:scale-[1.02] transition">
                    Ver em Minhas Compras →
                  </Link>
                  <button onClick={closeBuyModal} className="w-full text-center text-zinc-500 text-sm hover:text-white transition">Fechar</button>
                </div>
              )}
              {buyModal.step === "key" && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-zinc-400 text-sm">Plano <strong className="text-white">{buyModal.plan.name}</strong> ativado!</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm mb-2">Sua key de acesso:</p>
                    <div className="px-4 py-4 rounded-xl bg-black/60 border border-green-500/30 font-mono text-green-400 text-center text-lg font-black tracking-widest">{buyModal.key}</div>
                    <button onClick={() => copyKey(buyModal.key)} className={`mt-3 w-full py-3 rounded-2xl font-bold transition ${copied ? "bg-green-500 text-white" : "bg-white text-black hover:scale-[1.02]"}`}>{copied ? "Copiado!" : "Copiar Key"}</button>
                  </div>
                  {buyModal.downloadUrl && (
                    <a href={buyModal.downloadUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-3 rounded-2xl bg-zinc-800 border border-white/10 text-center font-bold hover:bg-zinc-700 transition text-sm">
                      ⬇️ Baixar {buyModal.product === "rage" ? "RAGE PANEL" : "LITE PANEL"}
                    </a>
                  )}
                  <div className="rounded-2xl bg-zinc-900 border border-white/5 p-4 text-sm text-zinc-400">
                    <strong className="text-white">Guarde sua key!</strong> Ela é única e fica salva em <Link to="/minhas-compras" className="text-white underline">Minhas Compras</Link>.
                  </div>
                  <button onClick={closeBuyModal} className="w-full text-center text-zinc-500 text-sm hover:text-white transition">Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {customModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-white/10 shrink-0">
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">{customModal.pkg.name} — {customModal.pkg.price}</p>
                <h2 className="text-xl font-black">
                  {customModal.step === "info" && "Suas informações"}
                  {customModal.step === "project" && "Nome do cheat"}
                  {customModal.step === "logo" && "Logo do cheat"}
                  {customModal.step === "reference" && "Referência de design"}
                  {customModal.step === "pix" && "Pagamento via PIX"}
                  {customModal.step === "chat" && "💬 Chat com a equipe"}
                </h2>
              </div>
              {customModal.step !== "chat" && (
                <button onClick={() => setCustomModal(null)} className="rounded-xl bg-zinc-800 hover:bg-red-500 px-3 py-2 text-sm font-bold transition">✕</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {customModal.step === "info" && (
                <div className="space-y-4">
                  <p className="text-zinc-400 text-sm">Preencha seus dados de contato:</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Seu nome *</label>
                    <input type="text" value={customModal.clientName} onChange={(e) => updateCustomModal({ clientName: e.target.value })} placeholder="João Silva" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Seu email *</label>
                    <input type="email" value={customModal.clientEmail} onChange={(e) => updateCustomModal({ clientEmail: e.target.value })} placeholder="seu@email.com" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition" />
                  </div>
                  {customModal.error && <p className="text-red-400 text-sm">{customModal.error}</p>}
                  <button onClick={() => { if (!customModal.clientName.trim() || !customModal.clientEmail.trim()) { updateCustomModal({ error: "Preencha todos os campos." }); return; } updateCustomModal({ step: "project", error: "" }); }} className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition">
                    Continuar →
                  </button>
                </div>
              )}

              {customModal.step === "project" && (
                <div className="space-y-4">
                  <p className="text-zinc-400 text-sm">Como será chamado o seu cheat?</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Nome do cheat *</label>
                    <input type="text" value={customModal.projectName} onChange={(e) => updateCustomModal({ projectName: e.target.value })} placeholder="Ex: PhantomX, DarkAim, etc." className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition text-lg font-bold" />
                  </div>
                  {customModal.error && <p className="text-red-400 text-sm">{customModal.error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => updateCustomModal({ step: "info" })} className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition font-bold">← Voltar</button>
                    <button onClick={() => { if (!customModal.projectName.trim()) { updateCustomModal({ error: "Informe o nome do cheat." }); return; } updateCustomModal({ step: "logo", error: "" }); }} className="flex-1 py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition">
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {customModal.step === "logo" && (
                <div className="space-y-4">
                  <p className="text-zinc-400 text-sm">Envie a logo que será usada no seu cheat:</p>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed ${customModal.logoBase64 ? "border-green-500/40 bg-green-500/5" : "border-white/20 hover:border-white/40"} transition cursor-pointer p-8 text-center`}
                  >
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f, "logoBase64"); }} />
                    {customModal.logoBase64 ? (
                      <div>
                        <img src={customModal.logoBase64} alt="logo preview" className="max-h-32 mx-auto rounded-xl object-contain mb-3" />
                        <p className="text-green-400 text-sm font-bold">✓ Logo carregada!</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-3">🖼️</div>
                        <p className="font-bold mb-1">Clique para carregar a logo</p>
                        <p className="text-zinc-500 text-sm">PNG, JPG ou WEBP</p>
                      </div>
                    )}
                  </div>
                  {customModal.error && <p className="text-red-400 text-sm">{customModal.error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => updateCustomModal({ step: "project" })} className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition font-bold">← Voltar</button>
                    <button onClick={() => { if (!customModal.logoBase64) { updateCustomModal({ error: "Envie uma logo para continuar." }); return; } updateCustomModal({ step: "reference", error: "" }); }} className="flex-1 py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition">
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {customModal.step === "reference" && (
                <div className="space-y-4">
                  <p className="text-zinc-400 text-sm">Tem alguma imagem de referência de design? (opcional)</p>
                  <div
                    onClick={() => refInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed ${customModal.referenceBase64 ? "border-green-500/40 bg-green-500/5" : "border-white/20 hover:border-white/40"} transition cursor-pointer p-8 text-center`}
                  >
                    <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f, "referenceBase64"); }} />
                    {customModal.referenceBase64 ? (
                      <div>
                        <img src={customModal.referenceBase64} alt="ref preview" className="max-h-32 mx-auto rounded-xl object-contain mb-3" />
                        <p className="text-green-400 text-sm font-bold">✓ Referência carregada!</p>
                        <button onClick={(e) => { e.stopPropagation(); updateCustomModal({ referenceBase64: null }); }} className="mt-2 text-red-400 text-xs hover:text-red-300 transition">Remover</button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-3">🎨</div>
                        <p className="font-bold mb-1">Clique para carregar (opcional)</p>
                        <p className="text-zinc-500 text-sm">Qualquer design de referência</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => updateCustomModal({ step: "logo" })} className="flex-1 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition font-bold">← Voltar</button>
                    <button onClick={() => updateCustomModal({ step: "pix", error: "" })} className="flex-1 py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition">
                      Ir para Pagamento →
                    </button>
                  </div>
                </div>
              )}

              {customModal.step === "pix" && (() => {
                const pixPayload = generatePixPayload({ pixKey: PIX_KEY, amount: customModal.pkg.amount, merchantName: MERCHANT_NAME, merchantCity: MERCHANT_CITY, txId: `NEXOX${customModal.pkg.id.toUpperCase().replace(/-/g, "")}` });
                return (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex justify-between items-center">
                      <div><p className="text-xs text-zinc-500 mb-0.5">Pacote</p><p className="font-black">{customModal.pkg.name}</p><p className="text-xs text-zinc-500 mt-0.5">Cheat: {customModal.projectName}</p></div>
                      <p className="text-2xl font-black">{customModal.pkg.price}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-zinc-400 text-sm">Escaneie com o app do seu banco:</p>
                      <div className="p-4 rounded-2xl bg-white shadow-2xl">
                        <QRCodeSVG value={pixPayload} size={160} bgColor="#ffffff" fgColor="#000000" level="M" />
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-xs mb-2">Ou copie a chave PIX:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-white truncate">{PIX_KEY}</div>
                        <button onClick={() => { navigator.clipboard.writeText(PIX_KEY); }} className="px-3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-bold text-xs transition">Copiar</button>
                      </div>
                    </div>
                    {customModal.error && <p className="text-red-400 text-sm">{customModal.error}</p>}
                    <button onClick={submitCustomOrder} disabled={customModal.loading} className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50">
                      {customModal.loading ? "Criando pedido..." : "Já paguei — Enviar Pedido"}
                    </button>
                    <button onClick={() => updateCustomModal({ step: "reference" })} className="w-full text-center text-zinc-500 text-sm hover:text-white transition">← Voltar</button>
                  </div>
                );
              })()}

              {customModal.step === "chat" && (
                <div className="flex flex-col" style={{ height: "420px" }}>
                  <div className="rounded-2xl bg-green-500/10 border border-green-500/30 p-4 mb-4 text-sm shrink-0">
                    <p className="text-green-400 font-black mb-1">✅ Pedido recebido!</p>
                    <p className="text-zinc-400">Nossa equipe vai entrar em contato em breve. Você pode continuar conversando aqui.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                    {customModal.chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex gap-2 ${msg.senderType === "client" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${msg.senderType === "client" ? "bg-white text-black" : "bg-zinc-700"}`}>
                          {msg.senderType === "client" ? msg.senderName[0]?.toUpperCase() : msg.senderType === "system" ? "N" : "S"}
                        </div>
                        <div className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${msg.senderType === "client" ? "bg-white text-black rounded-tr-none" : "bg-zinc-900 border border-white/10 rounded-tl-none"}`}>
                          <p className={`text-xs font-bold mb-0.5 ${msg.senderType === "client" ? "text-black/50" : "text-zinc-500"}`}>{msg.senderType === "client" ? msg.senderName : msg.senderType === "system" ? "NEXOX" : `Staff · ${msg.senderName}`}</p>
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <input type="text" value={customModal.chatInput} onChange={(e) => updateCustomModal({ chatInput: e.target.value })} onKeyDown={(e) => e.key === "Enter" && sendCustomChat()} placeholder="Envie uma mensagem..." className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition text-sm" />
                    <button onClick={sendCustomChat} disabled={customModal.sending || !customModal.chatInput.trim()} className="px-4 py-2 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition disabled:opacity-50">
                      {customModal.sending ? "..." : "Enviar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
