import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, Car, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";

const COLORS = [
  "oklch(0.55 0.18 220)",
  "oklch(0.55 0.16 160)",
  "oklch(0.58 0.17 80)",
  "oklch(0.52 0.18 300)",
  "oklch(0.55 0.20 25)",
  "oklch(0.54 0.16 260)",
  "oklch(0.56 0.14 140)",
  "oklch(0.52 0.18 200)",
];

function StatCard({ icon: Icon, label, value, sub, colorClass, bgClass, borderClass }: {
  icon: any; label: string; value: string | number; sub?: string;
  colorClass: string; bgClass: string; borderClass: string;
}) {
  return (
    <div className={`rounded-xl border-2 ${borderClass} bg-card p-4 flex flex-col gap-2.5 hover:shadow-md transition-all`}>
      <div className={`w-9 h-9 rounded-lg ${bgClass} border ${borderClass} flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${colorClass}`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-4 flex flex-col gap-2.5">
      <div className="skeleton h-9 w-9 rounded-lg" />
      <div className="skeleton h-7 w-20 rounded" />
      <div className="skeleton h-3 w-28 rounded" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border-2 border-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.fill || p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const notificarMutation = trpc.notificacoes.verificarCriticos.useMutation({
    onSuccess: (data) => {
      if (data.notificados > 0) toast.success(`${data.notificados} veículo(s) crítico(s) notificados ao proprietário`);
      else toast.info("Nenhum veículo crítico pendente de notificação");
    },
  });

  const totais = stats?.totais;
  const porLocal = (stats?.porLocal ?? []).filter(r => r.local).map(r => ({ name: r.local!, value: Number(r.count) }));
  const porCor = (stats?.porCor ?? []).filter(r => r.cor).map(r => ({ name: r.cor!, value: Number(r.count) }));
  const porPneu = (stats?.porPneu ?? []).filter(r => r.pneu).map(r => ({ name: r.pneu!, value: Number(r.count) }));

  const statusData = [
    { name: "Livre",     value: Number(totais?.livres ?? 0),     color: "oklch(0.55 0.16 160)" },
    { name: "Reservado", value: Number(totais?.reservados ?? 0), color: "oklch(0.58 0.17 80)" },
    { name: "Vendido",   value: Number(totais?.vendidos ?? 0),   color: "oklch(0.52 0.04 250)" },
  ];

  const statCards = [
    { icon: Car,           label: "Total em Estoque",    value: Number(totais?.total ?? 0),                              colorClass: "text-blue-600 dark:text-blue-400",    bgClass: "bg-blue-50 dark:bg-blue-400/10",    borderClass: "border-blue-200 dark:border-blue-500/20" },
    { icon: CheckCircle,   label: "Livres",              value: Number(totais?.livres ?? 0),                             colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-400/10", borderClass: "border-emerald-200 dark:border-emerald-500/20" },
    { icon: Clock,         label: "Reservados",          value: Number(totais?.reservados ?? 0),                         colorClass: "text-amber-600 dark:text-amber-400",  bgClass: "bg-amber-50 dark:bg-amber-400/10",  borderClass: "border-amber-200 dark:border-amber-500/20" },
    { icon: AlertTriangle, label: "Críticos (+180 dias)",value: Number(totais?.criticos ?? 0),                           colorClass: "text-red-600 dark:text-red-400",      bgClass: "bg-red-50 dark:bg-red-400/10",      borderClass: "border-red-200 dark:border-red-500/20" },
    { icon: TrendingUp,    label: "Dias Médios Estoque", value: Math.round(Number(totais?.diasMedioEstoque ?? 0)), sub: "média geral", colorClass: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-50 dark:bg-purple-400/10", borderClass: "border-purple-200 dark:border-purple-500/20" },
    { icon: BarChart3,     label: "Dias Médios Pátio",   value: Math.round(Number(totais?.diasMedioPatio ?? 0)),   sub: "média geral", colorClass: "text-sky-600 dark:text-sky-400",      bgClass: "bg-sky-50 dark:bg-sky-400/10",      borderClass: "border-sky-200 dark:border-sky-500/20" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do estoque de veículos</p>
        </div>
        <button
          onClick={() => notificarMutation.mutate()}
          disabled={notificarMutation.isPending}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-500/30 hover:bg-amber-500/20 transition-colors disabled:opacity-50 font-medium"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {notificarMutation.isPending ? "Verificando..." : "Verificar Críticos"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((c, i) => <StatCard key={i} {...c} />)
        }
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Pie */}
        <div className="rounded-xl border-2 border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Status do Estoque</h3>
          {isLoading ? (
            <div className="skeleton h-44 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs text-muted-foreground font-medium">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por Local Bar */}
        <div className="rounded-xl border-2 border-border bg-card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">Veículos por Localização</h3>
          {isLoading ? (
            <div className="skeleton h-44 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porLocal.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Veículos" fill="oklch(0.55 0.18 220)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por Cor */}
        <div className="rounded-xl border-2 border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição por Cor</h3>
          {isLoading ? (
            <div className="skeleton h-44 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={porCor.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Veículos" fill="oklch(0.55 0.16 160)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por Pneu */}
        <div className="rounded-xl border-2 border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição por Marca de Pneu</h3>
          {isLoading ? (
            <div className="skeleton h-44 w-full rounded-lg" />
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={porPneu}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (percent < 0.05) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {porPneu.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legenda customizada abaixo do gráfico */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                {porPneu.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-muted-foreground font-medium">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Veículos Críticos */}
      {stats?.criticos && stats.criticos.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Veículos Críticos (+180 dias em estoque)
            </h3>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="border-b-2 border-amber-200 dark:border-amber-500/20">
                  <th className="text-left py-2 px-2 text-amber-700 dark:text-amber-400/80 font-semibold">Modelo</th>
                  <th className="text-left py-2 px-2 text-amber-700 dark:text-amber-400/80 font-semibold hidden sm:table-cell">Chassi</th>
                  <th className="text-left py-2 px-2 text-amber-700 dark:text-amber-400/80 font-semibold">Localização</th>
                  <th className="text-right py-2 px-2 text-amber-700 dark:text-amber-400/80 font-semibold">Dias</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticos.map((v) => (
                  <tr key={v.id} className="border-b border-amber-200/60 dark:border-amber-500/10 last:border-0">
                    <td className="py-2 px-2 text-foreground max-w-[160px] truncate font-medium">{v.modelo?.slice(0, 35)}</td>
                    <td className="py-2 px-2 text-muted-foreground font-mono hidden sm:table-cell">{v.chassi}</td>
                    <td className="py-2 px-2 text-muted-foreground">{v.estoquesFisico}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="badge-critico px-2 py-0.5 rounded-full text-xs">{Math.abs(v.diasEstoque ?? 0)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
