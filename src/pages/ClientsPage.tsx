import { useState } from "react";
import { useApp, Client, PaymentRecord } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Plus, Users, X, Pencil, Trash2, Search, CheckCircle, AlertCircle,
  Phone, Mail, MapPin, CreditCard, TrendingUp, UserCheck, UserX, Eye,
  Banknote, History, ChevronDown, ChevronUp, BadgeCheck, Clock, Wallet
} from "lucide-react";

interface FormState { name: string; phone: string; email: string; address: string; }
const emptyForm: FormState = { name: "", phone: "", email: "", address: "" };
type Tab = "all" | "paid" | "credit";

// ── Modal paiement client ─────────────────────────────────────────────────────
function PaymentModal({
  client, onClose, onPay, formatAmount
}: {
  client: Client;
  onClose: () => void;
  onPay: (amount: number, note: string) => void;
  formatAmount: (n: number) => string;
}) {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"partial" | "full">("partial");
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");

  const amountNum = parseFloat(amount) || 0;

  const handlePay = () => {
    const val = mode === "full" ? client.balance : amountNum;
    if (val <= 0) { setError("Montant invalide"); return; }
    if (val > client.balance) { setError(`Maximum : ${formatAmount(client.balance)}`); return; }
    onPay(val, note);
    onClose();
  };

  const afterPay = mode === "full" ? 0 : Math.max(0, client.balance - amountNum);
  const progress = client.balance > 0 ? ((client.totalPaid / (client.totalPaid + client.balance)) * 100) : 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center font-black text-white text-lg">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{client.name}</h3>
              <p className="text-xs text-slate-500">Encaissement de créance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/80 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Situation financière */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500 font-semibold mb-1">Créance restante</p>
              <p className="font-black text-red-600 text-sm">{formatAmount(client.balance)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-500 font-semibold mb-1">Déjà encaissé</p>
              <p className="font-black text-emerald-600 text-sm">{formatAmount(client.totalPaid)}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">Taux recouvrement</p>
              <p className="font-black text-slate-700 text-sm">{progress.toFixed(0)}%</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Recouvrement</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Mode de paiement */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Mode de paiement</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("partial")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mode === "partial"
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Wallet size={16} />
                Paiement partiel
              </button>
              <button
                onClick={() => setMode("full")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  mode === "full"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <BadgeCheck size={16} />
                Solder entièrement
              </button>
            </div>
          </div>

          {/* Montant */}
          {mode === "partial" ? (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Montant encaissé *
              </label>
              <div className="relative">
                <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  max={client.balance}
                  step="0.01"
                  className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-pink-400 transition"
                  placeholder={`Max : ${formatAmount(client.balance)}`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(""); }}
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1 font-semibold">{error}</p>}
              {/* Boutons rapides */}
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setAmount(((client.balance * pct) / 100).toFixed(2))}
                    className="flex-1 py-1.5 text-xs font-bold bg-slate-100 hover:bg-pink-100 hover:text-pink-700 rounded-lg transition"
                  >
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
                  Montant : <strong>{formatAmount(client.balance)}</strong> — La créance sera entièrement soldée
                </p>
              </div>
            </div>
          )}

          {/* Aperçu après paiement */}
          {(mode === "full" || amountNum > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Après ce paiement</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Créance restante :</span>
                <span className={`font-black text-sm ${afterPay === 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {afterPay === 0 ? "✓ Soldé" : formatAmount(afterPay)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Nouveau statut :</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  afterPay === 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}>
                  {afterPay === 0 ? "✅ Payé" : "🔴 En créance"}
                </span>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Note / Référence
            </label>
            <input
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 transition"
              placeholder="Ex: Virement bancaire, Espèces, Chèque n°..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handlePay}
              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-bold shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <Banknote size={16} />
              {mode === "full" ? "Solder le compte" : "Enregistrer le paiement"}
            </button>
          </div>

          {/* Historique des paiements */}
          {client.paymentHistory.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition w-full"
              >
                <History size={14} />
                Historique des paiements ({client.paymentHistory.length})
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {client.paymentHistory.map((rec: PaymentRecord) => (
                    <div key={rec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          rec.type === "full" ? "bg-emerald-100" : "bg-blue-100"
                        }`}>
                          {rec.type === "full" ? <BadgeCheck size={14} className="text-emerald-600" /> : <Clock size={14} className="text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{rec.note || "Paiement"}</p>
                          <p className="text-xs text-slate-400">{new Date(rec.date).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-emerald-600">+{formatAmount(rec.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          rec.type === "full" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {rec.type === "full" ? "Soldé" : "Encaissement"}
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

// ── Page principale ────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { clients, sales, receivables, addClient, updateClient, deleteClient, payClient } = useApp();
  const { formatAmount } = useCurrency();

  const [tab, setTab] = useState<Tab>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [payClientModalId, setPayClientModalId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Données réactives — se mettent à jour automatiquement quand clients change
  const detailClient = detailClientId ? clients.find((c) => c.id === detailClientId) ?? null : null;
  const payClient_modal = payClientModalId ? clients.find((c) => c.id === payClientModalId) ?? null : null;

  // Règle stricte : En créance = balance > 0, Payé = balance = 0
  const clientsWithCredit = clients.filter((c) => c.balance > 0);
  const clientsPaid = clients.filter((c) => c.balance === 0 && (c.totalPaid > 0 || sales.some(s => s.clientId === c.id)));

  const displayedClients = (() => {
    let list =
      tab === "all" ? clients :
      tab === "paid" ? clientsPaid :
      clientsWithCredit;
    if (search) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search) || c.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    return list;
  })();

  const totalCreances = clients.reduce((s, c) => s + c.balance, 0);
  const totalRecouvre = clients.reduce((s, c) => s + c.totalPaid, 0);

  const openEdit = (c: Client) => {
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address });
    setEditId(c.id); setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) updateClient(editId, form);
    else addClient(form);
    setShowForm(false); setEditId(null); setForm(emptyForm);
  };

  const handlePay = (clientId: string, amount: number, note: string) => {
    payClient(clientId, amount, note);
    // Le modal se ferme via onClose — pas besoin de reset ici
    // Les données sont réactives via clients du contexte
  };

  const getClientStatus = (c: Client) => {
    // Règle stricte : seulement 2 statuts possibles
    // balance > 0  → "En créance"  (même si des paiements partiels ont été effectués)
    // balance = 0  → "Payé"        (le solde est totalement apuré)
    if (c.balance > 0) {
      return {
        label: "En créance",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: <AlertCircle size={12} />,
      };
    }
    return {
      label: "Payé",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: <CheckCircle size={12} />,
    };
  };

  const getClientSales = (clientId: string) => sales.filter((s) => s.clientId === clientId);
  const getClientReceivables = (clientId: string) => receivables.filter((r) => r.clientId === clientId);

  const TABS = [
    { id: "all" as Tab, label: "Tous", count: clients.length, color: "from-pink-400 to-rose-500" },
    { id: "paid" as Tab, label: "Payés", count: clientsPaid.length, color: "from-emerald-400 to-teal-500" },
    { id: "credit" as Tab, label: "En créance", count: clientsWithCredit.length, color: "from-red-400 to-orange-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-xl">Gestion Clients</h2>
            <p className="text-slate-500 text-sm">
              {clients.length} client(s) — Créances : <span className="font-bold text-red-500">{formatAmount(totalCreances)}</span>
              {" "}— Recouvré : <span className="font-bold text-emerald-600">{formatAmount(totalRecouvre)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-semibold shadow hover:opacity-90 transition text-sm"
        >
          <Plus size={16} /> Nouveau client
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total clients", value: clients.length, icon: <Users size={18} />, color: "from-pink-400 to-rose-500", text: "text-rose-600" },
          { label: "Payés", value: clientsPaid.length, icon: <UserCheck size={18} />, color: "from-emerald-400 to-teal-500", text: "text-emerald-600" },
          { label: "En créance", value: clientsWithCredit.length, icon: <UserX size={18} />, color: "from-red-400 to-orange-400", text: "text-red-600" },
          { label: "Total créances", value: formatAmount(totalCreances), icon: <CreditCard size={18} />, color: "from-amber-400 to-orange-500", text: "text-amber-600" },
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
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              tab === t.id ? `bg-gradient-to-r ${t.color} text-white` : "bg-slate-200 text-slate-500"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users size={16} className="text-pink-500" />
              {editId ? "Modifier le client" : "Nouveau client"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nom complet *</label>
              <input required className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du client" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Téléphone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+33 6 00 00 00 00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Adresse</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Ville, Pays" />
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition">
                <CheckCircle size={14} /> {editId ? "Mettre à jour" : "Ajouter le client"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerte créances */}
      {tab === "credit" && clientsWithCredit.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm">
              {clientsWithCredit.length} client(s) ont des créances impayées
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              Total à recouvrer : <strong>{formatAmount(totalCreances)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {displayedClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Users size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">
            {search ? "Aucun client trouvé" : tab === "credit" ? "Aucun client en créance 🎉" : tab === "paid" ? "Aucun client soldé" : "Aucun client enregistré"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">CA total</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Encaissé</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Créance</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedClients.map((c) => {
                const status = getClientStatus(c);
                const clientSales = getClientSales(c.id);
                const totalCA = clientSales.reduce((s, sale) => s + sale.total, 0);
                const pct = (c.totalPaid + c.balance) > 0 ? (c.totalPaid / (c.totalPaid + c.balance)) * 100 : 100;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                          c.balance > 0 ? "bg-gradient-to-br from-red-400 to-orange-500" :
                          clientSales.length > 0 ? "bg-gradient-to-br from-emerald-400 to-teal-500" :
                          "bg-gradient-to-br from-blue-400 to-indigo-500"
                        }`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-slate-600 text-xs">{c.phone || "—"}</p>
                      <p className="text-slate-400 text-xs">{c.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="font-semibold text-slate-700">{formatAmount(totalCA)}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="font-semibold text-emerald-600">{formatAmount(c.totalPaid)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${c.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {c.balance > 0 ? formatAmount(c.balance) : "✓ Soldé"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetailClientId(c.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Voir détails">
                          <Eye size={15} />
                        </button>
                        {c.balance > 0 && (
                          <button onClick={() => setPayClientModalId(c.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Encaisser paiement">
                            <Banknote size={15} />
                          </button>
                        )}
                        <button onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Modifier">
                          <Pencil size={15} />
                        </button>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { deleteClient(c.id); setDeleteConfirm(null); }}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">Oui</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">Non</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(c.id)}
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
                  Total ({displayedClients.length} clients)
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800 text-sm hidden sm:table-cell">
                  {formatAmount(displayedClients.reduce((s, c) => s + getClientSales(c.id).reduce((ss, sale) => ss + sale.total, 0), 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm hidden sm:table-cell">
                  {formatAmount(displayedClients.reduce((s, c) => s + c.totalPaid, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600 text-sm">
                  {formatAmount(displayedClients.reduce((s, c) => s + c.balance, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal détail client */}
      {detailClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-pink-500" /> Fiche client
              </h3>
              <button onClick={() => setDetailClientId(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white ${
                  detailClient.balance > 0 ? "bg-gradient-to-br from-red-400 to-orange-500" : "bg-gradient-to-br from-emerald-400 to-teal-500"
                }`}>
                  {detailClient.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-lg">{detailClient.name}</p>
                  <p className="text-slate-500 text-sm">{detailClient.phone || "—"} · {detailClient.email || "—"}</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-xs font-semibold mt-1 ${getClientStatus(detailClient).color}`}>
                    {getClientStatus(detailClient).icon} {getClientStatus(detailClient).label}
                  </span>
                </div>
                {detailClient.balance > 0 && (
                  <button
                    onClick={() => { setDetailClientId(null); setPayClientModalId(detailClient!.id); }}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-xl text-xs font-bold shadow hover:opacity-90 transition"
                  >
                    <Banknote size={14} /> Encaisser
                  </button>
                )}
              </div>

              {/* Stats financières */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <p className="text-xs text-slate-400 mb-1">Commandes</p>
                  <p className="font-black text-slate-800 text-xl">{getClientSales(detailClient.id).length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                  <p className="text-xs text-emerald-500 mb-1">Encaissé</p>
                  <p className="font-black text-emerald-600 text-sm">{formatAmount(detailClient.totalPaid)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${detailClient.balance > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-xs mb-1 ${detailClient.balance > 0 ? "text-red-500" : "text-slate-400"}`}>Créance</p>
                  <p className={`font-black text-sm ${detailClient.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {detailClient.balance > 0 ? formatAmount(detailClient.balance) : "Soldé ✓"}
                  </p>
                </div>
              </div>

              {/* Historique paiements */}
              {detailClient.paymentHistory.length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                    <History size={14} className="text-emerald-500" /> Historique des paiements
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detailClient.paymentHistory.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div>
                          <p className="font-semibold text-slate-700 text-xs">{rec.note || "Paiement"}</p>
                          <p className="text-slate-400 text-xs">{new Date(rec.date).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600 text-sm">+{formatAmount(rec.amount)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rec.type === "full" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {rec.type === "full" ? "Soldé" : "Encaissement"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique ventes */}
              <div>
                <p className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-pink-500" /> Historique des achats
                </p>
                {getClientSales(detailClient.id).length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">Aucun achat enregistré</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getClientSales(detailClient.id).map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{sale.ref}</p>
                          <p className="text-slate-400 text-xs">{new Date(sale.date).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800 text-sm">{formatAmount(sale.total)}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            sale.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}>
                            {sale.status === "paid" ? "Payé" : "En créance"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Créances en cours */}
              {getClientReceivables(detailClient.id).filter((r) => r.remaining > 0).length > 0 && (
                <div>
                  <p className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2">
                    <CreditCard size={14} className="text-red-500" /> Créances en cours
                  </p>
                  <div className="space-y-2">
                    {getClientReceivables(detailClient.id).filter((r) => r.remaining > 0).map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{r.saleRef}</p>
                          <p className="text-slate-400 text-xs">Échéance : {new Date(r.dueDate).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <p className="font-bold text-red-600 text-sm">{formatAmount(r.remaining)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal paiement */}
      {payClient_modal && (
        <PaymentModal
          client={payClient_modal}
          onClose={() => setPayClientModalId(null)}
          onPay={(amount, note) => handlePay(payClient_modal.id, amount, note)}
          formatAmount={formatAmount}
        />
      )}
    </div>
  );
}
