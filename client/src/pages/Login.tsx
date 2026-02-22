import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Lock, Mail, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "https://static.manus.space/files/covezi-logo-main.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      utils.auth.me.invalidate();
      toast.success(`Bem-vindo(a), ${data.user.nome}!`);
      setLocation("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-48 h-16 flex items-center justify-center mb-3">
            <img
              src={LOGO_URL}
              alt="Covezi Iveco"
              className="max-h-16 max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
              }}
            />
            <div style={{ display: "none" }} className="flex items-center gap-2">
              <Truck className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Covezi Iveco</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Sistema de Gestão de Estoque</p>
        </div>

        {/* Form card */}
        <div className="bg-card border-2 border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-primary px-6 py-4">
            <h1 className="text-lg font-bold text-primary-foreground text-center">
              Acesso ao Sistema
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold">
                <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1.5 border-2 h-11"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-semibold">
                <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                Senha
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10 border-2 h-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="px-6 pb-5 text-center">
            <p className="text-xs text-muted-foreground">
              Não tem acesso? Solicite um convite ao administrador do sistema.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Covezi Iveco · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
