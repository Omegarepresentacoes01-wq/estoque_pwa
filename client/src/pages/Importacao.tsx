import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type ImportResult = {
  veiculos: { imported: number; skipped: number; errors: string[] };
  programacao: { imported: number };
};

type ParsedData = {
  veiculos: any[];
  programacao: any[];
  warnings: string[];
};

const safeStr = (v: any, max?: number): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  return max ? s.slice(0, max) : s;
};

const safeInt = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
};

const safeDate = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(v).trim();
  if (!s || s === 'null') return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const safeStatus = (v: any): 'LIVRE' | 'RESERVADO' | 'VENDIDO' => {
  const s = safeStr(v);
  if (!s) return 'LIVRE';
  const u = s.toUpperCase();
  if (u.includes('RESERVADO')) return 'RESERVADO';
  if (u.includes('VENDIDO')) return 'VENDIDO';
  return 'LIVRE';
};

function parseExcel(buffer: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buffer, { type: 'array' });
  const warnings: string[] = [];
  const veiculosList: any[] = [];
  const programacaoList: any[] = [];

  // Parse ESTOQUE GERAL
  const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase().includes('ESTOQUE GERAL'));
  if (sheetName) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];
    let headerIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]?.some((c: any) => String(c ?? '').trim() === 'NF')) { headerIdx = i; break; }
    }
    if (headerIdx === -1) { warnings.push('Cabeçalho da aba ESTOQUE GERAL não encontrado'); }
    else {
      for (let i = headerIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.every((c: any) => c === null || c === undefined || String(c).trim() === '')) continue;
        const num = safeInt(row[0]);
        if (num === null) continue;
        veiculosList.push({
          numero: num, nf: safeStr(row[1], 32), dataEmissao: safeDate(row[2]),
          cod: safeStr(row[3], 32), modelo: safeStr(row[4]), anoMod: safeStr(row[5], 16),
          cor: safeStr(row[6], 64), chassi: safeStr(row[7], 32), dataChegadaCovezi: safeDate(row[8]),
          dataAtual: safeDate(row[9]), status: safeStatus(row[10]),
          diasEstoque: safeInt(row[11]), diasPatio: safeInt(row[12]),
          cliente: safeStr(row[13], 256), estoquesFisico: safeStr(row[14], 128),
          observacao: safeStr(row[15]), implemento: safeStr(row[16], 128),
          pneu: safeStr(row[17], 64), defletor: safeStr(row[18], 64),
        });
      }
    }
  } else {
    warnings.push('Aba ESTOQUE GERAL não encontrada');
  }

  // Parse PROGRAMAÇÃO
  const progName = wb.SheetNames.find(n => n.toUpperCase().includes('PROGRAMA'));
  if (progName) {
    const ws2 = wb.Sheets[progName];
    const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: null }) as any[][];
    let hIdx2 = -1;
    for (let i = 0; i < raw2.length; i++) {
      if (raw2[i]?.some((c: any) => String(c ?? '').trim() === 'PEDIDO')) { hIdx2 = i; break; }
    }
    if (hIdx2 === -1) { warnings.push('Cabeçalho da aba PROGRAMAÇÃO não encontrado'); }
    else {
      for (let i = hIdx2 + 1; i < raw2.length; i++) {
        const row = raw2[i];
        if (!row || row.every((c: any) => c === null || c === undefined || String(c).trim() === '')) continue;
        const pedido = safeStr(row[0], 32);
        if (!pedido) continue;
        programacaoList.push({
          pedido, idModelo: safeStr(row[1], 32), mesPrevisto: safeStr(row[2], 32),
          modelo: safeStr(row[3]), cor: safeStr(row[4], 64), local: safeStr(row[5], 128),
        });
      }
    }
  } else {
    warnings.push('Aba PROGRAMAÇÃO não encontrada');
  }

  return { veiculos: veiculosList, programacao: programacaoList, warnings };
}

