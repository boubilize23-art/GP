import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Warehouse, Search, X, Filter, AlertTriangle,
  CheckCircle, XCircle, ChevronDown, Download
} from "lucide-react";

export default function StockPage() {
  const { products, stockMovements } = useApp();
  const { formatAmount } = useCurrency();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Catégories dynamiques depuis les produits
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Calcul entrées / sorties par produit sur la période sélectionnée
  const stockData = useMemo(() => {
    return products.map((product) => {
      // Filtrer les mouvements sur la période
      const movsIn = stockMovements.filter((m) => {
        if (m.productId !== product.id || m.type !== "in") return false;
        if (dateFrom && m.date < dateFrom) return false;
        if (dateTo && m.date > dateTo) return false;
        return true;
      });

      const movsOut = stockMovements.filter((m) => {
        if (m.productId !== product.id || m.type !== "out") return false;
        if (dateFrom && m.date < dateFrom) return false;
        if (dateTo && m.date > dateTo) return false;
        return true;
      });

      const totalIn = movsIn.reduce((s, m) => s + m.qty, 0);
      const totalOut = movsOut.reduce((s, m) => s + m.qty, 0);

      const min = product.minStock ?? 5;
      const status: "ok" | "warning" | "low" | "empty" =
        product.stock === 0 ? "empty" :
        product.stock <= min ? "low" :
        product.stock <= min * 2 ? "warning" : "ok";

      return { product, totalIn, totalOut, status };
    });
  }, [products, stockMovements, dateFrom, dateTo]);

  // Filtrage
  const filtered = useMemo(() => {
    return stockData.filter(({ product }) => {
      const matchSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || product.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [stockData, search, filterCat]);

  // KPIs
  const totalValeur = products.reduce((s, p) => s + p.stock * p.buyPrice, 0);
  const enRupture = products.filter((p) => p.stock === 0).length;
  const enAlerte = products.filter((p) => p.stock > 0 && p.stock <= (p.minStock ?? 5)).length;

  const statusConfig = {
    ok: { label: "OK", textColor: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle size={13} /> },
    warning: { label: "Attention", textColor: "text-amber-600", badgeColor: "bg-amber-100 text-amber-700 border-amber-200", icon: <AlertTriangle size={13} /> },
    low: { label: "Stock bas", textColor: "text-orange-600", badgeColor: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertTriangle size={13} /> },
    empty: { label: "Rupture", textColor: "text-red-600", badgeColor: "bg-red-100 text-red-700 border-red-200", icon: <XCircle size={13} /> },
  };

  // Export CSV
  const exportCSV = () => {
    const header = "Produit,Catégorie,Unité,Entrées,Sorties,Stock restant,Seuil min,Valeur stock,Statut";
    const rows = filtered.map(({ product, totalIn, totalOut, status }) =>
      `"${product.name}","${product.category}","${product.unit}",${totalIn},${totalOut},${product.stock},${product.minStock ?? 5},${product.stock * product.buyPrice},"${statusConfig[status].label}"`
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "stock.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Warehouse size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-xl">État du Stock</h2>
            <p className="text-slate-500 text-sm">{products.length} produit(s) — Valeur totale : <span className="font-bold text-blue-600">{formatAmount(totalValeur)}</span></p>
          </div>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition">
          <Download size={15} /> Exporter CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total produits", value: products.length, color: "from-cyan-400 to-blue-500", text: "text-blue-600" },
          { label: "En stock normal", value: products.filter((p) => p.stock > (p.minStock ?? 5) * 2).length, color: "from-emerald-400 to-teal-500", text: "text-emerald-600" },
          { label: "En alerte", value: enAlerte, color: "from-amber-400 to-orange-500", text: "text-amber-600" },
          { label: "En rupture", value: enRupture, color: "from-red-400 to-rose-500", text: "text-red-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${kpi.color} mb-3`} />
            <p className={`font-black text-2xl ${kpi.text}`}>{kpi.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {(enRupture > 0 || enAlerte > 0) && (
        <div className="space-y-2">
          {enRupture > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-3">
              <XCircle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm font-semibold">
                ⛔ Rupture de stock : {products.filter((p) => p.stock === 0).map((p) => p.name).join(", ")}
              </p>
            </div>
          )}
          {enAlerte > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-amber-700 text-sm font-semibold">
                ⚠️ Stock bas : {products.filter((p) => p.stock > 0 && p.stock <= (p.minStock ?? 5)).map((p) => `${p.name} (${p.stock})`).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>

          {/* Catégorie */}
          <div className="relative">
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 appearance-none bg-white pr-8"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Bouton filtres date */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition ${
              (dateFrom || dateTo) ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter size={14} /> Période {(dateFrom || dateTo) && "●"}
          </button>

          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="px-3 py-2 text-xs text-slate-500 hover:text-red-500 border border-slate-200 rounded-xl hover:border-red-200 transition">
              Effacer période
            </button>
          )}
        </div>

        {/* Filtres date */}
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Du</label>
              <input type="date"
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Au</label>
              <input type="date"
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <p className="text-xs text-cyan-600 font-semibold">
                Les colonnes Entrées/Sorties reflètent cette période
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tableau stock */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Warehouse size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">Aucun produit trouvé</p>
          <p className="text-slate-400 text-sm mt-1">Ajoutez des produits depuis la rubrique Produits</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produit</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Entrées ▲
                  {(dateFrom || dateTo) && <span className="block text-[10px] font-normal text-cyan-500 normal-case">sur la période</span>}
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Sorties ▼
                  {(dateFrom || dateTo) && <span className="block text-[10px] font-normal text-cyan-500 normal-case">sur la période</span>}
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock restant</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Seuil min</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Valeur stock</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ product, totalIn, totalOut, status }) => {
                const cfg = statusConfig[status];
                const progress = product.minStock
                  ? Math.min(100, (product.stock / (product.minStock * 3)) * 100)
                  : 50;
                return (
                  <tr key={product.id} className={`hover:bg-slate-50 transition ${status === "empty" ? "bg-red-50/30" : status === "low" ? "bg-orange-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                          status === "empty" ? "bg-gradient-to-br from-red-400 to-rose-500" :
                          status === "low" ? "bg-gradient-to-br from-orange-400 to-amber-500" :
                          status === "warning" ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                          "bg-gradient-to-br from-cyan-400 to-blue-500"
                        }`}>
                          {product.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{product.name}</p>
                          <p className="text-slate-400 text-xs">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-emerald-600">
                        {totalIn > 0 ? `+${totalIn}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-red-500">
                        {totalOut > 0 ? `-${totalOut}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <p className={`font-black text-xl ${cfg.textColor}`}>{product.stock}</p>
                        {/* Barre de niveau */}
                        <div className="mt-1 h-1.5 bg-slate-100 rounded-full w-16 ml-auto overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === "empty" ? "bg-red-500" :
                              status === "low" ? "bg-orange-500" :
                              status === "warning" ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${Math.max(2, progress)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-slate-500 text-sm">
                      {product.minStock ?? 5}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-slate-600 text-sm font-medium">
                      {formatAmount(product.stock * product.buyPrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.badgeColor}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totaux */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-bold text-slate-600 text-sm">
                  {filtered.length} produit(s)
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">
                  +{filtered.reduce((s, d) => s + d.totalIn, 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-500 text-sm">
                  -{filtered.reduce((s, d) => s + d.totalOut, 0)}
                </td>
                <td className="px-4 py-3 text-right font-black text-slate-800">
                  {filtered.reduce((s, d) => s + d.product.stock, 0)} unités
                </td>
                <td className="hidden sm:table-cell" />
                <td className="px-4 py-3 text-right font-bold text-blue-600 text-sm hidden lg:table-cell">
                  {formatAmount(filtered.reduce((s, d) => s + d.product.stock * d.product.buyPrice, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
