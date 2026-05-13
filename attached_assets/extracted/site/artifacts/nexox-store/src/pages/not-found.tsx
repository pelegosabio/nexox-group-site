import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 opacity-90" />
      <div className="relative z-10 text-center">
        <h1 className="text-8xl font-black mb-4 text-zinc-700">404</h1>
        <p className="text-2xl font-black mb-2">Página não encontrada</p>
        <p className="text-zinc-400 mb-8">Esta página não existe.</p>
        <Link
          to="/"
          className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all duration-300 inline-block"
        >
          Voltar para a loja
        </Link>
      </div>
    </div>
  );
}
