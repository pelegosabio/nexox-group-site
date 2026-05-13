import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";

const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const YOUTUBE_URL = "https://www.youtube.com/@NEXOXGROUP";

type Step = "instructions" | "upload" | "pending" | "download" | "rejected";

export default function CheatFreePage() {
  const [step, setStep] = useState<Step>("instructions");
  const [username, setUsername] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [freeKey, setFreeKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${BASE()}/api/free-verifications/status?token=${t}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "approved") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setDownloadUrl(data.downloadUrl ?? null);
        setFreeKey(data.freeKey ?? null);
        setStep("download");
      } else if (data.status === "rejected") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setStep("rejected");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("nexox_free_token");
    if (saved) {
      setToken(saved);
      setStep("pending");
    }
  }, []);

  useEffect(() => {
    if (step === "pending" && token) {
      pollStatus(token);
      pollingRef.current = setInterval(() => pollStatus(token), 8000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, token, pollStatus]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== "upload") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onloadend = () => { setSelectedImage(reader.result as string); };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [step]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setSelectedImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) { setError("Informe seu nome de usuário."); return; }
    if (!selectedImage) { setError("Envie o print da sua inscrição no canal."); return; }
    setError(""); setSending(true);
    try {
      const res = await fetch(`${BASE()}/api/free-verifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), printBase64: selectedImage }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao enviar verificação."); setSending(false); return; }
      localStorage.setItem("nexox_free_token", data.token);
      setToken(data.token);
      setStep("pending");
    } catch { setError("Erro de conexão. Tente novamente."); }
    setSending(false);
  };

  const handleRestart = () => {
    localStorage.removeItem("nexox_free_token");
    setToken(null);
    setUsername("");
    setSelectedImage(null);
    setError("");
    setStep("instructions");
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 blur-[150px] rounded-full" />

      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <img src={`${BASE()}/logo.png`} alt="logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide">NEXOX GROUP</h1>
              <p className="text-zinc-400 text-sm">Premium PC Store</p>
            </div>
          </Link>
          <Link to="/" className="px-5 py-2 rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all">
            Voltar
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {step === "instructions" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <img src={`${BASE()}/logo.png`} alt="logo" className="w-12 h-12 object-contain" />
                </div>
                <h2 className="text-3xl font-black mb-2">CHEAT FREE</h2>
                <p className="text-zinc-400">Versão gratuita do sistema NEXOX</p>
              </div>
              <div className="space-y-4 mb-8">
                {[
                  { n: "1", title: "Se inscreva no canal", desc: "Acesse nosso canal no YouTube e se inscreva." },
                  { n: "2", title: "Tire um print", desc: "Capture a tela mostrando que você está inscrito no canal." },
                  { n: "3", title: "Envie para verificação", desc: "Envie o print aqui. O admin vai liberar seu download em breve." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black text-sm shrink-0">{s.n}</div>
                    <div>
                      <p className="font-bold mb-1">{s.title}</p>
                      <p className="text-zinc-400 text-sm">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black transition-all duration-300 mb-3 hover:scale-[1.02]"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
                Acessar Canal no YouTube
              </a>

              <button
                onClick={() => setStep("upload")}
                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300"
              >
                Já me inscrevi — Enviar Print →
              </button>
            </div>
          )}

          {step === "upload" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black mb-2">Enviar Verificação</h2>
                <p className="text-zinc-400 text-sm">Informe seu nome e envie o print da sua inscrição</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Seu nome / usuário</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: NexoxFan123"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Print da inscrição no canal</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition p-6 text-center ${selectedImage ? "border-green-500/40 bg-green-500/5" : "border-white/20 hover:border-white/40 bg-black/20"}`}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    {selectedImage ? (
                      <div>
                        <img src={selectedImage} alt="print" className="max-h-40 mx-auto rounded-xl object-contain mb-3" />
                        <p className="text-green-400 text-sm font-bold">✓ Print carregado!</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                          className="mt-2 text-red-400 text-xs hover:text-red-300 transition"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-3">📸</div>
                        <p className="font-bold mb-1">Clique ou cole (Ctrl+V) o print</p>
                        <p className="text-zinc-500 text-sm">PNG, JPG ou WEBP</p>
                      </div>
                    )}
                  </div>
                </div>

                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-red-500/30 bg-red-600/10 text-red-400 font-bold text-sm hover:bg-red-600/20 transition"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                  </svg>
                  Ir para o Canal (caso ainda não tenha se inscrito)
                </a>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
                >
                  {sending ? "Enviando..." : "Enviar para Verificação →"}
                </button>
                <button onClick={() => setStep("instructions")} className="w-full text-center text-zinc-500 text-sm hover:text-white transition">
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {step === "pending" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-10 h-10 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-3 text-yellow-400">Aguardando Verificação</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Seu print foi enviado! O admin irá verificar sua inscrição no canal e liberar o download em breve.
                <br /><br />
                Esta página atualiza automaticamente. Você pode fechá-la e voltar depois.
              </p>

              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black transition-all mb-4 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
                @NEXOXGROUP no YouTube
              </a>

              <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mb-6">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                Verificando a cada 8 segundos...
              </div>

              <button onClick={handleRestart} className="text-zinc-600 text-sm hover:text-zinc-400 transition">
                Enviar novamente
              </button>
            </div>
          )}

          {step === "download" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-3 text-green-400">Acesso Liberado!</h2>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                Sua inscrição foi verificada com sucesso!
              </p>
              {freeKey && (
                <div className="mb-6">
                  <p className="text-zinc-400 text-sm mb-2">Sua chave de acesso:</p>
                  <div className="px-4 py-4 rounded-xl bg-black/60 border border-green-500/30 font-mono text-green-400 text-center text-lg font-black tracking-widest mb-3">
                    {freeKey}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(freeKey)}
                    className="w-full py-3 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300"
                  >
                    Copiar Chave
                  </button>
                </div>
              )}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-4 rounded-2xl bg-zinc-800 border border-white/10 text-white font-black hover:bg-zinc-700 transition-all duration-300 mb-4 text-center"
                >
                  ⬇️ Baixar CHEAT FREE
                </a>
              )}
              {!freeKey && !downloadUrl && (
                <p className="text-zinc-500 mb-4 text-sm">Chave e link de download serão disponibilizados em breve. Fale com o suporte.</p>
              )}
              <Link to="/" className="block text-zinc-400 hover:text-white transition text-sm mt-4">Voltar para a loja</Link>
            </div>
          )}

          {step === "rejected" && (
            <div className="rounded-[32px] border border-red-500/20 bg-red-500/5 backdrop-blur-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-3 text-red-400">Verificação Recusada</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Infelizmente seu print não foi aprovado. Certifique-se de estar inscrito no canal e tente novamente.
              </p>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black transition-all mb-4 hover:scale-[1.02]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
                @NEXOXGROUP no YouTube
              </a>
              <button
                onClick={handleRestart}
                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300"
              >
                Tentar Novamente
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
