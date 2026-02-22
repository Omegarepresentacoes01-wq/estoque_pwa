import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile.tsx";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileText,
  Hash,
  History,
  Loader2,
  MapPin,
  Package,
  Tag,
  Truck,
  User,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { gerarPDFVeiculo } from "@/lib/pdfVeiculo";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(val: string | Date | null | undefined) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("pt-BR");
  } catch {
    return String(val);
  }
}

function formatDatetime(val: string | Date | null | undefined) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString("pt-BR");
  } catch {
    return String(val);
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "LIVRE")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-semibold">
        LIVRE
      </Badge>
    );
  if (status === "RESERVADO")
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 font-semibold">
        RESERVADO
      </Badge>
    );
  return (
    <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/30 font-semibold">
      VENDIDO
    </Badge>
  );
}

function DiasTag({ dias }: { dias: number | null | undefined }) {
  if (dias == null) return <span className="text-muted-foreground">—</span>;
  const abs = Math.abs(dias);
  const color =
    abs > 180
      ? "text-destructive font-bold"
      : abs > 90
      ? "text-amber-600 font-semibold"
      : "text-foreground";
  return <span className={color}>{abs} dias</span>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium mt-0.5 break-words">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

// ─── Ícone de tipo de evento ─────────────────────────────────────────────────

function EventIcon({ tipo }: { tipo: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    status_change: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
    cliente_change: { icon: User, color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" },
    localizacao_change: { icon: MapPin, color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/30" },
    campo_change: { icon: Edit3, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
    criado: { icon: Package, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
    editado: { icon: Edit3, color: "text-muted-foreground", bg: "bg-muted border-border" },
  };
  const cfg = map[tipo] ?? map.editado;
  const Ic = cfg.icon;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${cfg.bg}`}>
      <Ic className={`w-4 h-4 ${cfg.color}`} />
    </div>
  );
}

function tipoLabel(tipo: string, campo?: string | null) {
  if (tipo === "status_change") return "Status alterado";
  if (tipo === "cliente_change") return "Cliente alterado";
  if (tipo === "localizacao_change") return "Localização alterada";
  if (tipo === "campo_change" && campo) {
    const labels: Record<string, string> = {
      observacao: "Observação atualizada",
      implemento: "Implemento atualizado",
      pneu: "Pneu atualizado",
      defletor: "Defletor atualizado",
      diasEstoque: "Dias de estoque atualizados",
      diasPatio: "Dias de pátio atualizados",
      cor: "Cor atualizada",
      anoMod: "Ano/Mod atualizado",
      dataChegadaCovezi: "Data de chegada atualizada",
      dataAtual: "Data atual atualizada",
    };
    return labels[campo] ?? `Campo "${campo}" alterado`;
  }
  if (tipo === "criado") return "Veículo cadastrado";
  return "Registro editado";
}

// ─── Modal de edição rápida ──────────────────────────────────────────────────

function EditModal({
  veiculo,
  open,
  onClose,
  onSaved,
}: {
  veiculo: any;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    status: veiculo.status ?? "LIVRE",
    cliente: veiculo.cliente ?? "",
    estoquesFisico: veiculo.estoquesFisico ?? "",
    observacao: veiculo.observacao ?? "",
    implemento: veiculo.implemento ?? "",
    pneu: veiculo.pneu ?? "",
    defletor: veiculo.defletor ?? "",
    diasEstoque: veiculo.diasEstoque ?? "",
    diasPatio: veiculo.diasPatio ?? "",
  });

  const updateMutation = trpc.veiculos.update.useMutation({
    onSuccess: () => {
      utils.veiculos.getById.invalidate({ id: veiculo.id });
      utils.veiculos.historico.invalidate({ id: veiculo.id });
      utils.veiculos.list.invalidate();
      toast.success("Veículo atualizado com sucesso!");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: veiculo.id,
      data: {
        status: form.status as any,
        cliente: form.cliente || null,
        estoquesFisico: form.estoquesFisico || null,
        observacao: form.observacao || null,
        implemento: form.implemento || null,
        pneu: form.pneu || null,
        defletor: form.defletor || null,
        diasEstoque: form.diasEstoque ? Number(form.diasEstoque) : null,
        diasPatio: form.diasPatio ? Number(form.diasPatio) : null,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-2 border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            Editar Veículo
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIVRE">LIVRE</SelectItem>
                <SelectItem value="RESERVADO">RESERVADO</SelectItem>
                <SelectItem value="VENDIDO">VENDIDO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Cliente</Label>
            <Input
              className="border-2"
              value={form.cliente}
              onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Localização Física</Label>
            <Input
              className="border-2"
              value={form.estoquesFisico}
              onChange={(e) => setForm((f) => ({ ...f, estoquesFisico: e.target.value }))}
              placeholder="Ex: PÁTIO APARECIDA"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Dias de Estoque</Label>
              <Input
                className="border-2"
                type="number"
                value={form.diasEstoque}
                onChange={(e) => setForm((f) => ({ ...f, diasEstoque: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Dias de Pátio</Label>
              <Input
                className="border-2"
                type="number"
                value={form.diasPatio}
                onChange={(e) => setForm((f) => ({ ...f, diasPatio: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Pneu</Label>
            <Input
              className="border-2"
              value={form.pneu}
              onChange={(e) => setForm((f) => ({ ...f, pneu: e.target.value }))}
              placeholder="Ex: PIRELLI"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Implemento</Label>
            <Input
              className="border-2"
              value={form.implemento}
              onChange={(e) => setForm((f) => ({ ...f, implemento: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Defletor</Label>
            <Input
              className="border-2"
              value={form.defletor}
              onChange={(e) => setForm((f) => ({ ...f, defletor: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Observação</Label>
            <Textarea
              className="border-2 min-h-[80px]"
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              placeholder="Observações adicionais..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-2">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function VeiculoDetalhe() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [editOpen, setEditOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { user } = useAuth();

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await gerarPDFVeiculo(veiculo, historico);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setPdfLoading(false);
    }
  };

  const {
    data: veiculo,
    isLoading,
    error,
    refetch,
  } = trpc.veiculos.getById.useQuery({ id }, { enabled: !!id });

  const { data: historico = [], refetch: refetchHistorico } =
    trpc.veiculos.historico.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !veiculo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Veículo não encontrado.</p>
        <Button variant="outline" onClick={() => setLocation("/estoque")} className="border-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Estoque
        </Button>
      </div>
    );
  }

  const diasAbs = Math.abs(veiculo.diasEstoque ?? 0);
  const isCritico = diasAbs > 180;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/estoque")}
          className="border-2 shrink-0 mt-0.5"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {!isMobile && "Voltar"}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {veiculo.modelo ?? "Veículo sem modelo"}
            </h1>
            <StatusBadge status={veiculo.status} />
            {isCritico && (
              <Badge className="bg-destructive/15 text-destructive border border-destructive/30 font-semibold">
                <AlertTriangle className="w-3 h-3 mr-1" />
                CRÍTICO
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Chassi: <span className="font-mono font-semibold text-foreground">{veiculo.chassi ?? "—"}</span>
            {veiculo.nf && (
              <> &nbsp;·&nbsp; NF: <span className="font-semibold text-foreground">{veiculo.nf}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="border-2"
          >
            {pdfLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            {!isMobile && (pdfLoading ? "Gerando..." : "PDF")}
          </Button>
          <Button
            onClick={() => setEditOpen(true)}
            size="sm"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            {!isMobile && "Editar"}
          </Button>
        </div>
      </div>

      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Dias em Estoque",
            value: <DiasTag dias={veiculo.diasEstoque} />,
            icon: Clock,
            alert: isCritico,
          },
          {
            label: "Dias de Pátio",
            value: <DiasTag dias={veiculo.diasPatio} />,
            icon: MapPin,
            alert: false,
          },
          {
            label: "Ano/Modelo",
            value: veiculo.anoMod ?? "—",
            icon: Calendar,
            alert: false,
          },
          {
            label: "Código",
            value: veiculo.cod ?? "—",
            icon: Hash,
            alert: false,
          },
        ].map((m) => (
          <Card
            key={m.label}
            className={`border-2 ${m.alert ? "border-destructive/40 bg-destructive/5" : "border-border"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <m.icon
                  className={`w-4 h-4 ${m.alert ? "text-destructive" : "text-muted-foreground"}`}
                />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {m.label}
                </span>
              </div>
              <p className={`text-lg font-bold ${m.alert ? "text-destructive" : "text-foreground"}`}>
                {m.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Grid de informações ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identificação */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4">
            <InfoRow icon={Hash} label="NF" value={veiculo.nf} />
            <InfoRow icon={Calendar} label="Data de Emissão" value={formatDate(veiculo.dataEmissao)} />
            <InfoRow icon={Tag} label="Código" value={veiculo.cod} />
            <InfoRow icon={Truck} label="Modelo" value={veiculo.modelo} />
            <InfoRow icon={Calendar} label="Ano/Modelo" value={veiculo.anoMod} />
            <InfoRow icon={Tag} label="Cor" value={veiculo.cor} />
            <InfoRow icon={Hash} label="Chassi" value={<span className="font-mono">{veiculo.chassi}</span>} />
          </CardContent>
        </Card>

        {/* Localização e Datas */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Localização e Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4">
            <InfoRow icon={MapPin} label="Estoque Físico" value={veiculo.estoquesFisico} />
            <InfoRow icon={Calendar} label="Chegada COVEZI" value={formatDate(veiculo.dataChegadaCovezi)} />
            <InfoRow icon={Calendar} label="Data Atual" value={formatDate(veiculo.dataAtual)} />
            <InfoRow icon={Clock} label="Dias em Estoque" value={<DiasTag dias={veiculo.diasEstoque} />} />
            <InfoRow icon={Clock} label="Dias de Pátio" value={<DiasTag dias={veiculo.diasPatio} />} />
          </CardContent>
        </Card>

        {/* Status e Comercial */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Status e Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4">
            <InfoRow icon={CheckCircle2} label="Status" value={<StatusBadge status={veiculo.status} />} />
            <InfoRow icon={User} label="Cliente" value={veiculo.cliente} />
            <InfoRow icon={FileText} label="Observação" value={veiculo.observacao} />
          </CardContent>
        </Card>

        {/* Equipamentos */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4">
            <InfoRow icon={Wrench} label="Implemento" value={veiculo.implemento} />
            <InfoRow icon={Package} label="Pneu" value={veiculo.pneu} />
            <InfoRow icon={Wrench} label="Defletor" value={veiculo.defletor} />
          </CardContent>
        </Card>
      </div>

      {/* ── Histórico de alterações ── */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de Alterações
            {historico.length > 0 && (
              <Badge variant="secondary" className="ml-auto font-semibold">
                {historico.length} {historico.length === 1 ? "registro" : "registros"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <History className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Nenhuma alteração registrada ainda.
              </p>
              <p className="text-xs text-muted-foreground">
                As alterações feitas a partir de agora aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-0">
                {historico.map((entry, idx) => (
                  <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Ícone do evento */}
                    <div className="relative z-10 shrink-0">
                      <EventIcon tipo={entry.tipo} />
                    </div>
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {tipoLabel(entry.tipo, entry.campo)}
                        </span>
                        {entry.usuarioNome && (
                          <span className="text-xs text-muted-foreground">
                            por <span className="font-medium text-foreground">{entry.usuarioNome}</span>
                          </span>
                        )}
                      </div>
                      {/* Mudança de valor */}
                      {(entry.valorAnterior || entry.valorNovo) && (
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {entry.valorAnterior != null && entry.valorAnterior !== "" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-destructive/10 text-destructive border border-destructive/20 line-through">
                              {entry.valorAnterior}
                            </span>
                          )}
                          {entry.valorAnterior != null && entry.valorNovo != null && (
                            <span className="text-muted-foreground text-xs">→</span>
                          )}
                          {entry.valorNovo != null && entry.valorNovo !== "" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                              {entry.valorNovo}
                            </span>
                          )}
                        </div>
                      )}
                      {entry.observacao && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">
                          {entry.observacao}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDatetime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edição */}
      {editOpen && (
        <EditModal
          veiculo={veiculo}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            refetch();
            refetchHistorico();
          }}
        />
      )}
    </div>
  );
}