export default function Importacao() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = trpc.importacao.processarExcel.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Importação concluída: ${data.veiculos.imported} veículos, ${data.programacao.imported} programações`);
    },
    onError: (e) => toast.error(`Erro na importação: ${e.message}`),
  });

  const handleFile = async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) { toast.error('Apenas arquivos .xlsx ou .xls são aceitos'); return; }
    setFile(f);
    setResult(null);
    setIsProcessing(true);
    try {
      const buffer = await f.arrayBuffer();
      const data = parseExcel(buffer);
      setParsed(data);
    } catch (e: any) {
      toast.error(`Erro ao ler arquivo: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = () => {
    if (!parsed) return;
    importMutation.mutate({ veiculos: parsed.veiculos, programacao: parsed.programacao, modo: 'adicionar' });
  };

  const reset = () => { setFile(null); setParsed(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importação de Planilha</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Faça upload de uma planilha Excel para atualizar o banco de dados em lote</p>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border-2 border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Formato esperado</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1.5">Aba: ESTOQUE GERAL</p>
            <p>Colunas: #, NF, Data Emissão, COD, Modelo, Ano/Mod, Cor, Chassi, Data Chegada, Data Atual, Status, Dias Estoque, Dias Pátio, Cliente, Local, Observação, Implemento, Pneu, Defletor</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1.5">Aba: PROGRAMAÇÃO</p>
            <p>Colunas: PEDIDO, ID, MÊS PREVISTO, MODELO, COR, LOCAL</p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      {!file && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 sm:p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'}`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary/20' : 'bg-muted/50'}`}>
            <Upload className={`w-7 h-7 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Arraste o arquivo aqui ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">Suporta .xlsx e .xls</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {/* File Selected */}
      {file && !result && (
        <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processando arquivo...
            </div>
          )}

          {parsed && !isProcessing && (
            <>
              {/* Warnings */}
              {parsed.warnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Avisos</span>
                  </div>
                  {parsed.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600 dark:text-amber-300/80">{w}</p>)}
                </div>
              )}

              {/* Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{parsed.veiculos.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Veículos encontrados</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{parsed.programacao.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Programações encontradas</div>
                </div>
              </div>

              {/* Preview Table */}
              {parsed.veiculos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Prévia (primeiros 5 veículos)</p>
                    <div className="rounded-lg overflow-hidden border-2 border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="table-header-light border-b-2 border-border">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">NF</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Modelo</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Local</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.veiculos.slice(0, 5).map((v, i) => (
                          <tr key={i} className="border-t border-border/20">
                            <td className="py-2 px-3 text-muted-foreground">{v.numero}</td>
                            <td className="py-2 px-3 text-foreground">{v.nf}</td>
                            <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{v.modelo?.slice(0, 40)}</td>
                            <td className="py-2 px-3"><span className={v.status === 'LIVRE' ? 'badge-livre' : 'badge-reservado' + ' px-1.5 py-0.5 rounded text-xs'}>{v.status}</span></td>
                            <td className="py-2 px-3 text-muted-foreground">{v.estoquesFisico}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset} className="flex-1 border-2">Cancelar</Button>
                <Button size="sm" onClick={handleImport} disabled={importMutation.isPending} className="flex-1 gap-1.5">
                  {importMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importando...</> : <><Upload className="w-3.5 h-3.5" /> Importar Dados</>}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Importação Concluída!</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.veiculos.imported}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Veículos importados</div>
            </div>
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/20 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.programacao.imported}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Programações importadas</div>
            </div>
          </div>
          {result.veiculos.skipped > 0 && (
            <p className="text-xs text-amber-400">{result.veiculos.skipped} registros ignorados (duplicatas ou erros)</p>
          )}
          {result.veiculos.errors.length > 0 && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive mb-1">Erros encontrados:</p>
              {result.veiculos.errors.map((e, i) => <p key={i} className="text-xs text-destructive/80">{e}</p>)}
            </div>
          )}
          <Button size="sm" onClick={reset} className="w-full">Nova Importação</Button>
        </div>
      )}
    </div>
  );
}
