import { useState } from "react";
import { toast } from "sonner";
import {
  Users, UserPlus, Mail, Copy, Trash2, ToggleLeft, ToggleRight,
  Clock, CheckCircle2, XCircle, AlertCircle, Shield, Eye, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";

// ─── Badges ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border-2 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border-2 border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400">
      <Eye className="w-3 h-3" /> Colaborador
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ativo")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border-2 border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3" /> Ativo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border-2 border-gray-400/40 bg-gray-400/10 text-muted-foreground">
      <XCircle className="w-3 h-3" /> Inativo
    </span>
  );
}

function InviteStatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    pendente:  { icon: <Clock className="w-3 h-3" />,        label: "Pendente", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    aceito:    { icon: <CheckCircle2 className="w-3 h-3" />, label: "Aceito",   cls: "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400" },
    expirado:  { icon: <AlertCircle className="w-3 h-3" />,  label: "Expirado", cls: "border-gray-400/40 bg-gray-400/10 text-muted-foreground" },
    revogado:  { icon: <XCircle className="w-3 h-3" />,      label: "Revogado", cls: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400" },
  };
  const s = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border-2 ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ColabItem = {
  id: number;
  nome: string;
  email: string;
  role: "colaborador" | "admin";
  status: "ativo" | "inativo";
  lastAccessAt?: string | Date | null;
};

const EMPTY_FORM = { nome: "", email: "", role: "colaborador" as "colaborador" | "admin" };

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Colaboradores() {
  const { canEdit, isAuthenticated } = usePermissions();

  // Estado: convidar
  const [showConvite, setShowConvite] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Estado: remover
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Estado: editar colaborador
  const [editColab, setEditColab] = useState<ColabItem | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editRole, setEditRole] = useState<"colaborador" | "admin">("colaborador");

  const utils = trpc.useUtils();

  const { data: colaboradores = [], isLoading: loadingColab } =
    trpc.colaboradores.list.useQuery(undefined, { enabled: isAuthenticated && canEdit });
  const { data: convites = [], isLoading: loadingConvites } =
    trpc.convites.list.useQuery(undefined, { enabled: isAuthenticated && canEdit });

  // Mutations
  const createConvite = trpc.convites.create.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.inviteUrl);
      utils.colaboradores.list.invalidate();
      utils.convites.list.invalidate();
      toast.success("Convite gerado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeConvite = trpc.convites.revoke.useMutation({
    onSuccess: () => { utils.convites.list.invalidate(); toast.success("Convite revogado."); },
    onError: (e) => toast.error(e.message),
  });

  const removeColab = trpc.colaboradores.remove.useMutation({
    onSuccess: () => { utils.colaboradores.list.invalidate(); setDeleteId(null); toast.success("Colaborador removido."); },
    onError: (e) => toast.error(e.message),
  });

  const toggleStatus = trpc.colaboradores.toggleStatus.useMutation({
    onSuccess: () => { utils.colaboradores.list.invalidate(); toast.success("Status atualizado."); },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.colaboradores.updateRole.useMutation({
    onSuccess: () => { utils.colaboradores.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateNome = trpc.colaboradores.updateNome.useMutation({
    onSuccess: () => { utils.colaboradores.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Handlers
  const handleGerarConvite = () => {
    if (!form.nome.trim() || !form.email.trim()) { toast.error("Preencha nome e e-mail."); return; }
    createConvite.mutate({ ...form, origin: window.location.origin });
  };

  const handleCopyLink = () => {
    if (generatedLink) { navigator.clipboard.writeText(generatedLink); toast.success("Link copiado!"); }
  };

  const handleCloseConvite = () => {
    setShowConvite(false);
    setGeneratedLink(null);
    setForm(EMPTY_FORM);
  };

  const handleOpenEdit = (c: ColabItem) => {
    setEditColab(c);
    setEditNome(c.nome);
    setEditRole(c.role);
  };

  const handleSaveEdit = async () => {
    if (!editColab) return;
    const promises: Promise<any>[] = [];
    if (editNome.trim() !== editColab.nome) {
      promises.push(updateNome.mutateAsync({ id: editColab.id, nome: editNome.trim() }));
    }
    if (editRole !== editColab.role) {
      promises.push(updateRole.mutateAsync({ id: editColab.id, role: editRole }));
    }
    if (promises.length === 0) { setEditColab(null); return; }
    try {
      await Promise.all(promises);
      toast.success("Colaborador atualizado com sucesso!");
      setEditColab(null);
    } catch {
      // erros já tratados nos onError das mutations
    }
  };

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Shield className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-sm">Esta página é exclusiva para administradores do sistema.</p>
      </div>
    );
  }

  const isSaving = updateRole.isPending || updateNome.isPending;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Colaboradores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie o acesso de colaboradores ao sistema</p>
        </div>
        <Button onClick={() => setShowConvite(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Convidar Colaborador
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground mb-1">Como funciona o acesso de colaboradores</p>
            <p className="text-muted-foreground">
              <strong>Admin</strong> — acesso total: pode visualizar, adicionar, editar, excluir e importar dados.<br />
              <strong>Colaborador</strong> — somente leitura: pode visualizar todos os dados, mas não pode fazer alterações.<br />
              Use o botão <strong>Editar</strong> para alterar o nome ou promover/rebaixar qualquer colaborador a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* Colaboradores Cadastrados */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-muted/30">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Colaboradores Cadastrados ({colaboradores.length})
          </h2>
        </div>

        {loadingColab ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : colaboradores.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhum colaborador cadastrado ainda.<br />Gere um convite para adicionar o primeiro.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(colaboradores as ColabItem[]).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {c.nome.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{c.nome}</span>
                    <RoleBadge role={c.role} />
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Mail className="w-3 h-3" />
                    {c.email}
                    {c.lastAccessAt && (
                      <span className="ml-2">
                        · Último acesso: {new Date(c.lastAccessAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Editar */}
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1.5 rounded-md border border-transparent hover:border-primary/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Editar colaborador"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Ativar / Desativar */}
                  <button
                    onClick={() => toggleStatus.mutate({ id: c.id, status: c.status === "ativo" ? "inativo" : "ativo" })}
                    className="p-1.5 rounded-md border border-transparent hover:border-primary/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title={c.status === "ativo" ? "Desativar" : "Ativar"}
                  >
                    {c.status === "ativo" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>

                  {/* Remover */}
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-1.5 rounded-md border border-transparent hover:border-destructive/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convites */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-muted/30">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Convites Enviados ({convites.length})
          </h2>
        </div>
        {loadingConvites ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : convites.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Nenhum convite enviado ainda.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(convites as any[]).map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{inv.nome}</span>
                    <RoleBadge role={inv.role} />
                    <InviteStatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <Mail className="w-3 h-3" /> {inv.email}
                    <span>· Criado: {new Date(inv.createdAt).toLocaleDateString("pt-BR")}</span>
                    <span>· Expira: {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</span>
                    {inv.criadoPor && <span>· Por: {inv.criadoPor}</span>}
                  </div>
                </div>
                {inv.status === "pendente" && (
                  <button
                    onClick={() => revokeConvite.mutate({ id: inv.id })}
                    className="p-1.5 rounded-md border border-transparent hover:border-destructive/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Revogar convite"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Editar Colaborador ── */}
      <Dialog open={!!editColab} onOpenChange={(open) => { if (!open) setEditColab(null); }}>
        <DialogContent className="sm:max-w-md border-2 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Colaborador
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Nome completo</Label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                placeholder="Nome do colaborador"
                className="border-2 bg-background"
              />
            </div>

            {/* E-mail (somente leitura) */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium text-muted-foreground">E-mail (não editável)</Label>
              <Input
                value={editColab?.email ?? ""}
                readOnly
                className="border-2 bg-muted/30 text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Perfil */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Perfil de acesso</Label>
              <Select value={editRole} onValueChange={(v: "colaborador" | "admin") => setEditRole(v)}>
                <SelectTrigger className="border-2 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">
                    <span className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" /> Colaborador (somente leitura)
                    </span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Admin (acesso total)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editRole === "colaborador"
                  ? "Pode visualizar todos os dados, mas não pode fazer alterações."
                  : "Acesso completo: visualizar, adicionar, editar e excluir dados."}
              </p>
            </div>

            {/* Aviso de promoção */}
            {editColab && editRole !== editColab.role && (
              <div className={`rounded-lg border-2 p-3 text-xs ${editRole === "admin" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"}`}>
                {editRole === "admin"
                  ? "⚠️ Este colaborador terá acesso total ao sistema, incluindo importação de dados e gestão de outros colaboradores."
                  : "ℹ️ Este colaborador passará a ter somente leitura, sem poder editar ou excluir dados."}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="border-2 w-full sm:w-auto" onClick={() => setEditColab(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editNome.trim()} className="w-full sm:w-auto gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Gerar Convite ── */}
      <Dialog open={showConvite} onOpenChange={(open) => { if (!open) handleCloseConvite(); }}>
        <DialogContent className="sm:max-w-md border-2 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="w-5 h-5 text-primary" />
              {generatedLink ? "Link de Convite Gerado" : "Convidar Colaborador"}
            </DialogTitle>
          </DialogHeader>

          {generatedLink ? (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-4">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Convite gerado com sucesso!
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Envie o link abaixo para <strong>{form.nome}</strong>. O link expira em 7 dias.
                  Após clicar no link, o colaborador precisará fazer login com o e-mail <strong>{form.email}</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <Input value={generatedLink} readOnly className="text-xs font-mono border-2 bg-muted/30" />
                  <Button size="sm" variant="outline" className="border-2 shrink-0" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseConvite} className="w-full">Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Nome completo *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="border-2 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="joao@empresa.com"
                  className="border-2 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Perfil de acesso</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="border-2 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">
                      <span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Colaborador (somente leitura)</span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Admin (acesso total)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.role === "colaborador"
                    ? "Pode visualizar todos os dados, mas não pode fazer alterações."
                    : "Acesso completo: visualizar, adicionar, editar e excluir dados."}
                </p>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="border-2 w-full sm:w-auto" onClick={handleCloseConvite}>Cancelar</Button>
                <Button onClick={handleGerarConvite} disabled={createConvite.isPending} className="w-full sm:w-auto gap-2">
                  <UserPlus className="w-4 h-4" />
                  {createConvite.isPending ? "Gerando..." : "Gerar Link de Convite"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Confirmar Remoção ── */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm border-2 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remover Colaborador</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover este colaborador? O acesso dele será revogado imediatamente.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="border-2 w-full sm:w-auto" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => deleteId && removeColab.mutate({ id: deleteId })}
              disabled={removeColab.isPending}
            >
              {removeColab.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
