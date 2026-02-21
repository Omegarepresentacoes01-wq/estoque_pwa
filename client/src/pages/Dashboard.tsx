import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, Car, CheckCircle, Clock, MapPin, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";

const COLORS = [
  "oklch(0.65 0.18 220)",
  "oklch(0.70 0.15 160)",
  "oklch(0.72 0.17 80)",
  "oklch(0.65 0.18 300)",
  "oklch(0.60 0.20 25)",
  "oklch(0.68 0.16 260)",
  "oklch(0.70 0.14 140)",
  "oklch(0.66 0.18 200)",
];

function StatCard({ icon: Icon, label, value, sub, color = "primary", trend }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; trend?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "text-blue-400",
    green: "text-emerald-400",
    yellow: "text-amber-400",
    red: "text-red-400",
    purple: "text-purple-400",
  };
  const bgMap: Record<string, string> = {
    primary: "bg-blue-400/10",
    green: "bg-emerald-400/10",
    yellow: "bg-amber-400/10",
    red: "bg-red-400/10",
    purple: "bg-purple-400/10",
  };
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 flex flex-col gap-3 hover:border-border transition-colors">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg ${bgMap[color]} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${colorMap[color]}`} />
        </div>
        {trend && <span className="text-xs text-muted-foreground">{trend}</span>}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/70 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 flex flex-col gap-3">
      <div className="skeleton h-9 w-9 rounded-lg" />
      <div className="skeleton h-7 w-20 rounded" />
      <div className="skeleton h-3 w-28 rounded" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.fill || p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
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
    { name: "Livre", value: Number(totais?.livres ?? 0), color: "oklch(0.70 0.15 160)" },
    { name: "Reservado", value: Number(totais?.reservados ?? 0), color: "oklch(0.72 0.17 80)" },
    { name: "Vendido", value: Number(totais?.vendidos ?? 0), color: "oklch(0.60 0.05 250)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do estoque de veículos</p>
        </div>
        <button
          onClick={() => notificarMutation.mutate()}
          disabled={notificarMutation.isPending}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {notificarMutation.isPending ? "Verificando..." : "Verificar Críticos"}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={Car} label="Total em Estoque" value={Number(totais?.total ?? 0)} color="primary" />
            <StatCard icon={CheckCircle} label="Livres" value={Number(totais?.livres ?? 0)} color="green" />
            <StatCard icon={Clock} label="Reservados" value={Number(totais?.reservados ?? 0)} color="yellow" />
            <StatCard icon={AlertTriangle} label="Críticos (+180 dias)" value={Number(totais?.criticos ?? 0)} color="red" />
            <StatCard icon={TrendingUp} label="Dias Médios Estoque" value={Math.round(Number(totais?.diasMedioEstoque ?? 0))} sub="média geral" color="purple" />
            <StatCard icon={BarChart3} label="Dias Médios Pátio" value={Math.round(Number(totais?.diasMedioPatio ?? 0))} sub="média geral" color="primary" />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Pie */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status do Estoque</h3>
          {isLoading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por Local Bar */}
        <div className="rounded-xl border border-border/50 bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Veículos por Localização</h3>
          {isLoading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porLocal.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'oklch(0.60 0.02 250)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'oklch(0.60 0.02 250)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Veículos" fill="oklch(0.65 0.18 220)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por Cor */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Cor</h3>
          {isLoading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porCor.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'oklch(0.60 0.02 250)' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'oklch(0.60 0.02 250)' }} tickLine={false} axisLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Veículos" fill="oklch(0.70 0.15 160)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por Pneu */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Marca de Pneu</h3>
          {isLoading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={porPneu} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {porPneu.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Veículos Críticos */}
      {stats?.criticos && stats.criticos.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Veículos Críticos (+180 dias em estoque)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-amber-500/20">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Modelo</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Chassi</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Localização</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Dias</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticos.map((v) => (
                  <tr key={v.id} className="border-b border-amber-500/10 last:border-0">
                    <td className="py-2 px-2 text-foreground max-w-[200px] truncate">{v.modelo?.slice(0, 40)}...</td>
                    <td className="py-2 px-2 text-muted-foreground font-mono">{v.chassi}</td>
                    <td className="py-2 px-2 text-muted-foreground">{v.estoquesFisico}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="badge-critico px-2 py-0.5 rounded-full text-xs font-semibold">{Math.abs(v.diasEstoque ?? 0)}</span>
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
