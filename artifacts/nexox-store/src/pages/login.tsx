import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);

  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const loggedUser = localStorage.getItem("nexox_logged_user");
    if (loggedUser) {
      navigate("/");
    }
  }, [navigate]);

  const handleRegister = () => {
    if (!registerData.username || !registerData.email || !registerData.password) {
      alert("Preencha todos os campos!");
      return;
    }
    localStorage.setItem("nexox_user", JSON.stringify(registerData));
    alert("Conta criada com sucesso!");
    setIsLogin(true);
  };

  const handleLogin = () => {
    const savedUser = JSON.parse(localStorage.getItem("nexox_user") || "null");
    if (!savedUser) {
      alert("Nenhuma conta encontrada!");
      return;
    }
    if (loginData.email === savedUser.email && loginData.password === savedUser.password) {
      localStorage.setItem("nexox_logged_user", JSON.stringify(savedUser));
      navigate("/");
    } else {
      alert("Email ou senha incorretos!");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-white/5 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-4 group">
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <img
                src={`${BASE}/logo.png`}
                alt="NEXOX GROUP"
                className="w-14 h-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-wide">NEXOX GROUP</h1>
              <p className="text-zinc-400 text-sm">Premium PC Store</p>
            </div>
          </Link>
        </div>

        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              isLogin ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              !isLogin ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Cadastro
          </button>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
          {isLogin ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Senha</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300 mt-2"
              >
                Entrar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Username</label>
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  placeholder="nexox_user"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Senha</label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              <button
                onClick={handleRegister}
                className="w-full py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] transition-all duration-300 mt-2"
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-6">
          <Link to="/" className="hover:text-white transition-colors">
            Voltar para a loja
          </Link>
        </p>
      </div>
    </div>
  );
}
