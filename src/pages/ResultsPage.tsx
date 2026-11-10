import { useApp } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6"];

export default function ResultsPage() {
  const { sales, purchases, products } = useApp();
  const { formatAmount, currency } = useCurrency();

  // Formatter dynamique pour les tooltips Recharts
  const fmtTooltip = (v: unknown) => formatAmount(Number(v));

  const totalCA = sales.reduce((s, v) => s + v.total, 0);
  const totalAchats = purchases.reduce((s, p) => s + p.total, 0);
  const beneficeBrut = totalCA - totalAchats;
  const margeGlobale = totalCA > 0 ? ((beneficeBrut / totalCA) * 100).toFixed(1) : "0";

  // Monthly aggregation
  const monthlyMap: Record<string, { ca: number; achats: number }> = {};
  sales.forEach((s) => {
    const m = s.date.slice(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { ca: 0, achats: 0 };
    monthlyMap[m].ca += s.total;
  });
  purchases.forEach((p) => {
    const m = p.date.slice(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { ca: 0, achats: 0 };
    monthlyMap[m].achats += p.total;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      "Chiffre d'affaires": data.ca,
      Achats: data.achats,
      Bénéfice: data.ca - data.achats,
    }));

  // Product performance
  const productMap: Record<string, { revenue: number; qty: number; profit: number }> = {};
  sales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productMap[item.productName]) productMap[item.productName] = { revenue: 0, qty: 0, profit: 0 };
      productMap[item.productName].revenue += item.total;
      productMap[item.productName].qty += item.qty;
      const prod = products.find((p) => p.id === item.productId);
      if (prod) productMap[item.productName].profit += (item.unitPrice - prod.buyPrice) * item.qty;
    });
  });
  const productData = Object.entries(productMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 8)
    .map(([name, data]) => ({ name, ...data }));

  // Status breakdown
  const paidSales = sales.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.total, 0);
  const partialSales = sales.filter((s) => s.status === "partial").reduce((sum, s) => sum + s.total, 0);
  const unpaidSales = sales.filter((s) => s.status === "unpaid").reduce((sum, s) => sum + s.total, 0);
  const pieData = [
    { name: "Payé", value: paidSales },
    { name: "Partiel", value: partialSales },
    { name: "Impayé", value: unpaidSales },
  ].filter((d) => d.value > 0);

  const kpis = [
    {
      label: "Chiffre d'affaires",
      value: formatAmount(totalCA),
      icon: <DollarSign size={20} />,
      color: "from-violet-500 to-indigo-500",
      text: "text-violet-600",
      sub: `${sales.length} vente(s)`,
    },
    {
      label: "Total Achats",
      value: formatAmount(totalAchats),
      icon: <TrendingDown size={20} />,
      color: "from-red-400 to-orange-500",
      text: "text-red-500",
      sub: `${purchases.length} achat(s)`,
    },
    {
      label: "Bénéfice Brut",
      value: formatAmount(beneficeBrut),
      icon: <TrendingUp size={20} />,
      color: beneficeBrut >= 0 ? "from-emerald-400 to-teal-500" : "from-red-400 to-orange-500",
      text: beneficeBrut >= 0 ? "text-emerald-600" : "text-red-500",
      sub: "CA - Achats",
    },
    {
      label: "Marge Globale",
      value: `${margeGlobale}%`,
      icon: <Percent size={20} />,
      color: "from-amber-400 to-yellow-500",
      text: "text-amber-600",
      sub: "Sur le CA total",
    },
  ];

  // Custom Y-axis tick formatter
  const yAxisFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ${currency.symbol}`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k ${currency.symbol}`;
    return `${v} ${currency.symbol}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Résultats & Chiffre d'Affaires</h2>
          <p className="text-slate-500 text-sm">
            Analyse complète de vos performances — Devise : <span className="font-bold text-indigo-600">{currency.name} ({currency.symbol})</span>
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center text-white mb-3`}>{k.icon}</div>
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-black ${k.text} break-all`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {sales.length === 0 && purchases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-green-200 p-16 text-center">
          <TrendingUp size={56} className="mx-auto text-green-200 mb-4" />
          <h3 className="text-slate-700 font-semibold text-lg mb-2">Aucune donnée disponible</h3>
          <p className="text-slate-500 text-sm">Ajoutez des produits, effectuez des ventes et des achats pour voir vos graphiques se générer automatiquement.</p>
        </div>
      ) : (
        <>
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1">📈 Évolution mensuelle CA / Achats / Bénéfice</h3>
              <p className="text-xs text-slate-400 mb-4">Valeurs en {currency.name} ({currency.symbol})</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ben" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={yAxisFormatter} width={80} />
                  <Tooltip formatter={fmtTooltip} />
                  <Legend />
                  <Area type="monotone" dataKey="Chiffre d'affaires" stroke="#8b5cf6" fill="url(#ca)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Achats" stroke="#ef4444" fill="url(#ach)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Bénéfice" stroke="#10b981" fill="url(#ben)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {productData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">🏆 Top produits par CA</h3>
                <p className="text-xs text-slate-400 mb-4">En {currency.symbol}</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={productData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={fmtTooltip} />
                    <Bar dataKey="revenue" name="CA" radius={[0, 6, 6, 0]}>
                      {productData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">💳 Répartition des paiements</h3>
                <p className="text-xs text-slate-400 mb-4">En {currency.symbol}</p>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={["#10b981", "#f59e0b", "#ef4444"][index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={fmtTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {productData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-1">💰 CA vs Bénéfice par produit</h3>
              <p className="text-xs text-slate-400 mb-4">En {currency.name} ({currency.symbol})</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={yAxisFormatter} width={80} />
                  <Tooltip formatter={fmtTooltip} />
                  <Legend />
                  <Bar dataKey="revenue" name="CA" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Bénéfice" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
