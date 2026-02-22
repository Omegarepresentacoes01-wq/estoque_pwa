import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, Shield, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AceitarConvite() {
  const pathParts = window.location.pathname.split("/");
  const token = pathParts[pathParts.length - 1] ?? "";
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const utils = trpc.useUtils();

  const { data: invite, isLoading: loadingInvite, error: inviteError } = trpc.convites.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const setPasswordMutation = trpc.auth.setPassword.useMutation({
    onSuccess: (data) => {
      setDone(true);
      utils.auth.me.invalidate();
      toast.success(`Bem-vindo(a), ${data.user.nome}! Acesso ativado.`);
      setTimeout(() => setLocation("/"), 2500);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setPasswordMutation.mutate({ token, password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border-2 border-border bg-card p-8 text-center shadow-lg">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Inválido</h1>
          <p className="text-muted-foreground mb-6">Este link de convite é inválido ou está incompleto.</p>
          <Button onClick={() => setLocation("/")} className="w-full">Ir para o início</Button>
        </div>
      </div>
    );
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border-2 border-destructive/50 bg-card p-8 text-center shadow-lg">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Convite Inválido</h1>
          <p className="text-muted-foreground mb-6">
            {inviteError?.message ?? "Este convite não foi encontrado, expirou ou foi revogado."}
          </p>
          <Button onClick={() => setLocation("/")} className="w-full">Ir para o início</Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border-2 border-primary/30 bg-card p-8 text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Ativado!</h1>
          <p className="text-muted-foreground mb-2">Bem-vindo(a), <strong>{invite.nome}</strong>!</p>
          <p className="text-sm text-muted-foreground">Redirecionando para o sistema...</p>
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full rounded-2xl border-2 border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-6 text-center">
          <Shield className="w-12 h-12 text-primary-foreground mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-primary-foreground">Convite de Acesso</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Estoque Covezi Iveco</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-muted rounded-xl p-4 mb-6 border border-border">
            <p className="text-sm text-muted-foreground mb-1">Convite para:</p>
            <p className="font-semibold text-foreground text-lg">{invite.nome}</p>
            <p className="text-sm text-muted-foreground">{invite.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                invite.role === 'admin'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}>
                <Shield className="w-3 h-3" />
                {invite.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                Crie sua senha
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10 border-2"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirme sua senha
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="mt-1.5 border-2"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={setPasswordMutation.isPending}
            >
              {setPasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando acesso...
                </>
              ) : (
                "Ativar Acesso"
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Ao ativar, você concorda em usar este sistema apenas para fins autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}
