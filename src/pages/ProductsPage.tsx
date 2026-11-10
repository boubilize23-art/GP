import { useState, useMemo } from "react";
import { useApp, Product } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Plus, Pencil, Trash2, Package, Search, X,
  AlertTriangle, Tag, ChevronDown, Settings2, CheckCircle
} from "lucide-react";

const DEFAULT_CATEGORIES = ["Alimentaire", "Électronique", "Textile", "Matériaux", "Chimique", "Bureautique", "Autre"];
const UNITS = ["pièce", "kg", "litre", "mètre", "boîte", "carton", "palette", "sac", "tonne", "gramme"];
const CATEGORIES_KEY = "gp_categories_v1";

function loadCategories(): string[] {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

function saveCategories(cats: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

interface FormState {
  name: string; category: string; unit: string;
  buyPrice: string; sellPrice: string; stock: string; minStock: string;
  tvaRate: string;
}

const emptyForm = (cat: string): FormState => ({
  name: "", category: cat, unit: "pièce",
  buyPrice: "", sellPrice: "", stock: "", minStock: "5", tvaRate: "0",
});

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const { formatAmount, symbol } = useCurrency();

  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(categories[0]));
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Gestion catégories ─────────────────────────────────────────
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  const addCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    saveCategories(updated);
    setNewCatInput("");
  };

  const removeCategory = (cat: string) => {
    const inUse = products.some((p) => p.category === cat);
    if (inUse) return; // ne pas supprimer si utilisée
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    saveCategories(updated);
  };

  // ── Filtrage / recherche ───────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || p.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [products, search, filterCat]);

  const alertProducts = products.filter((p) => p.stock <= (p.minStock ?? 5));

  // ── Formulaire ─────────────────────────────────────────────────
  const openAdd = () => { setForm(emptyForm(categories[0])); setEditId(null); setShowForm(true); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name, category: p.category, unit: p.unit,
      buyPrice: String(p.buyPrice), sellPrice: String(p.sellPrice),
      stock: String(p.stock), minStock: String(p.minStock ?? 5),
      tvaRate: String(p.tvaRate ?? 0),
    });
    setEditId(p.id); setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      stock: parseFloat(form.stock) || 0,
      minStock: parseFloat(form.minStock) || 5,
      tvaRate: parseFloat(form.tvaRate) || 0,
    };
    if (editId) updateProduct(editId, data);
    else addProduct(data);
    setShowForm(false); setEditId(null);
  };

  const margin = (p: Product) =>
    p.buyPrice > 0 ? (((p.sellPrice - p.buyPrice) / p.buyPrice) * 100).toFixed(1) : "–";

  const stockStatus = (p: Product) => {
    const min = p.minStock ?? 5;
    if (p.stock === 0) return "empty";
    if (p.stock <= min) return "low";
    if (p.stock <= min * 2) return "warning";
    return "ok";
  };

  const statusConfig = {
    ok: { label: "OK", color: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-400" },
    warning: { label: "Attention", color: "bg-amber-100 text-amber-700 border-amber-200", bar: "bg-amber-400" },
    low: { label: "Stock bas", color: "bg-orange-100 text-orange-700 border-orange-200", bar: "bg-orange-400" },
    empty: { label: "Rupture", color: "bg-red-100 text-red-700 border-red-200", bar: "bg-red-500" },
  };

  // KPIs
  const totalProducts = products.length;
  const totalStockValue = products.reduce((s, p) => s + p.stock * p.buyPrice, 0);
  const avgMargin = products.length > 0
    ? (products.reduce((s, p) => s + (p.buyPrice > 0 ? ((p.sellPrice - p.buyPrice) / p.buyPrice) * 100 : 0), 0) / products.length).toFixed(1)
    : "0.0";

  const catColors = ["from-violet-400 to-indigo-500", "from-blue-400 to-cyan-500", "from-emerald-400 to-teal-500",
    "from-orange-400 to-amber-500", "from-pink-400 to-rose-500", "from-purple-400 to-violet-500", "from-slate-400 to-slate-600"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-xl">Catalogue Produits</h2>
            <p className="text-slate-500 text-sm">{totalProducts} produit(s) — {categories.length} catégorie(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatManager(!showCatManager)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition"
          >
            <Settings2 size={15} /> Catégories
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-semibold shadow hover:opacity-90 transition text-sm"
          >
            <Plus size={16} /> Nouveau produit
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total produits", value: totalProducts, sub: "dans le catalogue", color: "from-orange-400 to-amber-500" },
          { label: "Alertes stock", value: alertProducts.length, sub: "sous le seuil min", color: "from-red-400 to-rose-500" },
          { label: "Valeur stock", value: formatAmount(totalStockValue), sub: "au prix d'achat", color: "from-blue-400 to-indigo-500" },
          { label: "Marge moyenne", value: `${avgMargin}%`, sub: "sur tous les produits", color: "from-emerald-400 to-teal-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-8 h-1.5 rounded-full bg-gradient-to-r ${kpi.color} mb-3`} />
            <p className="font-black text-slate-800 text-xl">{kpi.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{kpi.label}</p>
            <p className="text-slate-400 text-xs">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertes stock */}
      {alertProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="font-bold text-amber-700 text-sm">{alertProducts.length} produit(s) sous le seuil minimal</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertProducts.map((p) => (
              <span key={p.id} className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                p.stock === 0 ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                {p.stock === 0 ? "⛔" : "⚠️"} {p.name} : {p.stock} {p.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gestionnaire de catégories */}
      {showCatManager && (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Tag size={16} className="text-violet-500" /> Gérer les catégories
            </h3>
            <button onClick={() => setShowCatManager(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          {/* Ajouter une catégorie */}
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Nouvelle catégorie..."
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button
              onClick={addCategory}
              disabled={!newCatInput.trim() || categories.includes(newCatInput.trim())}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition disabled:opacity-40"
            >
              <Plus size={15} /> Ajouter
            </button>
          </div>
          {/* Liste des catégories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, idx) => {
              const inUse = products.some((p) => p.category === cat);
              const countInUse = products.filter((p) => p.category === cat).length;
              return (
                <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold bg-gradient-to-r ${catColors[idx % catColors.length]} text-white`}>
                  <span>{cat}</span>
                  {countInUse > 0 && <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">{countInUse}</span>}
                  {!inUse && (
                    <button onClick={() => removeCategory(cat)} className="ml-1 hover:text-red-200 transition">
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">* Les catégories utilisées par des produits ne peuvent pas être supprimées</p>
        </div>
      )}

      {/* Barre recherche + filtre catégorie */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
        </div>

        {/* Dropdown catégorie */}
        <div className="relative">
          <button
            onClick={() => setShowCatDropdown(!showCatDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 hover:border-orange-300 transition min-w-[160px] justify-between"
          >
            <span className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              {filterCat === "all" ? "Toutes les catégories" : filterCat}
            </span>
            <ChevronDown size={14} className={`transition-transform ${showCatDropdown ? "rotate-180" : ""}`} />
          </button>
          {showCatDropdown && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 min-w-[200px] overflow-hidden">
              {["all", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setFilterCat(cat); setShowCatDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between ${
                    filterCat === cat ? "text-orange-600 font-semibold bg-orange-50" : "text-slate-700"
                  }`}
                >
                  {cat === "all" ? "Toutes les catégories" : cat}
                  {filterCat === cat && <CheckCircle size={14} className="text-orange-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formulaire produit */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Package size={16} className="text-orange-500" />
              {editId ? "Modifier le produit" : "Nouveau produit"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nom */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nom du produit *</label>
              <input
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom du produit"
              />
            </div>

            {/* Catégorie — liste déroulante */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Catégorie</label>
              <div className="relative">
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 appearance-none bg-white pr-8"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Unité — liste déroulante */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Unité</label>
              <div className="relative">
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 appearance-none bg-white pr-8"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Prix achat */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Prix d'achat ({symbol})</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Prix vente */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Prix de vente ({symbol})</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Aperçu marge */}
            {form.buyPrice && form.sellPrice && (
              <div className="flex items-center justify-center">
                <div className={`text-center px-4 py-2 rounded-xl border ${
                  parseFloat(form.sellPrice) > parseFloat(form.buyPrice)
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  <p className="text-xs text-slate-500">Marge estimée</p>
                  <p className={`font-black text-lg ${
                    parseFloat(form.sellPrice) > parseFloat(form.buyPrice) ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {parseFloat(form.buyPrice) > 0
                      ? `${(((parseFloat(form.sellPrice) - parseFloat(form.buyPrice)) / parseFloat(form.buyPrice)) * 100).toFixed(1)}%`
                      : "—"
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Stock initial */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Stock initial</label>
              <input
                type="number" min="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
              />
            </div>

            {/* Stock minimal */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Seuil d'alerte (min)</label>
              <input
                type="number" min="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                placeholder="5"
              />
            </div>

            {/* Taux TVA */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Taux TVA par défaut (%)
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.1"
                  className="w-full border-2 border-violet-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 bg-violet-50 transition"
                  value={form.tvaRate}
                  onChange={(e) => setForm({ ...form, tvaRate: e.target.value })}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-violet-500 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ce taux sera automatiquement appliqué lors des ventes et achats de ce produit.
                Laissez à 0 si pas de TVA.
              </p>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition">
                <CheckCircle size={14} /> {editId ? "Mettre à jour" : "Ajouter le produit"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau produits */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Package size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">
            {search || filterCat !== "all" ? "Aucun produit trouvé" : "Aucun produit — Ajoutez votre premier produit"}
          </p>
          {(!search && filterCat === "all") && (
            <button onClick={openAdd}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition mx-auto">
              <Plus size={15} /> Ajouter un produit
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Produit</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Prix achat</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Prix vente</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Marge</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const st = stockStatus(p);
                const cfg = statusConfig[st];
                const catIdx = categories.indexOf(p.category) % catColors.length;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${catColors[catIdx >= 0 ? catIdx : 0]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          <p className="text-slate-400 text-xs">{p.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r ${catColors[catIdx >= 0 ? catIdx : 0]}`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-slate-600 font-medium">
                      {formatAmount(p.buyPrice)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-slate-800 font-semibold">
                      {formatAmount(p.sellPrice)}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className={`font-bold ${parseFloat(margin(p)) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {margin(p) !== "–" ? `${margin(p)}%` : "–"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <span className={`font-black text-lg ${
                          st === "empty" ? "text-red-600" : st === "low" ? "text-orange-600" : st === "warning" ? "text-amber-600" : "text-slate-800"
                        }`}>{p.stock}</span>
                        <p className="text-slate-400 text-xs">/ {p.minStock} min</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                          <Pencil size={15} />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { deleteProduct(p.id); setDeleteConfirm(null); }}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">Oui</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">Non</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-bold text-slate-600 text-sm">
                  {filtered.length} produit(s) affiché(s)
                </td>
                <td colSpan={2} className="hidden sm:table-cell" />
                <td className="px-4 py-3 text-right font-bold text-slate-800 text-sm hidden lg:table-cell">
                  Valeur : {formatAmount(filtered.reduce((s, p) => s + p.stock * p.buyPrice, 0))}
                </td>
                <td className="px-4 py-3 text-center font-bold text-slate-800 text-sm">
                  {filtered.reduce((s, p) => s + p.stock, 0)} unités
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
