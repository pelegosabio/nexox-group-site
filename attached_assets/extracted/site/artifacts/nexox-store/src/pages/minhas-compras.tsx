import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

type Purchase = {
  plan: string;
  planId: string;
  price: string;
  product: string;
  key: string;
  buyerName: string;
  date: string;
};

export default function MinhasCompras() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loggedUser, setLoggedUser] = useState<{ username: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const user = localStorage.getItem("nexox_logged_user");
    if (!user) {
      navigate("/login");
      return;
    }
    try { setLoggedUser(JSON.parse(user)); } catch {}

    const saved = localStorage.getItem("nexox_purchases");
    if (saved) {
      try { setPurchases(JSON.parse(saved)); } catch {}
    }
  }, [navigate]);

  const copyKey = (key: string, idx: number) => {
    navigator.clipboard.writeText(key);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <img src={`${BASE}/logo.png`} alt="logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wide">NEXOX GROUP</h1>
              <p className="text-zinc-400 text-xs">Premium PC Store</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {loggedUser && (
              <span className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm">
                {loggedUser.username}
              </span>
            )}
            <Link to="/" className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all text-sm">
              ← Loja
            </Link>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h2 className="text-4xl font-black mb-2">Minhas Compras</h2>
          <p className="text-zinc-400">Todas as suas keys de acesso em um só lugar.</p>
        </div>

        {purchases.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-xl font-black mb-2">Nenhuma compra ainda</p>
            <p className="text-zinc-500 mb-8">Suas keys vão aparecer aqui após a compra.</p>
            <Link
              to="/"
              className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all inline-block"
            >
              Ver Produtos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase, idx) => (
              <div
                key={idx}
                className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-6 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Info do produto */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-xl shrink-0">
                      <img src={`${BASE}/logo.png`} alt="logo" className="w-9 h-9 object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg">{purchase.product}</span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/10 text-xs text-zinc-300">{purchase.plan}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span>{purchase.price}</span>
                        <span>·</span>
                        <span>{formatDate(purchase.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Key + Copiar */}
                  <div className="flex items-center gap-2 sm:max-w-sm w-full">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 font-mono text-sm text-green-400 truncate tracking-wider">
                      {purchase.key}
                    </div>
                    <button
                      onClick={() => copyKey(purchase.key, idx)}
                      className={`px-4 py-3 rounded-xl font-bold text-sm transition shrink-0 ${
                        copiedId === idx
                          ? "bg-green-500 text-white"
                          : "bg-white text-black hover:scale-105"
                      }`}
                    >
                      {copiedId === idx ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 text-center">
              <Link
                to="/"
                className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all inline-block"
              >
                Comprar mais
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
