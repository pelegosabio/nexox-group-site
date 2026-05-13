import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";

export function CartSidebar() {
  const { items, removeItem, isOpen, closeCart } = useCart();
  const [, navigate] = useLocation();

  const total = items.reduce((sum, item) => {
    const val = parseFloat(item.price.replace("R$ ", "").replace(",", "."));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const handleBuyItem = (item: (typeof items)[0]) => {
    localStorage.setItem("nexox_checkout_plan", JSON.stringify({
      product: item.product,
      planId: item.planId,
      planName: item.planName,
      price: item.price,
      cartItemId: item.id,
    }));
    closeCart();
    navigate("/produtos");
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeCart} />
      )}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-full bg-zinc-950 border-l border-white/10 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xl">🛒</span>
              <h2 className="font-black text-lg">Carrinho</h2>
              {items.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white text-black text-xs font-black">{items.length}</span>
              )}
            </div>
            <button onClick={closeCart} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-sm font-bold">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="text-5xl mb-4">🛒</div>
                <p className="font-black text-lg mb-2">Carrinho vazio</p>
                <p className="text-zinc-500 text-sm">Adicione produtos para comprar</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-black text-sm">{item.product === "rage" ? "RAGE PANEL" : "LITE PANEL"}</p>
                      <p className="text-zinc-400 text-xs">{item.planName}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-zinc-600 hover:text-red-400 transition text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white">{item.price}</span>
                    <button
                      onClick={() => handleBuyItem(item)}
                      className="px-4 py-2 rounded-xl bg-white text-black font-black text-xs hover:scale-105 transition"
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-zinc-400 text-sm">Total estimado</span>
                <span className="font-black text-xl">R$ {total.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-zinc-600 text-xs text-center">Cada item tem seu próprio PIX</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function CartButton() {
  const { items, openCart } = useCart();
  return (
    <button
      onClick={openCart}
      className="relative px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition text-sm flex items-center gap-2"
    >
      🛒
      {items.length > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-black text-xs font-black flex items-center justify-center">
          {items.length}
        </span>
      )}
    </button>
  );
}
