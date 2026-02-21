import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, XCircle, Loader2, Shield, Eye, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AceitarConvite() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const { data: invite, isLoading: loadingInvite, error: inviteError } = trpc.convites.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.convites.accept.useMutation({
    onSuccess: () => {
      setAccepted(true);
      setTimeout(() => setLocation("/"), 3000);
    },
  });

  // Auto-accept once user is logged in and invite is valid
  useEffect(() => {
    if (isAuthenticated && invite && !accepted && !acceptMutation.isPending && !acceptMutation.isSuccess) {
      acceptMutation.mutate({ token });
    }
  }, [isAuthenticated, invite, token]);

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

  if (loadingInvite || loading) {
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
    const msg = (inviteError as any)?.message ?? "Este convite é inválido ou expirou.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border-2 border-destructive/30 bg-card p-8 text-center shadow-lg">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Convite Inválido</h1>
          <p className="text-muted-foreground mb-6">{msg}</p>
          <Button onClick={() => setLocation("/")} className="w-full">Ir para o início</Button>
        </div>
      </div>
    );
  }

  if (accepted || acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border-2 border-green-500/30 bg-card p-8 text-center shadow-lg">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Liberado!</h1>
          <p className="text-muted-foreground mb-2">
            Bem-vindo(a), <strong className="text-foreground">{(invite as any).nome}</strong>!
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Seu acesso como <strong>{(invite as any).role === 'admin' ? 'Administrador' : 'Colaborador'}</strong> foi ativado.
            Redirecionando para o sistema...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Invite is valid — show info and login prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-3">
            {(invite as any).role === 'admin' ? (
              <Shield className="w-8 h-8 text-primary" />
            ) : (
              <Eye className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Convite de Acesso</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão de Estoque</p>
        </div>

        {/* Invite Info */}
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Convidado(a):</span>
            <span className="font-semibold text-foreground">{(invite as any).nome}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">E-mail:</span>
            <span className="font-mono text-foreground text-xs">{(invite as any).email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Perfil:</span>
            <span className={`font-semibold ${(invite as any).role === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {(invite as any).role === 'admin' ? '🛡 Administrador' : '👁 Colaborador (leitura)'}
            </span>
          </div>
        </div>

        {/* Action */}
        {isAuthenticated ? (
          <div className="text-center">
            {acceptMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Ativando acesso...</p>
              </div>
            ) : acceptMutation.isError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{(acceptMutation.error as any)?.message}</p>
                <Button onClick={() => acceptMutation.mutate({ token })} className="w-full">
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Para aceitar o convite, faça login com o e-mail <strong className="text-foreground">{(invite as any).email}</strong>.
            </p>
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              className="w-full gap-2"
              size="lg"
            >
              <LogIn className="w-4 h-4" />
              Fazer Login e Aceitar Convite
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
