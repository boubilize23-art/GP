import { useState } from "react";
import { useApp, SaleItem, Sale } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Plus, ShoppingCart, X, Trash2, CheckCircle, AlertCircle,
  Clock, FileText, Printer, Eye, TrendingUp, DollarSign, ReceiptText, Percent
} from "lucide-react";
import InvoiceModal from "../components/InvoiceModal";
import { formatDateTime } from "../utils/datetime";

interface FormItem {
  productId: string;
  qty: string;
  unitPrice: string;
  tvaRate: string;
}

export default function SalesPage() {
  const { sales, products, clients, addSale, addClient } = useApp();
  const { formatAmount, symbol } = useCurrency();

  const [showForm, setShowForm]           = useState(false);
  const [clientId, setClientId]           = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [isNewClient, setIsNewClient]     = useState(false);
  const [date, setDate]                   = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems]                 = useState<FormItem[]>([{ productId: "", qty: "1", unitPrice: "", tvaRate: "0" }]);
  const [paid, setPaid]                   = useState("");
  const [selectedSale, setSelectedSale]   = useState<Sale | null>(null);

  // ── Calculs TVA ligne par ligne ─────────────────────────────────
  const lineCalc = items.map((item) => {
    const qty      = parseFloat(item.qty)       || 0;
    const price    = parseFloat(item.unitPrice)  || 0;
    const tvaRate  = parseFloat(item.tvaRate)    || 0;
    const ht       = Math.round(qty * price * 100) / 100;
    const tva      = Math.round(ht * (tvaRate / 100) * 100) / 100;
    const ttc      = Math.round((ht + tva) * 100) / 100;
    return { ht, tva, ttc, tvaRate };
  });

  const totalHT  = Math.round(lineCalc.reduce((s, l) => s + l.ht,  0) * 100) / 100;
  const totalTVA = Math.round(lineCalc.reduce((s, l) => s + l.tva, 0) * 100) / 100;
  const total    = Math.round(lineCalc.reduce((s, l) => s + l.ttc, 0) * 100) / 100;
  const paidNum  = Math.min(parseFloat(paid) || 0, total);
  const remaining = Math.max(0, Math.round((total - paidNum) * 100) / 100);

  // Validation stock
  const stockErrors = items.map((item) => {
    if (!item.productId) return null;
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) return null;
    const qty = parseFloat(item.qty) || 0;
    if (prod.stock === 0) return `"${prod.name}" est en rupture de stock (stock: 0)`;
    if (qty > prod.stock) return `"${prod.name}" : stock insuffisant (disponible: ${prod.stock} ${prod.unit})`;
    return null;
  });

  const addItem    = () => setItems([...items, { productId: "", qty: "1", unitPrice: "", tvaRate: "0" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof FormItem, val: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: val };
    if (field === "productId") {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        newItems[idx].unitPrice = String(prod.sellPrice);
        newItems[idx].tvaRate   = String(prod.tvaRate ?? 0);
      }
    }
    setItems(newItems);
  };

  const resetForm = () => {
    setShowForm(false);
    setItems([{ productId: "", qty: "1", unitPrice: "", tvaRate: "0" }]);
    setPaid("");
    setClientId("");
    setNewClientName("");
    setIsNewClient(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const stockErr = stockErrors.find(Boolean);
    if (stockErr) {
      alert("⛔ VENTE IMPOSSIBLE\n\n" + stockErr + "\n\nVeuillez ajuster la quantité ou réapprovisionner le stock.");
      return;
    }

    let resolvedClientId   = clientId;
    let resolvedClientName = "";

    if (isNewClient && newClientName.trim()) {
      resolvedClientId   = addClient({ name: newClientName.trim(), phone: "", email: "", address: "" });
      resolvedClientName = newClientName.trim();
    } else {
      const cl = clients.find((c) => c.id === resolvedClientId);
      if (!cl) { alert("Veuillez sélectionner un client."); return; }
      resolvedClientName = cl.name;
    }

    const saleItems: SaleItem[] = items
      .filter((i) => i.productId && parseFloat(i.qty) > 0)
      .map((i, idx) => {
        const prod    = products.find((p) => p.id === i.productId);
        const lc      = lineCalc[idx];
        return {
          productId:   i.productId,
          productName: prod?.name || "",
          qty:         parseFloat(i.qty),
          unitPrice:   parseFloat(i.unitPrice),
          tvaRate:     lc.tvaRate,
          tvaAmount:   lc.tva,
          totalHT:     lc.ht,
          total:       lc.ttc,
        };
      });

    if (saleItems.length === 0) { alert("Ajoutez au moins un article."); return; }

    const status: Sale["status"] = paidNum >= total ? "paid" : paidNum > 0 ? "partial" : "unpaid";

    addSale({
      clientId:   resolvedClientId,
      clientName: resolvedClientName,
      items:      saleItems,
      totalHT,
      totalTVA,
      total,
      paid:       paidNum,
      date,
      status,
    });

    resetForm();
  };

  const statusBadge = (status: string) => {
    if (status === "paid")
      return <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle size={11} />Payée</span>;
    if (status === "partial")
      return <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full"><Clock size={11} />Partielle</span>;
    return <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full"><AlertCircle size={11} />Impayée</span>;
  };

  // KPIs
  const totalCA       = sales.reduce((s, v) => s + v.total, 0);
  const totalHT_all   = sales.reduce((s, v) => s + (v.totalHT  ?? v.total), 0);
  const totalTVA_all  = sales.reduce((s, v) => s + (v.totalTVA ?? 0), 0);
  const totalEncaisse = sales.reduce((s, v) => s + v.paid, 0);
  const totalReste    = sales.reduce((s, v) => s + Math.max(0, v.total - v.paid), 0);
  const nbPaid        = sales.filter((v) => v.status === "paid").length;

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <ShoppingCart size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-black text-2xl">Gestion des Ventes</h2>
            <p className="text-slate-500 text-sm">{sales.length} vente(s) enregistrée(s)</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (products.length === 0) { alert("Ajoutez d'abord des produits dans l'onglet Produits !"); return; }
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition"
        >
          <Plus size={17} /> Nouvelle vente
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "CA TTC total", value: formatAmount(totalCA), sub: `HT: ${formatAmount(totalHT_all)}`, icon: <TrendingUp size={18} />, color: "from-emerald-400 to-teal-500", text: "text-emerald-700" },
          { label: "TVA Facturée", value: formatAmount(totalTVA_all), sub: "TVA collectée", icon: <Percent size={18} />, color: "from-violet-400 to-purple-500", text: "text-violet-700" },
          { label: "Encaissé", value: formatAmount(totalEncaisse), sub: `Reste: ${formatAmount(totalReste)}`, icon: <CheckCircle size={18} />, color: "from-blue-400 to-cyan-500", text: "text-blue-700" },
          { label: "Factures soldées", value: `${nbPaid} / ${sales.length}`, sub: "Payées intégralement", icon: <ReceiptText size={18} />, color: "from-orange-400 to-amber-500", text: "text-orange-700" },
        ].map(({ label, value, sub, icon, color, text }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shrink-0`}>
              {icon}
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">{label}</div>
              <div className={`font-black text-base ${text}`}>{value}</div>
              <div className="text-xs text-slate-400">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {sales.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-200 p-16 text-center">
          <ShoppingCart size={52} className="mx-auto text-emerald-200 mb-4" />
          <h3 className="text-slate-700 font-bold text-lg mb-2">Aucune vente enregistrée</h3>
          <p className="text-slate-400 text-sm mb-6">Créez votre première vente pour commencer à générer des factures.</p>
          <button
            onClick={() => { if (products.length === 0) { alert("Ajoutez d'abord des produits !"); return; } setShowForm(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:opacity-90 transition"
          >
            <Plus size={16} /> Créer ma première vente
          </button>
        </div>
      )}

      {/* ── Sales table ── */}
      {sales.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <FileText size={16} className="text-emerald-500" /> Liste des ventes & factures
            </h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              {sales.length} vente(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="text-left px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Réf.</th>
                  <th className="text-left px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Articles</th>
                  <th className="text-right px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">HT</th>
                  <th className="text-right px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">TVA</th>
                  <th className="text-right px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">TTC</th>
                  <th className="text-right px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Payé</th>
                  <th className="text-right px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Reste</th>
                  <th className="text-center px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Statut</th>
                  <th className="text-center px-4 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...sales].reverse().map((s, idx) => (
                  <tr key={s.id} className={`border-b border-slate-50 hover:bg-violet-50/30 transition group ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100">{s.ref}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {formatDateTime(s.createdAt, s.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {s.clientName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">{s.clientName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.items.slice(0, 2).map((item, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {item.productName} ×{item.qty}
                          </span>
                        ))}
                        {s.items.length > 2 && (
                          <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">+{s.items.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 text-sm">{formatAmount(s.totalHT ?? s.total)}</td>
                    <td className="px-4 py-3 text-right text-violet-600 text-sm font-semibold">
                      {(s.totalTVA ?? 0) > 0 ? formatAmount(s.totalTVA) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">{formatAmount(s.total)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatAmount(s.paid)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">
                      {s.total - s.paid > 0 ? formatAmount(s.total - s.paid) : <span className="text-emerald-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setSelectedSale(s)} title="Voir la facture"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-xs font-bold transition border border-violet-200">
                          <Eye size={13} /> Facture
                        </button>
                        <button onClick={() => setSelectedSale(s)} title="Imprimer"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition border border-slate-200">
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <td colSpan={4} className="px-4 py-3.5 font-bold text-sm">TOTAUX</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-300">{formatAmount(totalHT_all)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-violet-300">{formatAmount(totalTVA_all)}</td>
                  <td className="px-4 py-3.5 text-right font-black text-white">{formatAmount(totalCA)}</td>
                  <td className="px-4 py-3.5 text-right font-black text-emerald-300">{formatAmount(totalEncaisse)}</td>
                  <td className="px-4 py-3.5 text-right font-black text-red-300">{totalReste > 0 ? formatAmount(totalReste) : "—"}</td>
                  <td colSpan={2} className="px-4 py-3.5 text-center text-xs text-slate-400">{nbPaid}/{sales.length} payées</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {selectedSale && <InvoiceModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}

      {/* ── New Sale Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Nouvelle Vente</h3>
                  <p className="text-emerald-100 text-xs">Les prix HT + TVA sont calculés automatiquement</p>
                </div>
              </div>
              <button onClick={resetForm} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition">
                <X size={18} className="text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Client & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Client</label>
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setIsNewClient(false)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${!isNewClient ? "bg-teal-500 text-white border-teal-500 shadow" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                        Client existant
                      </button>
                      <button type="button" onClick={() => setIsNewClient(true)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${isNewClient ? "bg-teal-500 text-white border-teal-500 shadow" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                        + Nouveau client
                      </button>
                    </div>
                    {isNewClient ? (
                      <input className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 transition"
                        placeholder="Nom du nouveau client" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                    ) : (
                      <select required className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 transition bg-white"
                        value={clientId} onChange={(e) => setClientId(e.target.value)}>
                        <option value="">— Sélectionner un client —</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Date de vente</label>
                    <input type="date" required className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 transition"
                      value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>

                {/* Articles */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Articles</label>
                    <button type="button" onClick={addItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition border border-teal-200">
                      <Plus size={12} /> Ajouter une ligne
                    </button>
                  </div>

                  {/* En-tête colonnes */}
                  <div className="grid grid-cols-12 gap-2 mb-1 px-2">
                    <div className="col-span-4 text-xs text-slate-400 font-semibold">Produit</div>
                    <div className="col-span-1 text-xs text-slate-400 font-semibold text-center">Qté</div>
                    <div className="col-span-2 text-xs text-slate-400 font-semibold text-right">PU HT ({symbol})</div>
                    <div className="col-span-2 text-xs text-slate-400 font-semibold text-center flex items-center gap-1"><Percent size={10} />TVA %</div>
                    <div className="col-span-1 text-xs text-slate-400 font-semibold text-right">TVA</div>
                    <div className="col-span-1 text-xs text-slate-400 font-semibold text-right">TTC</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => {
                      const selProd = products.find((p) => p.id === item.productId);
                      const lineErr = stockErrors[idx];
                      const lc      = lineCalc[idx];
                      const qtyNum  = parseFloat(item.qty) || 0;
                      const isOverStock  = selProd && qtyNum > selProd.stock;
                      const isOutOfStock = selProd && selProd.stock === 0;
                      return (
                        <div key={idx} className={`grid grid-cols-12 gap-2 items-start rounded-xl p-2.5 border-2 transition ${lineErr ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
                          {/* Produit */}
                          <div className="col-span-4">
                            <select
                              className={`w-full border-2 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none bg-white transition ${isOutOfStock ? "border-red-400 text-red-600" : "border-slate-200 focus:border-teal-400"}`}
                              value={item.productId}
                              onChange={(e) => updateItem(idx, "productId", e.target.value)}
                            >
                              <option value="">— Produit —</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                                  {p.stock === 0 ? "⛔ " : p.stock <= (p.minStock ?? 5) ? "⚠️ " : "✓ "}
                                  {p.name} (Stock: {p.stock})
                                </option>
                              ))}
                            </select>
                            {selProd && (
                              <div className="mt-0.5 text-xs text-slate-400">
                                Dispo: <span className={`font-bold ${selProd.stock === 0 ? "text-red-600" : selProd.stock <= (selProd.minStock ?? 5) ? "text-orange-600" : "text-emerald-600"}`}>{selProd.stock} {selProd.unit}</span>
                                {isOutOfStock && <span className="ml-2 font-black text-red-600 animate-pulse">⛔ Rupture</span>}
                              </div>
                            )}
                          </div>
                          {/* Qté */}
                          <div className="col-span-1">
                            <input type="number" min="1" max={selProd?.stock || undefined} placeholder="Qté"
                              className={`w-full border-2 rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none transition bg-white ${isOverStock ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-teal-400"}`}
                              value={item.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                            {isOverStock && <div className="text-xs text-red-600 font-bold text-center">Max:{selProd?.stock}</div>}
                          </div>
                          {/* Prix HT */}
                          <div className="col-span-2">
                            <input type="number" min="0" step="0.01" placeholder="0.00"
                              className="w-full border-2 border-slate-200 rounded-lg px-1.5 py-1.5 text-xs text-right focus:outline-none focus:border-teal-400 bg-white transition"
                              value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                          </div>
                          {/* TVA % */}
                          <div className="col-span-2">
                            <div className="relative">
                              <input type="number" min="0" max="100" step="0.1" placeholder="0"
                                className="w-full border-2 border-violet-200 rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none focus:border-violet-400 bg-violet-50 transition"
                                value={item.tvaRate} onChange={(e) => updateItem(idx, "tvaRate", e.target.value)} />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-violet-400 font-bold">%</span>
                            </div>
                            {lc.tvaRate > 0 && <div className="text-xs text-violet-500 text-center mt-0.5 font-semibold">TVA: {formatAmount(lc.tva)}</div>}
                          </div>
                          {/* TVA montant */}
                          <div className="col-span-1 text-right text-xs text-violet-600 font-bold pt-2">
                            {lc.tva > 0 ? formatAmount(lc.tva) : <span className="text-slate-300">—</span>}
                          </div>
                          {/* TTC */}
                          <div className="col-span-1 text-right text-xs text-slate-800 font-black pt-2">
                            {lc.ttc > 0 ? formatAmount(lc.ttc) : "—"}
                          </div>
                          {/* Supprimer */}
                          <div className="col-span-1 flex justify-end pt-1">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          {lineErr && (
                            <div className="col-span-12 flex items-center gap-1.5 text-xs text-red-700 font-bold bg-red-100 rounded-lg px-3 py-1.5 mt-0.5 border border-red-200">
                              <AlertCircle size={12} /> {lineErr}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Récapitulatif TVA */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100 space-y-2">
                  <h4 className="text-xs font-black text-violet-700 uppercase tracking-wider flex items-center gap-2">
                    <Percent size={12} /> Récapitulatif TVA
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-xl p-3 border border-violet-100">
                      <div className="text-xs text-slate-500 mb-1">Total HT</div>
                      <div className="font-black text-slate-800">{formatAmount(totalHT)}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-violet-200">
                      <div className="text-xs text-violet-600 mb-1 font-semibold">TVA Facturée</div>
                      <div className="font-black text-violet-700">{formatAmount(totalTVA)}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-teal-200">
                      <div className="text-xs text-teal-600 mb-1 font-semibold">Total TTC</div>
                      <div className="font-black text-teal-700 text-lg">{formatAmount(total)}</div>
                    </div>
                  </div>
                </div>

                {/* Paiement */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 space-y-4 border border-emerald-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                      Montant encaissé ({symbol}) — sur {formatAmount(total)} TTC
                    </label>
                    <div className="relative">
                      <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" min="0" max={total} step="0.01"
                        className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 bg-white transition"
                        value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0.00" />
                    </div>
                    {total > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Avancement du paiement</span>
                          <span>{Math.min(100, Math.round((paidNum / total) * 100))}%</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (paidNum / total) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-teal-100">
                    <span className="text-slate-600 font-semibold">Reste à payer (TTC)</span>
                    <span className={`font-black text-xl ${remaining > 0 ? "text-red-500" : "text-emerald-600"}`}>
                      {formatAmount(remaining)}
                    </span>
                  </div>
                </div>

                {/* Statut */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Statut de la facture :</span>
                  {paidNum >= total && total > 0
                    ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle size={11} />Payée</span>
                    : paidNum > 0
                    ? <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full"><Clock size={11} />Partielle</span>
                    : <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full"><AlertCircle size={11} />Impayée</span>
                  }
                </div>

                {/* Alertes stock */}
                {stockErrors.some(Boolean) && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={15} className="text-red-600" />
                      <span className="text-red-700 font-black text-xs">⛔ VENTE BLOQUÉE — Problèmes de stock</span>
                    </div>
                    {stockErrors.filter(Boolean).map((err, i) => (
                      <div key={i} className="text-xs text-red-600 font-semibold ml-5">• {err}</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetForm}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">
                    Annuler
                  </button>
                  <button type="submit" disabled={stockErrors.some(Boolean)}
                    className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition flex items-center justify-center gap-2 ${stockErrors.some(Boolean) ? "bg-slate-300 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"}`}>
                    <FileText size={16} /> Enregistrer & Générer la facture
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
