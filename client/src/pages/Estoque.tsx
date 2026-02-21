import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Download, X, ChevronLeft, ChevronRight, ArrowUpDown, SlidersHorizontal, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/useMobile.tsx";

type Veiculo = {
  id: number; numero: number | null; nf: string | null; dataEmissao: string | null;
  cod: string | null; modelo: string | null; anoMod: string | null; cor: string | null;
  chassi: string | null; dataChegadaCovezi: string | null; dataAtual: string | null;
  status: "LIVRE" | "RESERVADO" | "VENDIDO"; diasEstoque: number | null; diasPatio: number | null;
  cliente: string | null; estoquesFisico: string | null; observacao: string | null;
  implemento: string | null; pneu: string | null; defletor: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'LIVRE' ? 'badge-livre' : status === 'RESERVADO' ? 'badge-reservado' : 'badge-vendido';
  return <span className={`${cls} px-2 py-0.5 rounded-full text-xs`}>{status}</span>;
}

function DiasBadge({ dias }: { dias: number | null }) {
  const d = Math.abs(dias ?? 0);
  const cls = d > 180 ? 'badge-critico' : d > 90 ? 'badge-reservado' : 'badge-livre';
  return <span className={`${cls} px-2 py-0.5 rounded-full text-xs font-mono`}>{d}</span>;
}

const EMPTY_FORM = {
  numero: '', nf: '', dataEmissao: '', cod: '', modelo: '', anoMod: '', cor: '', chassi: '',
  dataChegadaCovezi: '', dataAtual: '', status: 'LIVRE' as const, diasEstoque: '', diasPatio: '',
  cliente: '', estoquesFisico: '', observacao: '', implemento: '', pneu: '', defletor: '',
};

const TABLE_COLS = [
  { key: 'numero', label: '#', mobile: false },
  { key: 'nf', label: 'NF', mobile: true },
  { key: 'dataEmissao', label: 'Emissão', mobile: false },
  { key: 'cod', label: 'COD', mobile: false },
  { key: 'modelo', label: 'Modelo', mobile: true },
  { key: 'anoMod', label: 'Ano', mobile: false },
  { key: 'cor', label: 'Cor', mobile: false },
  { key: 'chassi', label: 'Chassi', mobile: false },
  { key: 'dataChegadaCovezi', label: 'Chegada', mobile: false },
  { key: 'status', label: 'Status', mobile: true },
  { key: 'diasEstoque', label: 'Dias Est.', mobile: true },
  { key: 'diasPatio', label: 'Dias Pátio', mobile: false },
  { key: 'cliente', label: 'Cliente', mobile: false },
  { key: 'estoquesFisico', label: 'Local', mobile: true },
  { key: 'pneu', label: 'Pneu', mobile: false },
  { key: 'implemento', label: 'Impl.', mobile: false },
];

