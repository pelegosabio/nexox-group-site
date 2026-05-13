import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";

type Message = {
  sender: "user" | "admin";
  text: string;
  image?: string;
};

export default function CheatFreePage() {
  const [step, setStep] = useState<"instructions" | "chat" | "download">("instructions");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleSendMessage = () => {
    if (!inputMessage.trim() && !selectedImage) return;
    if (sending) return;

    const newMessage: Message = {
      sender: "user",
      text: inputMessage,
    };
    if (selectedImage) {
      newMessage.image = selectedImage;
    }

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setSelectedImage(null);
    setSending(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "admin",
          text: "Obrigado por enviar o print! Estamos verificando sua inscrição no canal. Aguarde um momento...",
        },
      ]);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "admin",
            text: "Inscrição verificada com sucesso! Seu download foi liberado.",
          },
        ]);
        setStep("download");
        setSending(false);
      }, 3000);
    }, 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative flex flex-col">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 blur-[150px] rounded-full" />

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <img src={`${BASE}/logo.png`} alt="logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide">NEXOX GROUP</h1>
              <p className="text-zinc-400 text-sm">Premium PC Store</p>
            </div>
          </Link>
          <Link
            to="/"
            className="px-5 py-2 rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all"
          >
            Voltar
          </Link>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* INSTRUÇÕES */}
          {step === "instructions" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-4 shadow-2xl">
                  <img src={`${BASE}/logo.png`} alt="logo" className="w-12 h-12 object-contain" />
                </div>
                <h2 className="text-3xl font-black mb-2">CHEAT FREE</h2>
                <p className="text-zinc-400">Versão gratuita do sistema</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-bold mb-1">Inscreva-se no canal</p>
                    <p className="text-zinc-400 text-sm">
                      Acesse nosso canal no YouTube/Discord e se inscreva.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-bold mb-1">Tire um print da inscrição</p>
                    <p className="text-zinc-400 text-sm">
                      Capture a tela mostrando que você está inscrito.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-bold mb-1">Envie o print no chat</p>
                    <p className="text-zinc-400 text-sm">
                      Mande o print para verificação e libere o download.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep("chat")}
                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300"
              >
                Continuar
              </button>
            </div>
          )}

          {/* CHAT */}
          {step === "chat" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <img src={`${BASE}/logo.png`} alt="admin" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <p className="font-bold">Suporte NEXOX</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <p className="text-zinc-400 text-xs">Online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 min-h-[280px] max-h-[320px] overflow-y-auto">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                    <img src={`${BASE}/logo.png`} alt="admin" className="w-5 h-5 object-contain" />
                  </div>
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                    <p className="text-sm">
                      Olá! Para liberar o CHEAT FREE, envie um print da sua inscrição no nosso canal.
                    </p>
                  </div>
                </div>

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.sender === "admin" && (
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                        <img src={`${BASE}/logo.png`} alt="admin" className="w-5 h-5 object-contain" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm ${
                        msg.sender === "user"
                          ? "bg-white text-black rounded-tr-none"
                          : "bg-zinc-900 border border-white/10 rounded-tl-none"
                      }`}
                    >
                      {msg.text && <p>{msg.text}</p>}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="print"
                          className="mt-2 rounded-xl max-w-full max-h-40 object-contain"
                        />
                      )}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                      <img src={`${BASE}/logo.png`} alt="admin" className="w-5 h-5 object-contain" />
                    </div>
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-white/10 bg-black/20">
                {selectedImage && (
                  <div className="mb-3 relative inline-block">
                    <img src={selectedImage} alt="preview" className="h-16 rounded-xl object-contain border border-white/10" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition shrink-0"
                    title="Enviar imagem"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Digite ou cole um print (Ctrl+V)..."
                    className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="px-4 py-2 rounded-xl bg-white text-black font-bold hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 text-sm"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DOWNLOAD */}
          {step === "download" && (
            <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-3xl font-black mb-3">Download Liberado!</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Sua inscrição foi verificada com sucesso. Clique abaixo para baixar o CHEAT FREE.
              </p>

              <button
                onClick={() => alert("Download iniciado! Obrigado por usar o NEXOX GROUP.")}
                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300 mb-4"
              >
                Baixar CHEAT FREE
              </button>

              <Link
                to="/"
                className="block text-zinc-400 hover:text-white transition text-sm"
              >
                Voltar para a loja
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
