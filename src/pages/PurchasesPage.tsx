import { useState } from "react";
import { useApp, PurchaseItem, Purchase } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Plus, ShoppingBag, X, Trash2, CheckCircle, Clock, AlertCircle,
  Send, AlertTriangle, Info, Percent,
} from "lucide-react";

interface FormItem {
  productId: string;
  qty: string;
  unitPrice: string;
  tvaRate: string;
}

export default function PurchasesPage() {
  const { purchases, products, suppliers, addPurchase, addSupplier } = useApp();
  const { currentUser, submitPurchaseRequest } = useAuth();
  const { formatAmount, symbol } = useCurrency();

  const isUser = currentUser?.role === "user";
  const canDirectPurchase = currentUser?.role === "admin" || currentUser?.role === "manager";

  const [mode, setMode]         = useState<"direct" | "request">(isUser ? "request" : "direct");
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId]           = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isNewSupplier, setIsNewSupplier]     = useState(false);
  const [date, setDate]   = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<FormItem[]>([{ productId: "", qty: "1", unitPrice: "", tvaRate: "0" }]);
  const [paid, setPaid]   = useState("");
  const [note, setNote]   = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Calculs TVA ligne par ligne ─────────────────────────────────
  const lineCalc = items.map((item) => {
    const qty     = parseFloat(item.qty)      || 0;
    const price   = parseFloat(item.unitPrice) || 0;
    const tvaRate = parseFloat(item.tvaRate)   || 0;
    const ht      = Math.round(qty * price * 100) / 100;
    const tva     = Math.round(ht * (tvaRate / 100) * 100) / 100;
    const ttc     = Math.round((ht + tva) * 100) / 100;
    return { ht, tva, ttc, tvaRate };
  });

  const totalHT  = Math.round(lineCalc.reduce((s, l) => s + l.ht,  0) * 100) / 100;
  const totalTVA = Math.round(lineCalc.reduce((s, l) => s + l.tva, 0) * 100) / 100;
  const total    = Math.round(lineCalc.reduce((s, l) => s + l.ttc, 0) * 100) / 100;
  const paidNum  = Math.min(parseFloat(paid) || 0, total);

  const addItem    = () => setItems([...items, { productId: "", qty: "1", unitPrice: "", tvaRate: "0" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof FormItem, val: string) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: val };
    if (field === "productId") {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        newItems[idx].unitPrice = String(prod.buyPrice);
        newItems[idx].tvaRate   = String(prod.tvaRate ?? 0);
      }
    }
    setItems(newItems);
  };

  const resetForm = () => {
    setShowForm(false);
    setItems([{ productId: "", qty: "1", unitPrice: "", tvaRate: "0" }]);
    setPaid(""); setSupplierId(""); setNewSupplierName(""); setIsNewSupplier(false); setNote("");
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let resolvedSupplierId   = supplierId;
    let resolvedSupplierName = "";

    if (isNewSupplier && newSupplierName.trim()) {
      resolvedSupplierId   = addSupplier({ name: newSupplierName.trim(), contact: "", phone: "", email: "", address: "" });
      resolvedSupplierName = newSupplierName.trim();
    } else {
      const sup = suppliers.find((s) => s.id === resolvedSupplierId);
      if (!sup) { alert("Veuillez sélectionner un fournisseur."); return; }
      resolvedSupplierName = sup.name;
    }

    const purchaseItems: PurchaseItem[] = items
      .filter((i) => i.productId && parseFloat(i.qty) > 0)
      .map((i, idx) => {
        const prod = products.find((p) => p.id === i.productId);
        const lc   = lineCalc[idx];
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

    if (purchaseItems.length === 0) { alert("Ajoutez au moins un article."); return; }

    if (mode === "request" || isUser) {
      submitPurchaseRequest({
        requestedBy:  currentUser!.id,
        supplierId:   resolvedSupplierId,
        supplierName: resolvedSupplierName,
        items:        purchaseItems.map(pi => ({ productId: pi.productId, productName: pi.productName, qty: pi.qty, unitPrice: pi.unitPrice, total: pi.total })),
        total,
        date,
        note,
      });
      setSubmitted(true);
    } else {
      const status: Purchase["status"] = paidNum >= total ? "paid" : paidNum > 0 ? "partial" : "unpaid";
      addPurchase({
        supplierId:   resolvedSupplierId,
        supplierName: resolvedSupplierName,
        items:        purchaseItems,
        totalHT,
        totalTVA,
        total,
        paid:         paidNum,
        date,
        status,
      });
      resetForm();
    }
  };

  const statusBadge = (status: string) => {
    if (status === "paid")    return <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full"><CheckCircle size={11} />Payé</span>;
    if (status === "partial") return <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full"><Clock size={11} />Partiel</span>;
    return <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full"><AlertCircle size={11} />Impayé</span>;
  };

  const totalAchatsHT  = purchases.reduce((s, p) => s + (p.totalHT  ?? p.total), 0);
  const totalAchatsTVA = purchases.reduce((s, p) => s + (p.totalTVA ?? 0), 0);
  const totalAchatsTTC = purchases.reduce((s, p) => s + p.total, 0);
  const totalPaid      = purchases.reduce((s, p) => s + p.paid, 0);
  const totalReste     = purchases.reduce((s, p) => s + Math.max(0, p.total - p.paid), 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
            <ShoppingBag size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Gestion des Achats</h2>
            <p className="text-slate-400 text-sm">{purchases.length} achat(s) enregistré(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canDirectPurchase && (
            <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1">
              <button onClick={() => setMode("direct")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "direct" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                <ShoppingBag size={13} /> Achat direct
              </button>
              <button onClick={() => setMode("request")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "request" ? "bg-amber-500 text-black" : "text-slate-400 hover:text-white"}`}>
                <Send size={13} /> Soumettre demande
              </button>
            </div>
          )}
          <button
            onClick={() => { if (products.length === 0) { alert("Ajoutez d'abord des produits !"); return; } setShowForm(true); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow transition text-sm
              ${isUser || mode === "request" ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black" : "bg-gradient-to-r from-blue-400 to-cyan-500 text-white"}`}
          >
            <Plus size={16} />
            {isUser || mode === "request" ? "Soumettre une demande" : "Nouvel achat direct"}
          </button>
        </div>
      </div>

      {/* Role banner */}
      {isUser && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 font-semibold text-sm">Mode Utilisateur — Approbation requise</p>
            <p className="text-slate-400 text-xs mt-0.5">Vos demandes d'achat doivent être approuvées par un manager ou administrateur avant d'être exécutées.</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total HT",      value: formatAmount(totalAchatsHT),  color: "text-slate-300",  bg: "from-slate-500/20 to-slate-500/10" },
          { label: "TVA Récupérable", value: formatAmount(totalAchatsTVA), color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/10" },
          { label: "Total TTC",     value: formatAmount(totalAchatsTTC), color: "text-blue-400",   bg: "from-blue-500/20 to-cyan-500/10" },
          { label: "Montant payé",  value: formatAmount(totalPaid),      color: "text-emerald-400", bg: "from-emerald-500/20 to-teal-500/10" },
          { label: "Reste dû",      value: formatAmount(totalReste),     color: "text-red-400",    bg: "from-red-500/20 to-rose-500/10" },
        ].map((k, i) => (
          <div key={i} className={`bg-gradient-to-br ${k.bg} border border-slate-700 rounded-xl p-4`}>
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-slate-400 text-xs mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {purchases.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-600 rounded-2xl p-12 text-center">
          <ShoppingBag size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-slate-400 font-semibold text-lg mb-2">Aucun achat enregistré</h3>
          <p className="text-slate-500 text-sm">Les achats approuvés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">Réf.</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">Fournisseur</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase">HT</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase">TVA récup.</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase">TTC</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase">Payé</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase">Reste</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-semibold text-xs uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {[...purchases].reverse().map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition">
                    <td className="px-4 py-3 font-mono text-xs text-violet-400">{p.ref}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.supplierName}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatAmount(p.totalHT ?? p.total)}</td>
                    <td className="px-4 py-3 text-right text-violet-400">
                      {(p.totalTVA ?? 0) > 0 ? formatAmount(p.totalTVA) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">{formatAmount(p.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatAmount(p.paid)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-medium">
                      {p.total - p.paid > 0 ? formatAmount(p.total - p.paid) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/40 border-t border-slate-700">
                  <td colSpan={3} className="px-4 py-3 text-slate-400 font-semibold">Totaux</td>
                  <td className="px-4 py-3 text-right font-black text-slate-300">{formatAmount(totalAchatsHT)}</td>
                  <td className="px-4 py-3 text-right font-black text-violet-400">{formatAmount(totalAchatsTVA)}</td>
                  <td className="px-4 py-3 text-right font-black text-white">{formatAmount(totalAchatsTTC)}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-400">{formatAmount(totalPaid)}</td>
                  <td className="px-4 py-3 text-right font-black text-red-400">{formatAmount(totalReste)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isUser || mode === "request" ? "bg-amber-500/20" : "bg-blue-500/20"}`}>
                  {isUser || mode === "request" ? <Send size={18} className="text-amber-400" /> : <ShoppingBag size={18} className="text-blue-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-white">
                    {isUser || mode === "request" ? "Soumettre une demande d'achat" : "Nouvel Achat Direct"}
                  </h3>
                  <p className="text-slate-500 text-xs">Les prix HT + TVA récupérable sont calculés automatiquement</p>
                </div>
              </div>
              <button onClick={resetForm} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            {submitted ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                  <Send size={36} className="text-amber-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Demande soumise !</h3>
                <p className="text-slate-400 text-sm mb-6">Un manager ou administrateur devra l'approuver pour l'exécuter.</p>
                <button onClick={resetForm} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors">Fermer</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Fournisseur */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fournisseur</label>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setIsNewSupplier(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!isNewSupplier ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                      Existant
                    </button>
                    <button type="button" onClick={() => setIsNewSupplier(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isNewSupplier ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                      Nouveau
                    </button>
                  </div>
                  {isNewSupplier ? (
                    <input className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Nom du fournisseur" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                  ) : (
                    <select required className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                      value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                      <option value="">-- Sélectionner --</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                  <input type="date" required className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                {/* Articles avec TVA */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400">Articles</label>
                    <button type="button" onClick={addItem} className="text-xs text-blue-400 font-semibold flex items-center gap-1 hover:text-blue-300">
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>

                  {/* En-têtes */}
                  <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                    <div className="col-span-4 text-xs text-slate-500">Produit</div>
                    <div className="col-span-1 text-xs text-slate-500 text-center">Qté</div>
                    <div className="col-span-2 text-xs text-slate-500 text-right">PU HT</div>
                    <div className="col-span-2 text-xs text-slate-500 text-center flex items-center gap-1"><Percent size={9} />TVA%</div>
                    <div className="col-span-1 text-xs text-slate-500 text-right">TVA</div>
                    <div className="col-span-1 text-xs text-slate-500 text-right">TTC</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-2">
                    {items.map((item, idx) => {
                      const lc = lineCalc[idx];
                      return (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-800/50 rounded-xl p-2">
                          <div className="col-span-4">
                            <select className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                              value={item.productId} onChange={(e) => updateItem(idx, "productId", e.target.value)}>
                              <option value="">-- Produit --</option>
                              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div className="col-span-1">
                            <input type="number" min="1" placeholder="Qté"
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none"
                              value={item.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <input type="number" min="0" step="0.01" placeholder={`PU (${symbol})`}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-1.5 py-1.5 text-xs text-right focus:outline-none"
                              value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                          </div>
                          <div className="col-span-2">
                            <div className="relative">
                              <input type="number" min="0" max="100" step="0.1" placeholder="0"
                                className="w-full bg-violet-900/40 border border-violet-600/40 text-violet-300 rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none"
                                value={item.tvaRate} onChange={(e) => updateItem(idx, "tvaRate", e.target.value)} />
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-violet-500">%</span>
                            </div>
                          </div>
                          <div className="col-span-1 text-right text-xs text-violet-400 font-semibold">
                            {lc.tva > 0 ? formatAmount(lc.tva) : <span className="text-slate-600">—</span>}
                          </div>
                          <div className="col-span-1 text-right text-xs text-white font-black">
                            {lc.ttc > 0 ? formatAmount(lc.ttc) : "—"}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Récap TVA */}
                <div className="bg-violet-900/20 border border-violet-700/30 rounded-xl p-4">
                  <h4 className="text-xs font-black text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Percent size={11} /> TVA Récupérable
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                      <div className="text-xs text-slate-500 mb-1">Total HT</div>
                      <div className="font-black text-white">{formatAmount(totalHT)}</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2 border border-violet-700/40">
                      <div className="text-xs text-violet-400 mb-1 font-semibold">TVA Récup.</div>
                      <div className="font-black text-violet-300">{formatAmount(totalTVA)}</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2 border border-blue-700/40">
                      <div className="text-xs text-blue-400 mb-1 font-semibold">Total TTC</div>
                      <div className="font-black text-blue-300 text-lg">{formatAmount(total)}</div>
                    </div>
                  </div>
                </div>

                {/* Note */}
                {(isUser || mode === "request") && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Note / Justification</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder="Expliquez la raison de cet achat..." rows={2}
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 resize-none" />
                  </div>
                )}

                {/* Paiement direct */}
                {!isUser && mode === "direct" && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Montant payé ({symbol}) — sur {formatAmount(total)} TTC</label>
                      <input type="number" min="0" max={total} step="0.01"
                        className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-blue-500/20">
                      <span className="text-slate-400">Reste dû</span>
                      <span className={`font-bold ${Math.max(0, total - paidNum) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {formatAmount(Math.max(0, total - paidNum))}
                      </span>
                    </div>
                  </div>
                )}

                {(isUser || mode === "request") && (
                  <div className="flex items-center gap-2 text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <AlertTriangle size={13} />
                    Cette demande sera soumise à approbation avant exécution
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition">Annuler</button>
                  <button type="submit"
                    className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2
                      ${isUser || mode === "request" ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90" : "bg-gradient-to-r from-blue-400 to-cyan-500 text-white hover:opacity-90"}`}>
                    {isUser || mode === "request" ? <><Send size={16} /> Soumettre la demande</> : <><ShoppingBag size={16} /> Enregistrer l'achat</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
