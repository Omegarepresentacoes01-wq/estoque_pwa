import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Download, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/useMobile.tsx";
import { usePermissions } from "@/hooks/usePermissions";

const MES_ORDER: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

const MES_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FEVEREIRO: { bg: 'bg-blue-100 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-500/30' },
  MARÇO:     { bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-500/30' },
  ABRIL:     { bg: 'bg-purple-100 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-500/30' },
  MAIO:      { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-500/30' },
  JUNHO:     { bg: 'bg-rose-100 dark:bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-500/30' },
};

function MesBadge({ mes }: { mes: string | null }) {
  if (!mes) return <span className="text-muted-foreground text-xs">-</span>;
  const c = MES_COLORS[mes.toUpperCase()] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border' };
  return <span className={`${c.bg} ${c.text} border-2 ${c.border} px-2 py-0.5 rounded-full text-xs font-semibold`}>{mes}</span>;
}

const EMPTY_FORM = { pedido: '', idModelo: '', mesPrevisto: '', modelo: '', cor: '', local: '' };

export default function Programacao() {
  const isMobile = useIsMobile();
  const { canEdit } = usePermissions();
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
    const d = { pedido: form.pedido || null, idModelo: form.idModelo || null, mesPrevisto: form.mesPrevisto || null, modelo: form.modelo || null, cor: form.cor || null, local: form.local || null };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: d });
    else createMutation.mutate(d);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const items = data?.data ?? [];

  // Month summary from current page
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((item: any) => {
      const m = item.mesPrevisto ?? 'SEM MÊS';
      map[m] = (map[m] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => (MES_ORDER[a[0]] ?? 99) - (MES_ORDER[b[0]] ?? 99));
  }, [items]);

  const activeFiltersCount = Object.entries(filters).filter(([, v]) => v !== 'TODOS').length;

  const FilterContent = () => (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Mês Previsto</Label>
        <Select value={filters.mesPrevisto} onValueChange={v => { setFilters(f => ({ ...f, mesPrevisto: v })); setPage(1); }}>
          <SelectTrigger className="h-10 text-sm bg-background border-2 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            {filtrosData?.meses.map(m => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Local</Label>
        <Select value={filters.local} onValueChange={v => { setFilters(f => ({ ...f, local: v })); setPage(1); }}>
          <SelectTrigger className="h-10 text-sm bg-background border-2 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            {filtrosData?.locais.map(l => <SelectItem key={l} value={l!}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {activeFiltersCount > 0 && (
        <Button variant="outline" size="sm" className="w-full border-2" onClick={() => { setFilters({ mesPrevisto: 'TODOS', local: 'TODOS' }); setPage(1); }}>
          <X className="w-3 h-3 mr-1" /> Limpar filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Programação de Chegadas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} pedidos programados até junho 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs border-2">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); }} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Pedido</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Month Summary Pills */}
      {byMonth.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {byMonth.map(([mes, count]) => {
            const c = MES_COLORS[mes] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border' };
            const isActive = filters.mesPrevisto === mes;
            return (
              <button
                key={mes}
                onClick={() => { setFilters(f => ({ ...f, mesPrevisto: isActive ? 'TODOS' : mes })); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${isActive ? `${c.bg} ${c.text} ${c.border}` : 'bg-card border-border text-muted-foreground hover:border-border/80'}`}
              >
                {mes} <span className="font-bold ml-1">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={isMobile ? "Buscar..." : "Buscar por pedido, modelo, cor, local..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-10 text-sm bg-card border-2 border-border"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`gap-1.5 text-xs h-10 border-2 relative ${activeFiltersCount > 0 ? 'border-primary text-primary bg-primary/5' : ''}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Desktop Filter Panel */}
      {!isMobile && showFilters && (
        <div className="rounded-xl border-2 border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Mês Previsto</Label>
              <Select value={filters.mesPrevisto} onValueChange={v => { setFilters(f => ({ ...f, mesPrevisto: v })); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs bg-background border-2 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {filtrosData?.meses.map(m => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Local</Label>
              <Select value={filters.local} onValueChange={v => { setFilters(f => ({ ...f, local: v })); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs bg-background border-2 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {filtrosData?.locais.map(l => <SelectItem key={l} value={l!}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobile && (
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="bottom" className="rounded-t-2xl border-t-2 border-border">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-foreground">Filtros</SheetTitle>
            </SheetHeader>
            <FilterContent />
            <div className="mt-4 pb-2">
              <Button className="w-full" onClick={() => setShowFilters(false)}>Aplicar Filtros</Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile Cards */}
      {isMobile ? (
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border-2 border-border bg-card p-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhum registro encontrado</div>
          ) : (
            items.map((item: any) => (
              <div key={item.id} className="rounded-xl border-2 border-border bg-card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{item.modelo}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.pedido}</p>
                  </div>
                  <MesBadge mes={item.mesPrevisto} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground font-mono">{item.idModelo || '-'}</span></div>
                  <div><span className="text-muted-foreground">Cor:</span> <span className="text-foreground">{item.cor || '-'}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Local:</span> <span className="text-foreground">{item.local || '-'}</span></div>
                </div>
                {canEdit && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                    <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Desktop Table */
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-border table-header-light">
                  {['Pedido', 'ID', 'Mês Previsto', 'Modelo', 'Cor', 'Local'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                  <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="py-3 px-3"><div className="skeleton h-3 w-full rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Nenhum registro encontrado</td></tr>
                ) : (
                  items.map((item: any) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors group">
                      <td className="py-2.5 px-3 font-mono text-foreground font-semibold">{item.pedido}</td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">{item.idModelo}</td>
                      <td className="py-2.5 px-3"><MesBadge mes={item.mesPrevisto} /></td>
                      <td className="py-2.5 px-3 text-foreground max-w-[280px]"><div className="truncate font-medium" title={item.modelo ?? ''}>{item.modelo}</div></td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{item.cor}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{item.local}</td>
                      <td className="py-2.5 px-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-md border border-transparent hover:border-primary/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-md border border-transparent hover:border-destructive/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t-2 border-border">
            <span className="text-xs text-muted-foreground font-medium">
              {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md border-2 border-border hover:bg-accent disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground px-2 font-medium">{page} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-md border-2 border-border hover:bg-accent disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Pagination */}
      {isMobile && total > pageSize && (
        <div className="flex items-center justify-between px-1 py-2">
          <span className="text-xs text-muted-foreground">{Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-9 w-9 flex items-center justify-center rounded-lg border-2 border-border hover:bg-accent disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-xs font-medium text-muted-foreground">{page}/{totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-9 w-9 flex items-center justify-center rounded-lg border-2 border-border hover:bg-accent disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm || !!editItem} onOpenChange={open => { if (!open) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg bg-card border-2 border-border mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editItem ? 'Editar Programação' : 'Nova Programação'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {[
              { key: 'pedido', label: 'Pedido' },
              { key: 'idModelo', label: 'ID Modelo' },
              { key: 'cor', label: 'Cor' },
              { key: 'local', label: 'Local' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground mb-1 block font-medium">{f.label}</Label>
                <Input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="h-10 text-sm bg-background border-2 border-border" />
              </div>
            ))}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block font-medium">Mês Previsto</Label>
              <Select value={form.mesPrevisto} onValueChange={v => setForm(prev => ({ ...prev, mesPrevisto: v }))}>
                <SelectTrigger className="h-10 text-sm bg-background border-2 border-border"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {['FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block font-medium">Modelo</Label>
              <Input value={form.modelo} onChange={e => setForm(prev => ({ ...prev, modelo: e.target.value }))} className="h-10 text-sm bg-background border-2 border-border" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="border-2 w-full sm:w-auto" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm bg-card border-2 border-border mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja remover este registro de programação?</p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="border-2 w-full sm:w-auto" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" className="w-full sm:w-auto" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
