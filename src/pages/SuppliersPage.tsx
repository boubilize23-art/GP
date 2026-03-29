import { useState } from "react";
import { useApp, Supplier, PaymentRecord } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Plus, Building2, X, Pencil, Trash2, Search, CheckCircle, AlertCircle,
  Phone, Mail, MapPin, ShoppingBag, TrendingDown, UserCheck, UserX, Eye,
  Banknote, History, ChevronDown, ChevronUp, BadgeCheck, Clock, Wallet
} from "lucide-react";

interface FormState {
  name: string; contact: string; phone: string; email: string; address: string;
}
const emptyForm: FormState = { name: "", contact: "", phone: "", email: "", address: "" };
type Tab = "all" | "paid" | "debt";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getStatus(balance: number) {
  if (balance > 0) return { label: "En dette",  color: "bg-orange-100 text-orange-700 border-orange-200",  icon: <AlertCircle size={12} /> };
  return              { label: "Payé",      color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle  size={12} /> };
}

// ── Modal paiement ────────────────────────────────────────────────────────────
function PaymentModal({
  supplier, onClose, onPay, formatAmount,
}: {
  supplier: Supplier;
  onClose: () => void;
  onPay: (amount: number, note: string) => void;
  formatAmount: (n: number) => string;
}) {
  const [amount, setAmount]           = useState("");
  const [note,   setNote]             = useState("");
  const [mode,   setMode]             = useState<"partial" | "full">("partial");
  const [showHistory, setShowHistory] = useState(false);
  const [error,  setError]            = useState("");

  const amountNum = parseFloat(amount) || 0;
  const afterPay  = mode === "full" ? 0 : Math.max(0, supplier.balance - amountNum);
  const progress  = (supplier.totalPaid + supplier.balance) > 0
    ? (supplier.totalPaid / (supplier.totalPaid + supplier.balance)) * 100
    : 100;

  const handlePay = () => {
    const val = mode === "full" ? supplier.balance : amountNum;
    if (val <= 0)                { setError("Montant invalide");                            return; }
    if (val > supplier.balance)  { setError(`Maximum : ${formatAmount(supplier.balance)}`); return; }
    onPay(val, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-violet-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center font-black text-white text-lg">
              {supplier.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{supplier.name}</h3>
              <p className="text-xs text-slate-500">Règlement de dette fournisseur</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/80 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Situation financière */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-xs text-orange-500 font-semibold mb-1">Dette restante</p>
              <p className="font-black text-orange-600 text-sm">{formatAmount(supplier.balance)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-500 font-semibold mb-1">Déjà réglé</p>
              <p className="font-black text-emerald-600 text-sm">{formatAmount(supplier.totalPaid)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">Taux règlement</p>
              <p className="font-black text-slate-700 text-sm">{progress.toFixed(0)}%</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progression du règlement</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-full transition-all"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Mode */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Mode de règlement</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode("partial")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mode === "partial" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                <Wallet size={16} /> Paiement partiel
              </button>
              <button onClick={() => setMode("full")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mode === "full" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                <BadgeCheck size={16} /> Solder entièrement
              </button>
            </div>
          </div>

          {/* Montant */}
          {mode === "partial" ? (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Montant réglé *</label>
              <div className="relative">
                <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number" min="0.01" max={supplier.balance} step="0.01"
                  className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-purple-400 transition"
                  placeholder={`Max : ${formatAmount(supplier.balance)}`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(""); }}
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1 font-semibold">{error}</p>}
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct}
                    onClick={() => setAmount(((supplier.balance * pct) / 100).toFixed(2))}
                    className="flex-1 py-1.5 text-xs font-bold bg-slate-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition">
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <BadgeCheck size={24} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-700 text-sm">Solde complet</p>
                <p className="text-emerald-600 text-xs">
                  Montant : <strong>{formatAmount(supplier.balance)}</strong> — La dette sera entièrement soldée
                </p>
              </div>
            </div>
          )}

          {/* Aperçu après règlement */}
          {(mode === "full" || amountNum > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Après ce règlement</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Dette restante :</span>
                <span className={`font-black text-sm ${afterPay === 0 ? "text-emerald-600" : "text-orange-500"}`}>
                  {afterPay === 0 ? "✓ Soldé" : formatAmount(afterPay)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Nouveau statut :</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  afterPay === 0 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                  {afterPay === 0 ? "✅ Payé" : "🟠 En dette"}
                </span>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Référence / Mode de paiement</label>
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 transition"
              placeholder="Ex: Virement n°, Chèque, Espèces..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button onClick={handlePay}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2">
              <Banknote size={16} />
              {mode === "full" ? "Solder le compte" : "Enregistrer le règlement"}
            </button>
          </div>

          {/* Historique */}
          {supplier.paymentHistory.length > 0 && (
            <div>
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition w-full">
                <History size={14} />
                Historique des règlements ({supplier.paymentHistory.length})
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {supplier.paymentHistory.map((rec: PaymentRecord) => (
                    <div key={rec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          rec.type === "full" ? "bg-emerald-100" : "bg-blue-100"}`}>
                          {rec.type === "full"
                            ? <BadgeCheck size={14} className="text-emerald-600" />
                            : <Clock      size={14} className="text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{rec.note || "Règlement"}</p>
                          <p className="text-xs text-slate-400">{new Date(rec.date).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-purple-600">{formatAmount(rec.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          rec.type === "full" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {rec.type === "full" ? "Soldé" : "Versement"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const {
    suppliers, purchases,
    addSupplier, updateSupplier, deleteSupplier, paySupplier,
  } = useApp();
  const { formatAmount } = useCurrency();

  const [tab,             setTab]             = useState<Tab>("all");
  const [showForm,        setShowForm]        = useState(false);
  const [editId,          setEditId]          = useState<string | null>(null);
  const [form,            setForm]            = useState<FormState>(emptyForm);
  const [search,          setSearch]          = useState("");
  const [detailId,        setDetailId]        = useState<string | null>(null);
  const [payModalId,      setPayModalId]      = useState<string | null>(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState<string | null>(null);

  // Données toujours réactives — lire depuis le tableau `suppliers` en temps réel
  const detailSupplier = detailId    ? suppliers.find((s) => s.id === detailId)    ?? null : null;
  const payModalSupplier = payModalId ? suppliers.find((s) => s.id === payModalId) ?? null : null;

  // Onglets
  const suppliersWithDebt = suppliers.filter((s) => s.balance > 0);
  const suppliersPaid     = suppliers.filter((s) => s.balance === 0 && (s.totalPaid > 0 || purchases.some(p => p.supplierId === s.id)));

  const displayed = (() => {
    let list = tab === "all" ? suppliers : tab === "paid" ? suppliersPaid : suppliersWithDebt;
    if (search) list = list.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
    );
    return list;
  })();

  const totalDettes = suppliers.reduce((s, sup) => s + sup.balance,    0);
  const totalRegle  = suppliers.reduce((s, sup) => s + sup.totalPaid,  0);

  const supplierPurchases = (id: string) => purchases.filter((p) => p.supplierId === id);

  const openEdit = (s: Supplier) => {
    setForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, address: s.address });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) updateSupplier(editId, form);
    else        addSupplier(form);
    setShowForm(false); setEditId(null); setForm(emptyForm);
  };

  const handlePay = (supplierId: string, amount: number, note: string) => {
    paySupplier(supplierId, amount, note);
    // Laisser le modal ouvert se fermer via onClose — pas besoin de reset ici
  };

  const openDetail = (s: Supplier) => {
    setPayModalId(null);
    setDetailId(s.id);
  };

  const openPayModal = (s: Supplier) => {
    setDetailId(null);
    setPayModalId(s.id);
  };

  const TABS = [
    { id: "all"  as Tab, label: "Tous",     count: suppliers.length,         color: "from-purple-400 to-violet-500" },
    { id: "paid" as Tab, label: "Payés",    count: suppliersPaid.length,     color: "from-emerald-400 to-teal-500" },
    { id: "debt" as Tab, label: "En dette", count: suppliersWithDebt.length, color: "from-orange-400 to-amber-500" },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-xl">Fournisseurs</h2>
            <p className="text-slate-500 text-sm">
              {suppliers.length} fournisseur(s) — Dettes : <span className="font-bold text-orange-500">{formatAmount(totalDettes)}</span>
              {" "}— Réglé : <span className="font-bold text-emerald-600">{formatAmount(totalRegle)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-xl font-semibold shadow hover:opacity-90 transition text-sm">
          <Plus size={16} /> Nouveau fournisseur
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total fournisseurs", value: suppliers.length,              icon: <Building2   size={18} />, color: "from-purple-400 to-violet-500", text: "text-purple-600" },
          { label: "Payés",              value: suppliersPaid.length,           icon: <UserCheck   size={18} />, color: "from-emerald-400 to-teal-500",  text: "text-emerald-600" },
          { label: "Avec dettes",        value: suppliersWithDebt.length,       icon: <UserX       size={18} />, color: "from-orange-400 to-amber-500",  text: "text-orange-600" },
          { label: "Total dettes",       value: formatAmount(totalDettes),      icon: <TrendingDown size={18}/>, color: "from-red-400 to-orange-400",    text: "text-red-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                <span className="text-white">{kpi.icon}</span>
              </div>
            </div>
            <p className={`font-black text-xl ${kpi.text}`}>{kpi.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              tab === t.id ? `bg-gradient-to-r ${t.color} text-white` : "bg-slate-200 text-slate-500"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          placeholder="Rechercher un fournisseur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Formulaire ajout/modif */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-purple-500" />
              {editId ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nom de l'entreprise *</label>
              <input required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du fournisseur" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact principal</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Nom du contact" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Téléphone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+33 1 00 00 00 00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@fournisseur.com" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Adresse</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ville, Pays" />
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition">
                <CheckCircle size={14} /> {editId ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerte dettes */}
      {tab === "debt" && suppliersWithDebt.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-orange-700 text-sm">
              {suppliersWithDebt.length} fournisseur(s) ont des dettes en cours
            </p>
            <p className="text-orange-600 text-xs mt-0.5">
              Total à régler : <strong>{formatAmount(totalDettes)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Tableau */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Building2 size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">
            {search
              ? "Aucun fournisseur trouvé"
              : tab === "debt" ? "Aucune dette fournisseur 🎉"
              : tab === "paid" ? "Aucun fournisseur soldé"
              : "Aucun fournisseur enregistré"}
          </p>
          {!search && tab === "all" && (
            <button onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-xl text-sm font-semibold">
              Ajouter un fournisseur
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fournisseur</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Total achats</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Réglé</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dette restante</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((s) => {
                const status      = getStatus(s.balance);
                const surchases   = supplierPurchases(s.id);
                const totalAchats = surchases.reduce((sum, p) => sum + p.total, 0);
                const pct         = (s.totalPaid + s.balance) > 0
                  ? (s.totalPaid / (s.totalPaid + s.balance)) * 100
                  : s.totalPaid > 0 ? 100 : 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                          s.balance > 0 ? "bg-gradient-to-br from-orange-400 to-amber-500" : "bg-gradient-to-br from-emerald-400 to-teal-500"}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-400 to-violet-500 rounded-full"
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-slate-600 text-xs">{s.contact || "—"}</p>
                      <p className="text-slate-400 text-xs">{s.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="font-semibold text-slate-700">{formatAmount(totalAchats)}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="font-semibold text-emerald-600">{formatAmount(s.totalPaid)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${s.balance > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                        {s.balance > 0 ? formatAmount(s.balance) : "✓ Soldé"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Voir fiche */}
                        <button onClick={() => openDetail(s)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Voir fiche">
                          <Eye size={15} />
                        </button>
                        {/* Régler dette */}
                        {s.balance > 0 && (
                          <button onClick={() => openPayModal(s)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Régler dette">
                            <Banknote size={15} />
                          </button>
                        )}
                        {/* Modifier */}
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Modifier">
                          <Pencil size={15} />
                        </button>
                        {/* Supprimer */}
                        {deleteConfirm === s.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { deleteSupplier(s.id); setDeleteConfirm(null); if (detailId === s.id) setDetailId(null); }}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">Oui</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">Non</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(s.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Supprimer">
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
                  Total ({displayed.length} fournisseurs)
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800 text-sm hidden sm:table-cell">
                  {formatAmount(displayed.reduce((s, sup) => s + supplierPurchases(sup.id).reduce((ss, p) => ss + p.total, 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm hidden sm:table-cell">
                  {formatAmount(displayed.reduce((s, sup) => s + sup.totalPaid, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-orange-600 text-sm">
                  {formatAmount(displayed.reduce((s, sup) => s + sup.balance, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Modal fiche détail fournisseur ─────────────────────────────────────── */}
      {detailSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={18} className="text-purple-500" /> Fiche fournisseur
              </h3>
              <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Identité */}
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white ${
                  detailSupplier.balance > 0
                    ? "bg-gradient-to-br from-orange-400 to-amber-500"
                    : "bg-gradient-to-br from-emerald-400 to-teal-500"}`}>
                  {detailSupplier.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-lg">{detailSupplier.name}</p>
                  <p className="text-slate-500 text-sm">{detailSupplier.contact || "—"} · {detailSupplier.phone || "—"}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-xs font-semibold mt-1 ${getStatus(detailSupplier.balance).color}`}>
                    {getStatus(detailSupplier.balance).icon} {getStatus(detailSupplier.balance).label}
                  </span>
                </div>
                {detailSupplier.balance > 0 && (
                  <button
                    onClick={() => { setDetailId(null); setPayModalId(detailSupplier.id); }}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-xl text-xs font-bold shadow hover:opacity-90 transition">
                    <Banknote size={14} /> Régler
                  </button>
                )}
              </div>

              {/* Coordonnées */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                {detailSupplier.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" /> {detailSupplier.email}
                  </div>
                )}
                {detailSupplier.address && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="text-slate-400" /> {detailSupplier.address}
                  </div>
                )}
              </div>

              {/* Stats financières */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <p className="text-xs text-slate-400 mb-1">Commandes</p>
                  <p className="font-black text-slate-800 text-xl">{supplierPurchases(detailSupplier.id).length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                  <p className="text-xs text-emerald-500 mb-1">Réglé</p>
                  <p className="font-black text-emerald-600 text-sm">{formatAmount(detailSupplier.totalPaid)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${detailSupplier.balance > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-xs mb-1 ${detailSupplier.balance > 0 ? "text-orange-500" : "text-slate-400"}`}>Dette</p>
                  <p className={`font-black text-sm ${detailSupplier.balance > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                    {detailSupplier.balance > 0 ? formatAmount(detailSupplier.balance) : "Soldé ✓"}
                  </p>
                </div>
              </div>

              {/* Historique règlements */}
              {detailSupplier.paymentHistory.length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                    <History size={14} className="text-purple-500" /> Historique des règlements
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detailSupplier.paymentHistory.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">{rec.note || "Règlement"}</p>
                          <p className="text-slate-400 text-xs">{new Date(rec.date).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-purple-600 text-sm">{formatAmount(rec.amount)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            rec.type === "full" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {rec.type === "full" ? "Soldé" : "Versement"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique commandes */}
              <div>
                <p className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                  <ShoppingBag size={14} className="text-purple-500" /> Historique des commandes
                </p>
                {supplierPurchases(detailSupplier.id).length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Aucune commande enregistrée</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {supplierPurchases(detailSupplier.id).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{p.ref}</p>
                          <p className="text-slate-400 text-xs">{new Date(p.date).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800 text-sm">{formatAmount(p.total)}</p>
                          <div className="text-xs mt-0.5">
                            <span className="text-emerald-600 font-semibold">Payé: {formatAmount(p.paid)}</span>
                            {p.total - p.paid > 0 && (
                              <span className="text-orange-500 font-semibold ml-2">Reste: {formatAmount(p.total - p.paid)}</span>
                            )}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                            {p.status === "paid" ? "Payé" : "En dette"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal paiement fournisseur ─────────────────────────────────────────── */}
      {payModalSupplier && (
        <PaymentModal
          supplier={payModalSupplier}
          onClose={() => setPayModalId(null)}
          onPay={(amount, note) => handlePay(payModalSupplier.id, amount, note)}
          formatAmount={formatAmount}
        />
      )}
    </div>
  );
}
