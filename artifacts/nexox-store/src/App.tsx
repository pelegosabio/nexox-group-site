import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { CartSidebar } from "@/components/CartSidebar";
import Home from "@/pages/home";
import Login from "@/pages/login";
import CheatFree from "@/pages/cheat-free";
import Admin from "@/pages/admin";
import MinhasCompras from "@/pages/minhas-compras";
import Tickets from "@/pages/tickets";
import Staff from "@/pages/staff";
import Produtos from "@/pages/produtos";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/cheat-free" component={CheatFree} />
      <Route path="/admin" component={Admin} />
      <Route path="/minhas-compras" component={MinhasCompras} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/tickets/:id" component={Tickets} />
      <Route path="/staff" component={Staff} />
      <Route path="/produtos" component={Produtos} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <CartProvider>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <CartSidebar />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </CartProvider>
  );
}

export default App;
