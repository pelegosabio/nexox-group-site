import { useState, useEffect } from "react";
import { Link } from "wouter";

const PLANS = [
  { id: "rage-diario", label: "RAGE — Diário" },
  { id: "rage-semanal", label: "RAGE — Semanal" },
  { id: "rage-15dias", label: "RAGE — 15 Dias" },
  { id: "rage-mensal", label: "RAGE — Mensal" },
  { id: "rage-trimensal", label: "RAGE — Trimensal" },
  { id: "rage-permanente", label: "RAGE — Permanente" },
  { id: "lite-diario", label: "LITE — Diário" },
  { id: "lite-semanal", label: "LITE — Semanal" },
  { id: "lite-mensal", label: "LITE — Mensal" },
  { id: "lite-permanente", label: "LITE — Permanente" },
];

type Key = {
  id: number;
  plan: string;
  keyValue: string;
  used: boolean;
  usedAt: string | null;
  buyerName: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [keys, setKeys] = useState<Key[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]!.id);
  const [newKeys, setNewKeys] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchKeys = async (s: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/keys`, {
        headers: { "x-admin-secret": s },
      });
      if (res.status === 401) {
        setMsg("Senha incorreta!");
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setKeys(data);
      setAuthed(true);
      setMsg("");
    } catch {
      setMsg("Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => fetchKeys(secret);

  const handleAddKeys = async () => {
    const lines = newKeys.split("\n").map((k) => k.trim()).filter(Boolean);
    if (!lines.length) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ plan: selectedPlan, keys: lines }),
      });
      const data = await res.json();
      setMsg(`${data.inserted} keys adicionadas!`);
      setNewKeys("");
      fetchKeys(secret);
    } catch {
      setMsg("Erro ao adicionar keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deletar esta key?")) return;
    try {
      await fetch(`${BASE}/api/admin/keys/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setMsg("Erro ao deletar.");
    }
  };

  const planLabel = (id: string) => PLANS.find((p) => p.id === id)?.label ?? id;

  const grouped = PLANS.map((plan) => ({
    ...plan,
    available: keys.filter((k) => k.plan === plan.id && !k.used).length,
    used: keys.filter((k) => k.plan === plan.id && k.used).length,
  }));

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-800 opacity-90" />

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <img src={`${BASE}/logo.png`} alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-lg">NEXOX GROUP</span>
          </Link>
          <span className="text-zinc-400 text-sm">Painel Admin</span>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        {!authed ? (
          /* LOGIN ADMIN */
          <div className="max-w-sm mx-auto">
            <h1 className="text-3xl font-black mb-8 text-center">Acesso Admin</h1>
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Senha de Admin</label>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              {msg && <p className="text-red-400 text-sm">{msg}</p>}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black">Gerenciar Keys</h1>
              <button
                onClick={() => setAuthed(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm"
              >
                Sair
              </button>
            </div>

            {/* ESTOQUE RESUMO */}
            <div>
              <h2 className="text-xl font-black mb-4">Estoque por Plano</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {grouped.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"
                  >
                    <p className="text-xs text-zinc-400 mb-1 leading-tight">{plan.label}</p>
                    <p className="text-2xl font-black">{plan.available}</p>
                    <p className="text-xs text-zinc-500">{plan.used} usadas</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ADICIONAR KEYS */}
            <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
              <h2 className="text-xl font-black mb-6">Adicionar Keys</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Plano</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-white/30 transition"
                  >
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-zinc-900">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Keys (uma por linha)
                  </label>
                  <textarea
                    value={newKeys}
                    onChange={(e) => setNewKeys(e.target.value)}
                    placeholder={"XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY"}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition font-mono text-sm resize-none"
                  />
                </div>
                {msg && <p className="text-green-400 text-sm">{msg}</p>}
                <button
                  onClick={handleAddKeys}
                  disabled={loading || !newKeys.trim()}
                  className="px-8 py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition disabled:opacity-50"
                >
                  {loading ? "Adicionando..." : "Adicionar Keys"}
                </button>
              </div>
            </div>

            {/* LISTA DE KEYS */}
            <div>
              <h2 className="text-xl font-black mb-4">Todas as Keys</h2>
              <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-zinc-400 font-medium">Plano</th>
                      <th className="text-left px-6 py-4 text-zinc-400 font-medium">Key</th>
                      <th className="text-left px-6 py-4 text-zinc-400 font-medium">Status</th>
                      <th className="text-left px-6 py-4 text-zinc-400 font-medium">Comprador</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {keys.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-zinc-500">
                          Nenhuma key cadastrada ainda.
                        </td>
                      </tr>
                    ) : (
                      keys.map((key) => (
                        <tr key={key.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="px-6 py-3 text-zinc-300">{planLabel(key.plan)}</td>
                          <td className="px-6 py-3 font-mono text-white">{key.keyValue}</td>
                          <td className="px-6 py-3">
                            {key.used ? (
                              <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">Usada</span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">Disponível</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-zinc-400">{key.buyerName ?? "—"}</td>
                          <td className="px-6 py-3 text-right">
                            {!key.used && (
                              <button
                                onClick={() => handleDelete(key.id)}
                                className="text-red-400 hover:text-red-300 transition text-xs"
                              >
                                Deletar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
