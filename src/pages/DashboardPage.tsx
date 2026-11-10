import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { formatDateTime } from "../utils/datetime";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  ShoppingCart, ShoppingBag, CreditCard, TrendingUp,
  Package, Users, Building2, AlertTriangle, ArrowUpRight, ArrowDownRight, CheckCircle
} from "lucide-react";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
  const { products, clients, suppliers, sales, purchases, receivables } = useApp();
  const { formatAmount, currency } = useSettings();
  const fmtEur = (v: unknown) => formatAmount(Number(v));
  const yAxisFmt = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ${currency.symbol}`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k ${currency.symbol}`;
    return `${v} ${currency.symbol}`;
  };

  // ── Calculs comptables précis ─────────────────────────────────────────────
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // CA encaissé = somme des montants réellement encaissés dans les ventes
  const caEncaisse    = round2(sales.reduce((s, v) => s + v.paid, 0));
  // Total achats payés = somme des montants réellement payés aux fournisseurs
  const achatsPaies   = round2(purchases.reduce((s, p) => s + p.paid, 0));
  // Bénéfice encaissé = argent réellement rentré − argent réellement sorti
  const beneficeEncaisse = round2(caEncaisse - achatsPaies);

  // Indicateurs secondaires (pour sous-titres et alertes)
  const totalCA       = round2(sales.reduce((s, v) => s + v.total, 0));
  const totalAchats   = round2(purchases.reduce((s, p) => s + p.total, 0));
  const totalCreances = round2(clients.reduce((s, c) => s + c.balance, 0));
  const totalDettes   = round2(suppliers.reduce((s, f) => s + f.balance, 0));
  const margeGlobale  = totalCA > 0 ? ((round2(totalCA - totalAchats) / totalCA) * 100).toFixed(1) : "0";

  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const unpaidSales = sales.filter((s) => s.status !== "paid").length;
  const overdueRec = receivables.filter((r) => r.status === "partial" || r.status === "pending").length;

  // Monthly data for chart — basé sur montants réellement encaissés/payés
  const monthlyMap: Record<string, { caEncaisse: number; achatsPaies: number; caTotal: number; achatsTotal: number }> = {};
  sales.forEach((s) => {
    const m = s.date.slice(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { caEncaisse: 0, achatsPaies: 0, caTotal: 0, achatsTotal: 0 };
    monthlyMap[m].caEncaisse += s.paid;   // montant réellement encaissé
    monthlyMap[m].caTotal += s.total;     // CA total facturé
  });
  purchases.forEach((p) => {
    const m = p.date.slice(0, 7);
    if (!monthlyMap[m]) monthlyMap[m] = { caEncaisse: 0, achatsPaies: 0, caTotal: 0, achatsTotal: 0 };
    monthlyMap[m].achatsPaies += p.paid;  // montant réellement payé
    monthlyMap[m].achatsTotal += p.total; // total achats facturés
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short" }),
      "CA Encaissé": round2(data.caEncaisse),
      "Achats Payés": round2(data.achatsPaies),
      "Bénéfice": round2(data.caEncaisse - data.achatsPaies),
    }));

  // Category breakdown
  const catMap: Record<string, number> = {};
  products.forEach((p) => {
    catMap[p.category] = (catMap[p.category] || 0) + 1;
  });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // Payment status
  const payData = [
    { name: "Payé", value: sales.filter((s) => s.status === "paid").length, fill: "#10b981" },
    { name: "Partiel", value: sales.filter((s) => s.status === "partial").length, fill: "#f59e0b" },
    { name: "Impayé", value: sales.filter((s) => s.status === "unpaid").length, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Top clients
  const clientSales: Record<string, number> = {};
  sales.forEach((s) => { clientSales[s.clientName] = (clientSales[s.clientName] || 0) + s.total; });
  const topClients = Object.entries(clientSales).sort(([, a], [, b]) => b - a).slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  const isNew = products.length === 0 && sales.length === 0;

  return (
    <div className="space-y-6">
      {/* Welcome banner if new */}
      {isNew && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
          <h3 className="font-black text-xl mb-2">🚀 Bienvenue sur GestioPro !</h3>
          <p className="text-violet-200 text-sm mb-4">
            Commencez par ajouter vos produits dans l'onglet <strong>Produits</strong>. Le tableau de bord, les formulaires et les graphiques se génèreront automatiquement.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate("products")} className="px-4 py-2 bg-white text-violet-600 rounded-xl font-bold text-sm hover:bg-violet-50 transition flex items-center gap-2">
              <Package size={14} /> Ajouter des produits
            </button>
            <button onClick={() => onNavigate("suppliers")} className="px-4 py-2 bg-violet-700 text-white rounded-xl font-bold text-sm hover:bg-violet-800 transition flex items-center gap-2">
              <Building2 size={14} /> Ajouter des fournisseurs
            </button>
            <button onClick={() => onNavigate("clients")} className="px-4 py-2 bg-violet-700 text-white rounded-xl font-bold text-sm hover:bg-violet-800 transition flex items-center gap-2">
              <Users size={14} /> Ajouter des clients
            </button>
          </div>
        </div>
      )}

      {/* ── 3 KPIs principaux : CA encaissé · Achats payés · Bénéfice encaissé ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CA Encaissé */}
        <button onClick={() => onNavigate("sales")}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-left hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white">
              <ShoppingCart size={20} />
            </div>
            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-violet-400 transition" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">CA Encaissé</p>
          <p className="text-3xl font-black text-slate-800 mb-2">{formatAmount(caEncaisse)}</p>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>CA total facturé</span>
              <span className="font-semibold text-slate-700">{formatAmount(totalCA)}</span>
            </div>
            <div className="flex justify-between">
              <span>Créances restantes</span>
              <span className="font-semibold text-red-500">{formatAmount(totalCreances)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 transition-all"
                style={{ width: `${totalCA > 0 ? Math.min(100, (caEncaisse / totalCA) * 100) : 0}%` }} />
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{sales.length} vente(s)</span>
              <span>{totalCA > 0 ? ((caEncaisse / totalCA) * 100).toFixed(1) : 0}% encaissé</span>
            </div>
          </div>
        </button>

        {/* Total Achats Payés */}
        <button onClick={() => onNavigate("purchases")}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-left hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white">
              <ShoppingBag size={20} />
            </div>
            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-400 transition" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Achats Payés</p>
          <p className="text-3xl font-black text-slate-800 mb-2">{formatAmount(achatsPaies)}</p>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Total achats facturés</span>
              <span className="font-semibold text-slate-700">{formatAmount(totalAchats)}</span>
            </div>
            <div className="flex justify-between">
              <span>Dettes restantes</span>
              <span className="font-semibold text-orange-500">{formatAmount(totalDettes)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all"
                style={{ width: `${totalAchats > 0 ? Math.min(100, (achatsPaies / totalAchats) * 100) : 0}%` }} />
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{purchases.length} achat(s)</span>
              <span>{totalAchats > 0 ? ((achatsPaies / totalAchats) * 100).toFixed(1) : 0}% payé</span>
            </div>
          </div>
        </button>

        {/* Bénéfice Encaissé */}
        <button onClick={() => onNavigate("results")}
          className={`rounded-2xl p-6 border shadow-sm text-left hover:shadow-md transition group
            ${beneficeEncaisse >= 0
              ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"
              : "bg-gradient-to-br from-red-50 to-orange-50 border-red-200"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg
              ${beneficeEncaisse >= 0 ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-red-400 to-orange-500"}`}>
              {beneficeEncaisse >= 0 ? "+" : "−"}
            </div>
            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-emerald-400 transition" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Bénéfice Encaissé</p>
          <p className={`text-3xl font-black mb-2 ${beneficeEncaisse >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatAmount(Math.abs(beneficeEncaisse))}
          </p>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>CA encaissé</span>
              <span className="font-semibold text-emerald-600">{formatAmount(caEncaisse)}</span>
            </div>
            <div className="flex justify-between">
              <span>Achats payés</span>
              <span className="font-semibold text-blue-600">− {formatAmount(achatsPaies)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1 flex justify-between font-bold">
              <span className={beneficeEncaisse >= 0 ? "text-emerald-700" : "text-red-600"}>
                {beneficeEncaisse >= 0 ? "Bénéfice" : "Déficit"}
              </span>
              <span className={beneficeEncaisse >= 0 ? "text-emerald-700" : "text-red-600"}>
                {beneficeEncaisse >= 0 ? "+" : "−"}{formatAmount(Math.abs(beneficeEncaisse))}
              </span>
            </div>
            <p className="text-slate-400">Marge globale : {margeGlobale}%</p>
          </div>
        </button>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Produits", value: products.length, icon: <Package size={16} />, color: "bg-amber-100 text-amber-600", page: "products" },
          { label: "Clients", value: clients.length, icon: <Users size={16} />, color: "bg-pink-100 text-pink-600", page: "clients" },
          { label: "Fournisseurs", value: suppliers.length, icon: <Building2 size={16} />, color: "bg-purple-100 text-purple-600", page: "suppliers" },
          { label: "Ventes impayées", value: unpaidSales, icon: <AlertTriangle size={16} />, color: "bg-red-100 text-red-600", page: "sales" },
        ].map((s) => (

          <button key={s.label} onClick={() => onNavigate(s.page)}
            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-left flex items-center gap-3 hover:shadow-md transition">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-black text-slate-800">{s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || overdueRec > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h4 className="font-bold text-amber-800 text-sm">Stock faible ({lowStock.length} produit{lowStock.length > 1 ? "s" : ""})</h4>
              </div>
              <div className="space-y-1.5">
                {lowStock.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-sm">
                    <span className="text-amber-700">{p.name}</span>
                    <span className="font-bold text-amber-900">{p.stock} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {overdueRec > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-red-500" />
                <h4 className="font-bold text-red-800 text-sm">{overdueRec} créance{overdueRec > 1 ? "s" : ""} en attente</h4>
              </div>
              <div className="space-y-1.5">
                {receivables.filter((r) => r.remaining > 0).slice(0, 4).map((r) => (
                  <div key={r.id} className="flex justify-between items-center text-sm">
                    <span className="text-red-700">{r.clientName}</span>
                    <span className="font-bold text-red-900">{formatAmount(r.remaining)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Row 1 */}
      {monthlyData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">📊 CA Encaissé vs Achats Payés (6 derniers mois)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={yAxisFmt} width={75} />
                <Tooltip formatter={fmtEur} />
                <Legend />
                <Area type="monotone" dataKey="CA Encaissé" stroke="#8b5cf6" fill="url(#gCA)" strokeWidth={2} />
                <Area type="monotone" dataKey="Achats Payés" stroke="#ef4444" fill="url(#gAch)" strokeWidth={2} />
                <Area type="monotone" dataKey="Bénéfice" stroke="#10b981" fill="url(#gBen)" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">💳 Statut des ventes</h3>
            {payData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {payData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-slate-300 text-sm">Aucune vente</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <div className="flex justify-center gap-4 mb-4 text-slate-200">
            <ShoppingCart size={40} />
            <TrendingUp size={40} />
            <ShoppingBag size={40} />
          </div>
          <h3 className="text-slate-600 font-semibold mb-2">Les graphiques apparaîtront ici</h3>
          <p className="text-slate-400 text-sm">Commencez à enregistrer des ventes et des achats pour voir vos données s'afficher automatiquement.</p>
        </div>
      )}

      {/* Charts Row 2 */}
      {(catData.length > 0 || topClients.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {catData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">📦 Produits par catégorie</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Produits" radius={[6, 6, 0, 0]}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {topClients.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">🏅 Top 5 clients par CA</h3>
              <div className="space-y-3">
                {topClients.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold`}
                      style={{ background: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{c.name}</span>
                        <span className="font-bold text-slate-800">{formatAmount(c.total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${(c.total / topClients[0].total) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent activity */}
      {(sales.length > 0 || purchases.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">🕐 Activité récente</h3>
          <div className="space-y-2">
            {[
              ...sales.slice(-5).map((s) => ({ type: "sale", ref: s.ref, name: s.clientName, amount: s.total, date: s.date, at: s.createdAt, status: s.status })),
              ...purchases.slice(-3).map((p) => ({ type: "purchase", ref: p.ref, name: p.supplierName, amount: p.total, date: p.date, at: p.createdAt, status: p.status })),
            ]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.type === "sale" ? "bg-emerald-100" : "bg-blue-100"}`}>
                    {item.type === "sale" ? <ShoppingCart size={14} className="text-emerald-600" /> : <ShoppingBag size={14} className="text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{item.ref} · {formatDateTime(item.at, item.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{formatAmount(item.amount)}</p>
                    {item.status === "paid" && <CheckCircle size={12} className="ml-auto text-emerald-500" />}
                    {item.status !== "paid" && <ArrowDownRight size={12} className="ml-auto text-red-400" />}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
