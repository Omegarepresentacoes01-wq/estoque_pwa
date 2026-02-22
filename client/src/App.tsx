import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Programacao from "./pages/Programacao";
import Importacao from "./pages/Importacao";
import VeiculoDetalhe from "./pages/VeiculoDetalhe";
import Colaboradores from "./pages/Colaboradores";
import AceitarConvite from "./pages/AceitarConvite";
import Login from "./pages/Login";
import { trpc } from "./lib/trpc";
import { Loader2 } from "lucide-react";

// Guard: redireciona para login se não autenticado
function ProtectedDashboard() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirecionar para login
    setLocation("/login");
    return null;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/estoque" component={Estoque} />
        <Route path="/programacao" component={Programacao} />
        <Route path="/importacao" component={Importacao} />
        <Route path="/veiculo/:id" component={VeiculoDetalhe} />
        <Route path="/colaboradores" component={Colaboradores} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Páginas públicas (sem layout) */}
      <Route path="/login" component={Login} />
      <Route path="/convite/:token" component={AceitarConvite} />
      <Route path="/aceitar-convite" component={AceitarConvite} />
      {/* Páginas protegidas */}
      <Route component={ProtectedDashboard} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