export default function Estoque() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'TODOS', estoquesFisico: 'TODOS', cor: 'TODOS', pneu: 'TODOS', cod: 'TODOS', diasEstoqueMin: '', diasEstoqueMax: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [orderBy, setOrderBy] = useState('numero');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [editVeiculo, setEditVeiculo] = useState<Veiculo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryInput = useMemo(() => ({
    search: search || undefined,
    status: filters.status !== 'TODOS' ? filters.status : undefined,
    estoquesFisico: filters.estoquesFisico !== 'TODOS' ? filters.estoquesFisico : undefined,
    cor: filters.cor !== 'TODOS' ? filters.cor : undefined,
    pneu: filters.pneu !== 'TODOS' ? filters.pneu : undefined,
    cod: filters.cod !== 'TODOS' ? filters.cod : undefined,
    diasEstoqueMin: filters.diasEstoqueMin ? Number(filters.diasEstoqueMin) : undefined,
    diasEstoqueMax: filters.diasEstoqueMax ? Number(filters.diasEstoqueMax) : undefined,
    page, pageSize, orderBy, orderDir,
  }), [search, filters, page, pageSize, orderBy, orderDir]);

  const { data, isLoading, refetch } = trpc.veiculos.list.useQuery(queryInput);
  const { data: filtrosData } = trpc.veiculos.filtros.useQuery();
  const exportQuery = trpc.veiculos.exportAll.useQuery({ ...queryInput, pageSize: 10000, page: 1 }, { enabled: false });

  const createMutation = trpc.veiculos.create.useMutation({ onSuccess: () => { toast.success("Veículo adicionado!"); setShowForm(false); refetch(); } });
  const updateMutation = trpc.veiculos.update.useMutation({ onSuccess: () => { toast.success("Veículo atualizado!"); setEditVeiculo(null); refetch(); } });
  const deleteMutation = trpc.veiculos.delete.useMutation({ onSuccess: () => { toast.success("Veículo removido!"); setDeleteId(null); refetch(); } });

  const handleSort = (col: string) => {
    if (orderBy === col) setOrderDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(col); setOrderDir('asc'); }
    setPage(1);
  };

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return;
    const rows = result.data;
    const headers = ['#', 'NF', 'Data Emissão', 'COD', 'Modelo', 'Ano/Mod', 'Cor', 'Chassi', 'Chegada', 'Status', 'Dias Estoque', 'Dias Pátio', 'Cliente', 'Local', 'Observação', 'Implemento', 'Pneu', 'Defletor'];
    const csv = [headers.join(';'), ...rows.map((r: any) => [
      r.numero, r.nf, r.dataEmissao, r.cod, `"${r.modelo ?? ''}"`, r.anoMod, r.cor, r.chassi,
      r.dataChegadaCovezi, r.status, r.diasEstoque, r.diasPatio, `"${r.cliente ?? ''}"`,
      r.estoquesFisico, `"${r.observacao ?? ''}"`, r.implemento, r.pneu, r.defletor
    ].join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `estoque_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} registros exportados`);
  };

  const openEdit = (v: Veiculo) => {
    setEditVeiculo(v);
    setForm({ ...EMPTY_FORM, ...Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val == null ? '' : String(val)])) } as any);
  };

  const handleSubmit = () => {
    const d = {
      numero: form.numero ? Number(form.numero) : null,
      nf: form.nf || null, dataEmissao: form.dataEmissao || null, cod: form.cod || null,
      modelo: form.modelo || null, anoMod: form.anoMod || null, cor: form.cor || null,
      chassi: form.chassi || null, dataChegadaCovezi: form.dataChegadaCovezi || null,
      dataAtual: form.dataAtual || null, status: (form.status || 'LIVRE') as any,
      diasEstoque: form.diasEstoque ? Number(form.diasEstoque) : null,
      diasPatio: form.diasPatio ? Number(form.diasPatio) : null,
      cliente: form.cliente || null, estoquesFisico: form.estoquesFisico || null,
      observacao: form.observacao || null, implemento: form.implemento || null,
      pneu: form.pneu || null, defletor: form.defletor || null,
    };
    if (editVeiculo) updateMutation.mutate({ id: editVeiculo.id, data: d });
    else createMutation.mutate(d);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const veiculos = data?.data ?? [];
  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => v && v !== 'TODOS').length;

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline ${orderBy === col ? 'text-primary' : 'text-muted-foreground/40'}`} />
  );

  // Filter panel content (shared between desktop inline and mobile sheet)
  const FilterContent = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { key: 'status', label: 'Status', options: [{ v: 'TODOS', l: 'Todos' }, { v: 'LIVRE', l: 'Livre' }, { v: 'RESERVADO', l: 'Reservado' }, { v: 'VENDIDO', l: 'Vendido' }] },
        { key: 'estoquesFisico', label: 'Localização', options: [{ v: 'TODOS', l: 'Todos' }, ...(filtrosData?.locais ?? []).map(l => ({ v: l!, l: l! }))] },
        { key: 'cor', label: 'Cor', options: [{ v: 'TODOS', l: 'Todas' }, ...(filtrosData?.cores ?? []).map(c => ({ v: c!, l: c! }))] },
        { key: 'pneu', label: 'Pneu', options: [{ v: 'TODOS', l: 'Todos' }, ...(filtrosData?.pneus ?? []).map(p => ({ v: p!, l: p! }))] },
      ].map(f => (
        <div key={f.key}>
          <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">{f.label}</Label>
          <Select value={(filters as any)[f.key]} onValueChange={v => { setFilters(prev => ({ ...prev, [f.key]: v })); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs bg-background border-2 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{f.options.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ))}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Dias Mín.</Label>
        <Input type="number" placeholder="0" value={filters.diasEstoqueMin} onChange={e => { setFilters(f => ({ ...f, diasEstoqueMin: e.target.value })); setPage(1); }} className="h-9 text-xs bg-background border-2 border-border" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block font-medium">Dias Máx.</Label>
        <Input type="number" placeholder="999" value={filters.diasEstoqueMax} onChange={e => { setFilters(f => ({ ...f, diasEstoqueMax: e.target.value })); setPage(1); }} className="h-9 text-xs bg-background border-2 border-border" />
      </div>
      {activeFiltersCount > 0 && (
        <div className="col-span-2 sm:col-span-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => { setFilters({ status: 'TODOS', estoquesFisico: 'TODOS', cor: 'TODOS', pneu: 'TODOS', cod: 'TODOS', diasEstoqueMin: '', diasEstoqueMax: '' }); setPage(1); }} className="text-xs border-2">
            <X className="w-3 h-3 mr-1" /> Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Estoque Geral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} veículos encontrados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs border-2">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setEditVeiculo(null); setShowForm(true); }} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo Veículo</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Search & Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={isMobile ? "Buscar..." : "Buscar por NF, chassi, modelo, cliente..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-10 text-sm bg-card border-2 border-border"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
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
          <FilterContent />
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobile && (
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="bottom" className="rounded-t-2xl border-t-2 border-border max-h-[85vh] overflow-y-auto">
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

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border-2 border-border bg-card p-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            ))
          ) : veiculos.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhum veículo encontrado</div>
          ) : (
            veiculos.map((v: any) => (
              <div key={v.id} className="rounded-xl border-2 border-border bg-card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{v.modelo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{v.chassi}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-muted-foreground">NF:</span> <span className="text-foreground font-mono">{v.nf || '-'}</span></div>
                  <div><span className="text-muted-foreground">Ano:</span> <span className="text-foreground">{v.anoMod || '-'}</span></div>
                  <div><span className="text-muted-foreground">Local:</span> <span className="text-foreground">{v.estoquesFisico || '-'}</span></div>
                  <div><span className="text-muted-foreground">Dias:</span> <DiasBadge dias={v.diasEstoque} /></div>
                  {v.cliente && <div className="col-span-2"><span className="text-muted-foreground">Cliente:</span> <span className="text-foreground">{v.cliente}</span></div>}
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                  <button onClick={() => setLocation(`/veiculo/${v.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </button>
                  <button onClick={() => openEdit(v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => setDeleteId(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-border hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
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
                  {TABLE_COLS.map(col => (
                    <th
                      key={col.key}
                      className="text-left py-3 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                  <th className="py-3 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 17 }).map((_, j) => (
                        <td key={j} className="py-3 px-3"><div className="skeleton h-3 w-full rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : veiculos.length === 0 ? (
                  <tr><td colSpan={17} className="py-12 text-center text-muted-foreground text-sm">Nenhum veículo encontrado</td></tr>
                ) : (
                  veiculos.map((v: any) => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors group">
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">{v.numero}</td>
                      <td className="py-2.5 px-3 font-mono text-foreground font-semibold">{v.nf}</td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{v.dataEmissao ? new Date(v.dataEmissao).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">{v.cod}</td>
                      <td className="py-2.5 px-3 text-foreground max-w-[200px]"><div className="truncate font-medium" title={v.modelo ?? ''}>{v.modelo}</div></td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{v.anoMod}</td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{v.cor}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-xs whitespace-nowrap">{v.chassi}</td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{v.dataChegadaCovezi ? new Date(v.dataChegadaCovezi).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap"><StatusBadge status={v.status} /></td>
                      <td className="py-2.5 px-3 whitespace-nowrap"><DiasBadge dias={v.diasEstoque} /></td>
                      <td className="py-2.5 px-3 text-muted-foreground">{v.diasPatio}</td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-[120px]"><div className="truncate" title={v.cliente ?? ''}>{v.cliente || '-'}</div></td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{v.estoquesFisico}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{v.pneu}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{v.implemento || '-'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setLocation(`/veiculo/${v.id}`)} className="p-1.5 rounded-md border border-transparent hover:border-primary/40 hover:bg-primary/10 text-primary transition-colors" title="Ver detalhes">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded-md border border-transparent hover:border-primary/40 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded-md border border-transparent hover:border-destructive/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
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
      <Dialog open={showForm || !!editVeiculo} onOpenChange={open => { if (!open) { setShowForm(false); setEditVeiculo(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-2 border-border mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {[
              { key: 'numero', label: 'Número', type: 'number' },
              { key: 'nf', label: 'NF', type: 'text' },
              { key: 'dataEmissao', label: 'Data Emissão', type: 'date' },
              { key: 'cod', label: 'Código', type: 'text' },
              { key: 'anoMod', label: 'Ano/Mod', type: 'text' },
              { key: 'cor', label: 'Cor', type: 'text' },
              { key: 'chassi', label: 'Chassi', type: 'text' },
              { key: 'dataChegadaCovezi', label: 'Data Chegada', type: 'date' },
              { key: 'diasEstoque', label: 'Dias Estoque', type: 'number' },
              { key: 'diasPatio', label: 'Dias Pátio', type: 'number' },
              { key: 'cliente', label: 'Cliente', type: 'text' },
              { key: 'estoquesFisico', label: 'Localização', type: 'text' },
              { key: 'implemento', label: 'Implemento', type: 'text' },
              { key: 'pneu', label: 'Pneu', type: 'text' },
              { key: 'defletor', label: 'Defletor', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground mb-1 block font-medium">{f.label}</Label>
                <Input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="h-10 text-sm bg-background border-2 border-border" />
              </div>
            ))}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block font-medium">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v as any }))}>
                <SelectTrigger className="h-10 text-sm bg-background border-2 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIVRE">Livre</SelectItem>
                  <SelectItem value="RESERVADO">Reservado</SelectItem>
                  <SelectItem value="VENDIDO">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block font-medium">Modelo</Label>
              <Input value={form.modelo} onChange={e => setForm(prev => ({ ...prev, modelo: e.target.value }))} className="h-10 text-sm bg-background border-2 border-border" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block font-medium">Observação</Label>
              <Textarea value={form.observacao} onChange={e => setForm(prev => ({ ...prev, observacao: e.target.value }))} className="text-sm bg-background border-2 border-border resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="border-2 w-full sm:w-auto" onClick={() => { setShowForm(false); setEditVeiculo(null); }}>Cancelar</Button>
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
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover este veículo? Esta ação não pode ser desfeita.</p>
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
