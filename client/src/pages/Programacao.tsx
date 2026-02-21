import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Download, X, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const MES_ORDER: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

function MesBadge({ mes }: { mes: string | null }) {
  if (!mes) return <span className="text-muted-foreground">-</span>;
  const colors: Record<string, string> = {
    FEVEREIRO: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    MARÇO: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    ABRIL: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    MAIO: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    JUNHO: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  };
  const cls = colors[mes.toUpperCase()] ?? 'bg-muted/50 text-muted-foreground border-border/50';
  return <span className={`${cls} border px-2 py-0.5 rounded-full text-xs font-semibold`}>{mes}</span>;
}

const EMPTY_FORM = { pedido: '', idModelo: '', mesPrevisto: '', modelo: '', cor: '', local: '' };

export default function Programacao() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ mesPrevisto: 'TODOS', local: 'TODOS' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryInput = useMemo(() => ({
    search: search || undefined,
    mesPrevisto: filters.mesPrevisto !== 'TODOS' ? filters.mesPrevisto : undefined,
    local: filters.local !== 'TODOS' ? filters.local : undefined,
    page, pageSize,
  }), [search, filters, page, pageSize]);

  const { data, isLoading, refetch } = trpc.programacao.list.useQuery(queryInput);
  const { data: filtrosData } = trpc.programacao.filtros.useQuery();
  const exportQuery = trpc.programacao.exportAll.useQuery({ ...queryInput, pageSize: 10000, page: 1 }, { enabled: false });

  const createMutation = trpc.programacao.create.useMutation({ onSuccess: () => { toast.success("Programação adicionada!"); setShowForm(false); refetch(); } });
  const updateMutation = trpc.programacao.update.useMutation({ onSuccess: () => { toast.success("Programação atualizada!"); setEditItem(null); refetch(); } });
  const deleteMutation = trpc.programacao.delete.useMutation({ onSuccess: () => { toast.success("Registro removido!"); setDeleteId(null); refetch(); } });

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const rows = result.data;
    const headers = ['Pedido', 'ID', 'Mês Previsto', 'Modelo', 'Cor', 'Local'];
    const csv = [headers.join(';'), ...rows.map((r: any) => [r.pedido, r.idModelo, r.mesPrevisto, `"${r.modelo ?? ''}"`, r.cor, r.local].join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `programacao_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} registros exportados`);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ pedido: item.pedido ?? '', idModelo: item.idModelo ?? '', mesPrevisto: item.mesPrevisto ?? '', modelo: item.modelo ?? '', cor: item.cor ?? '', local: item.local ?? '' });
  };

  const handleSubmit = () => {
    const data = { pedido: form.pedido || null, idModelo: form.idModelo || null, mesPrevisto: form.mesPrevisto || null, modelo: form.modelo || null, cor: form.cor || null, local: form.local || null };
    if (editItem) updateMutation.mutate({ id: editItem.id, data });
    else createMutation.mutate(data);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const items = data?.data ?? [];

  // Group by month for summary
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item: any) => {
      const m = item.mesPrevisto ?? 'SEM MÊS';
      map[m] = (map[m] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => (MES_ORDER[a[0]] ?? 99) - (MES_ORDER[b[0]] ?? 99));
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programação de Chegadas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} pedidos programados até junho 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); }} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* Month Summary Cards */}
      {byMonth.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {byMonth.map(([mes, count]) => (
            <button
              key={mes}
              onClick={() => { setFilters(f => ({ ...f, mesPrevisto: filters.mesPrevisto === mes ? 'TODOS' : mes })); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filters.mesPrevisto === mes ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-card border-border/50 text-muted-foreground hover:border-border'}`}
            >
              {mes} <span className="ml-1 font-bold">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por pedido, modelo, cor, local..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm bg-card border-border/50"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`gap-1.5 text-xs h-9 ${showFilters ? 'border-primary text-primary' : ''}`}>
          <Filter className="w-3.5 h-3.5" /> Filtros
        </Button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-border/50 bg-card p-4 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Mês Previsto</Label>
            <Select value={filters.mesPrevisto} onValueChange={v => { setFilters(f => ({ ...f, mesPrevisto: v })); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs bg-background border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {filtrosData?.meses.map(m => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Local</Label>
            <Select value={filters.local} onValueChange={v => { setFilters(f => ({ ...f, local: v })); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs bg-background border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {filtrosData?.locais.map(l => <SelectItem key={l} value={l!}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50" style={{ background: 'oklch(0.14 0.02 250)' }}>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedido</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mês Previsto</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelo</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cor</th>
                <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Local</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="py-3 px-3"><div className="skeleton h-3 w-full rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Nenhum registro encontrado</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/30 hover:bg-accent/20 transition-colors group">
                    <td className="py-2.5 px-3 font-mono text-foreground font-semibold">{item.pedido}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono">{item.idModelo}</td>
                    <td className="py-2.5 px-3"><MesBadge mes={item.mesPrevisto} /></td>
                    <td className="py-2.5 px-3 text-foreground max-w-[280px]"><div className="truncate" title={item.modelo ?? ''}>{item.modelo}</div></td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{item.cor}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{item.local}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md hover:bg-accent disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground px-2">{page} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-md hover:bg-accent disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm || !!editItem} onOpenChange={open => { if (!open) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editItem ? 'Editar Programação' : 'Nova Programação'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              { key: 'pedido', label: 'Pedido' },
              { key: 'idModelo', label: 'ID Modelo' },
              { key: 'cor', label: 'Cor' },
              { key: 'local', label: 'Local' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground mb-1 block">{f.label}</Label>
                <Input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="h-8 text-xs bg-background border-border/50" />
              </div>
            ))}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Mês Previsto</Label>
              <Select value={form.mesPrevisto} onValueChange={v => setForm(prev => ({ ...prev, mesPrevisto: v }))}>
                <SelectTrigger className="h-8 text-xs bg-background border-border/50"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {['FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Modelo</Label>
              <Input value={form.modelo} onChange={e => setForm(prev => ({ ...prev, modelo: e.target.value }))} className="h-8 text-xs bg-background border-border/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja remover este registro de programação?</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
