import { useState, useEffect } from "react";
import { Link } from "wouter";

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  const [loggedUser, setLoggedUser] = useState<{ username: string; email: string } | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("nexox_logged_user");
    if (user) try { setLoggedUser(JSON.parse(user)); } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nexox_logged_user");
    setLoggedUser(null);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 -z-10" />
      <div className="fixed inset-0 opacity-[0.07] -z-10">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 rounded-full blur-[100px] -z-10" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide leading-none">NEXOX GROUP</h1>
              <p className="text-zinc-500 text-xs">Premium PC Store</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Início", to: "/" },
              { label: "Produtos", to: "/produtos" },
              { label: "Suporte", to: "/tickets" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {loggedUser ? (
              <>
                <Link to="/minhas-compras" className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm">
                  {loggedUser.username}
                </Link>
                <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-white text-black font-bold hover:scale-105 transition text-sm">
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition text-sm">
                  Entrar
                </Link>
                <Link to="/login" className="px-4 py-2 rounded-xl bg-white text-black font-bold hover:scale-105 transition text-sm">
                  Cadastro
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-8 pt-24 pb-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8 text-sm text-zinc-300 backdrop-blur-xl">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Sistema online • Entrega automática via PIX
          </div>
          <h2 className="text-7xl leading-[0.9] font-black mb-8 tracking-tight">
            NEXOX<br />
            <span className="text-zinc-500">GROUP</span><br />
            <span className="text-4xl text-zinc-400">STORE</span>
          </h2>
          <p className="text-zinc-400 text-xl leading-relaxed max-w-lg mb-10">
            A loja premium de cheats para PC com entrega automática via PIX. Pague e receba sua key em segundos.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/produtos"
              className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all duration-300 shadow-2xl text-lg"
            >
              Ver Produtos
            </Link>
            <Link
              to="/cheat-free"
              className="px-8 py-4 rounded-2xl border border-white/20 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 text-lg"
            >
              Testar Grátis
            </Link>
          </div>
        </div>

        {/* Card animado */}
        <div className="relative flex justify-center">
          <div className="absolute w-80 h-80 bg-white/10 blur-[100px] rounded-full" />
          <div className="relative w-full max-w-sm rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-[0_0_80px_rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-xl">RAGE PANEL</h3>
                <p className="text-zinc-500 text-xs">Atualização diária</p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-green-500/20 text-green-400 text-xs font-black">ONLINE</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {["Aim Assist Avançado", "ESP / Wallhack", "No Recoil Premium", "Radar Hack", "Anti-Ban"].map((item) => (
                <div key={item} className="flex items-center justify-between p-3 rounded-2xl bg-black/30 border border-white/5">
                  <span className="text-sm text-zinc-300">{item}</span>
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                </div>
              ))}
            </div>
            <Link to="/produtos" className="block text-center py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition text-sm">
              Comprar Agora — R$ 5,00
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="border-y border-white/10 bg-white/5 backdrop-blur-xl py-8">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "5.000+", label: "Clientes Ativos" },
            { value: "99.9%", label: "Uptime" },
            { value: "<1s", label: "Entrega da Key" },
            { value: "24h", label: "Suporte Online" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-black mb-1">{s.value}</p>
              <p className="text-zinc-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUTOS PREVIEW */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-zinc-500 text-sm uppercase tracking-widest mb-2">Catálogo</p>
            <h3 className="text-5xl font-black">Nossos Produtos</h3>
          </div>
          <Link to="/produtos" className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white hover:text-black transition font-bold text-sm">
            Ver tudo →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              tag: "PREMIUM",
              title: "RAGE PANEL",
              desc: "Todos os recursos avançados. Aim assist, ESP, radar, no recoil e muito mais.",
              price: "A partir de R$ 5,00",
              features: ["Aim Assist", "ESP/Wallhack", "Anti-Ban", "Suporte 24h"],
              cta: "Comprar RAGE",
              highlight: true,
            },
            {
              tag: "OTIMIZADO",
              title: "LITE PANEL",
              desc: "Mais leve, roda em qualquer PC. Perfeito para quem quer performance sem abrir mão de recursos.",
              price: "A partir de R$ 4,00",
              features: ["Aim Assist", "No Recoil", "Menu Clean", "Anti-Ban"],
              cta: "Comprar LITE",
              highlight: false,
            },
            {
              tag: "GRATUITO",
              title: "CHEAT FREE",
              desc: "Teste o sistema NEXOX gratuitamente antes de investir no plano premium.",
              price: "Grátis",
              features: ["Aim Básico", "No Recoil", "Menu Limitado", "Download Imediato"],
              cta: "Baixar Grátis",
              highlight: false,
            },
          ].map((p) => (
            <div
              key={p.title}
              className={`group relative rounded-[32px] border p-8 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
                p.highlight
                  ? "border-white/30 bg-white/10 shadow-[0_0_60px_rgba(255,255,255,0.06)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative">
                <span className="inline-block px-3 py-1 rounded-lg bg-white/10 text-zinc-300 text-xs font-black mb-4 tracking-widest">{p.tag}</span>
                <h4 className="text-2xl font-black mb-2">{p.title}</h4>
                <p className="text-zinc-400 text-sm leading-relaxed mb-5">{p.desc}</p>
                <div className="space-y-1.5 mb-6">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <p className="text-zinc-500 text-xs mb-1">Preço</p>
                <p className="text-2xl font-black">{p.price}</p>
              </div>
              <Link
                to={p.title === "CHEAT FREE" ? "/cheat-free" : "/produtos"}
                className={`relative mt-6 block text-center py-3.5 rounded-2xl font-black text-sm transition hover:scale-[1.02] ${
                  p.highlight ? "bg-white text-black" : "bg-white/10 border border-white/20 hover:bg-white hover:text-black"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-t border-white/10 py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3">Simples assim</p>
            <h3 className="text-5xl font-black">Como Funciona</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Escolha o Plano",
                desc: "Selecione o produto (RAGE ou LITE) e o período ideal para você — de diário a permanente.",
              },
              {
                step: "02",
                title: "Pague via PIX",
                desc: "Escaneie o QR Code ou copie a chave PIX. O pagamento é instantâneo e 100% seguro.",
              },
              {
                step: "03",
                title: "Receba na Hora",
                desc: "Após confirmar o pagamento, sua key é gerada e entregue automaticamente em segundos.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent -translate-x-8 z-10" />
                )}
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 h-full">
                  <div className="text-6xl font-black text-white/10 mb-4 leading-none">{item.step}</div>
                  <h4 className="text-2xl font-black mb-3">{item.title}</h4>
                  <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-14">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3">Por que escolher</p>
          <h3 className="text-5xl font-black">NEXOX GROUP</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: "⚡", title: "Entrega Instantânea", desc: "Keys geradas e entregues automaticamente logo após o pagamento PIX." },
            { icon: "🛡️", title: "Anti-Ban Avançado", desc: "Proteção integrada para manter sua conta segura durante o uso." },
            { icon: "🔄", title: "Atualizações Diárias", desc: "O sistema é atualizado constantemente para manter compatibilidade." },
            { icon: "🎧", title: "Suporte 24h", desc: "Equipe de staff online para te ajudar a qualquer hora do dia." },
            { icon: "💳", title: "PIX Automático", desc: "Pagamento rápido, sem intermediários. Funciona em qualquer banco." },
            { icon: "🖥️", title: "Multi-Plataforma", desc: "Compatível com as principais plataformas e jogos do momento." },
          ].map((f) => (
            <div key={f.title} className="rounded-[24px] border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h4 className="font-black text-lg mb-2 group-hover:text-white transition">{f.title}</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 py-24">
        <div className="max-w-3xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3">Dúvidas</p>
            <h3 className="text-5xl font-black">FAQ</h3>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Como recebo minha key após o pagamento?",
                a: "Após clicar em 'Já paguei', o sistema verifica e entrega a key automaticamente na tela. Guarde-a em local seguro.",
              },
              {
                q: "O pagamento é seguro?",
                a: "Sim. O PIX vai diretamente para a chave cadastrada. Não temos acesso a dados bancários.",
              },
              {
                q: "O cheat tem risco de ban?",
                a: "Nossos produtos possuem proteção anti-ban integrada. Mesmo assim, nenhum sistema é 100% indetectável — use com responsabilidade.",
              },
              {
                q: "Posso usar em mais de um PC?",
                a: "Cada key é vinculada a um HWID (hardware). Para usar em outro PC, entre em contato pelo suporte.",
              },
              {
                q: "Preciso de suporte? Como abro um chamado?",
                a: "Clique em 'Abrir Ticket' aqui embaixo. Nossa equipe responde em até 1h.",
              },
            ].map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* SUPORTE CTA */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-[80px]" />
          <div className="relative">
            <h3 className="text-4xl font-black mb-3">Precisa de Ajuda?</h3>
            <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
              Nossa equipe de staff está disponível 24h. Abra um ticket e receba atendimento rápido e personalizado.
            </p>
          </div>
          <div className="relative flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              to="/tickets"
              className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all duration-300 whitespace-nowrap text-lg"
            >
              Abrir Ticket
            </Link>
            <Link
              to="/staff"
              className="px-8 py-4 rounded-2xl border border-white/20 hover:bg-white/10 transition-all duration-300 whitespace-nowrap text-lg text-center"
            >
              Área Staff
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-black">NEXOX GROUP</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-zinc-500">
            <Link to="/" className="hover:text-white transition">Início</Link>
            <Link to="/produtos" className="hover:text-white transition">Produtos</Link>
            <Link to="/cheat-free" className="hover:text-white transition">Free</Link>
            <Link to="/tickets" className="hover:text-white transition">Suporte</Link>
            <Link to="/minhas-compras" className="hover:text-white transition">Minhas Compras</Link>
          </nav>
          <p className="text-zinc-600 text-sm">© 2026 NEXOX GROUP</p>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden cursor-pointer hover:bg-white/10 transition"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <p className="font-bold text-sm pr-4">{q}</p>
        <div className={`w-6 h-6 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {open && (
        <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-white/5 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}
