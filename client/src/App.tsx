import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

// Routes that use DashboardLayout
function DashboardRoutes() {
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
      {/* Standalone pages (no dashboard layout) */}
      <Route path="/convite/:token" component={AceitarConvite} />
      <Route path="/aceitar-convite" component={AceitarConvite} />
      {/* Dashboard pages */}
      <Route component={DashboardRoutes} />
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
