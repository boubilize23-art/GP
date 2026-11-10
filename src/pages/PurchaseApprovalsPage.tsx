import { useState } from "react";
import { useAuth, PurchaseRequest } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  ClipboardList, CheckCircle, XCircle, Clock,
  ShoppingBag, Calendar, AlertTriangle, Search,
  ChevronDown, ChevronUp, Package, Crown, Briefcase, User as UserIcon,
} from "lucide-react";

const STATUS_CONFIG = {
  pending:  { label: "En attente",  color: "text-amber-400",  bg: "bg-amber-500/20 border-amber-500/30",  icon: <Clock size={13} /> },
  approved: { label: "Approuvé",    color: "text-emerald-400",bg: "bg-emerald-500/20 border-emerald-500/30",icon: <CheckCircle size={13} /> },
  rejected: { label: "Rejeté",      color: "text-red-400",    bg: "bg-red-500/20 border-red-500/30",      icon: <XCircle size={13} /> },
};

const ROLE_ICON = {
  admin:   <Crown size={12} className="text-red-400" />,
  manager: <Briefcase size={12} className="text-amber-400" />,
  user:    <UserIcon size={12} className="text-blue-400" />,
};

export default function PurchaseApprovalsPage() {
  const { currentUser, getPendingRequestsForMe, getMyRequests, approvePurchaseRequest, rejectPurchaseRequest } = useAuth();
  const { addPurchase } = useApp();
  const { formatAmount } = useCurrency();

  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveModal, setApproveModal] = useState<PurchaseRequest | null>(null);

  if (!currentUser) return null;

  const pendingForMe = getPendingRequestsForMe();
  const allMyRequests = getMyRequests();

  const displayList = activeTab === "pending" ? pendingForMe : allMyRequests;

  const filtered = displayList.filter((r) => {
    const matchSearch = r.requestedByName.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      r.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleApprove = (req: PurchaseRequest) => {
    approvePurchaseRequest(req.id);
    // Actually execute the purchase in AppContext
    // Convertir les items de la demande vers le format Purchase (avec champs TVA à 0 si absent)
    const purchaseItems = req.items.map((i) => ({
      ...i,
      tvaRate:   (i as { tvaRate?: number }).tvaRate   ?? 0,
      tvaAmount: (i as { tvaAmount?: number }).tvaAmount ?? 0,
      totalHT:   (i as { totalHT?: number }).totalHT   ?? i.total,
    }));
    const totalHT  = purchaseItems.reduce((s, i) => s + i.totalHT,   0);
    const totalTVA = purchaseItems.reduce((s, i) => s + i.tvaAmount, 0);
    addPurchase({
      supplierId: req.supplierId,
      supplierName: req.supplierName,
      items: purchaseItems,
      totalHT,
      totalTVA,
      total: req.total,
      paid: 0,
      date: new Date().toISOString().split("T")[0],
      status: "unpaid",
    });
    setApproveModal(null);
  };

  const handleReject = () => {
    if (!rejectModal || !rejectReason.trim()) return;
    rejectPurchaseRequest(rejectModal.id, rejectReason);
    setRejectModal(null);
    setRejectReason("");
  };

  const canApprove = currentUser.role === "admin" || currentUser.role === "manager";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <ClipboardList size={20} className="text-white" />
            </div>
            Bons d'achat
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {currentUser.role === "user"
              ? "Soumettez vos demandes d'achat pour approbation"
              : "Approuvez ou rejetez les demandes de votre équipe"}
          </p>
        </div>
        {pendingForMe.length > 0 && (
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <span className="text-amber-300 font-semibold">{pendingForMe.length} demande{pendingForMe.length > 1 ? "s" : ""} en attente</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "En attente", value: allMyRequests.filter((r) => r.status === "pending").length, color: "text-amber-400", bg: "from-amber-500/20 to-orange-500/10", icon: <Clock size={20} /> },
          { label: "Approuvés", value: allMyRequests.filter((r) => r.status === "approved").length, color: "text-emerald-400", bg: "from-emerald-500/20 to-teal-500/10", icon: <CheckCircle size={20} /> },
          { label: "Rejetés", value: allMyRequests.filter((r) => r.status === "rejected").length, color: "text-red-400", bg: "from-red-500/20 to-rose-500/10", icon: <XCircle size={20} /> },
          {
            label: "Montant total",
            value: formatAmount(allMyRequests.filter((r) => r.status === "approved").reduce((s, r) => s + r.total, 0)),
            color: "text-blue-400", bg: "from-blue-500/20 to-cyan-500/10", icon: <ShoppingBag size={20} />,
          },
        ].map((kpi, i) => (
          <div key={i} className={`bg-gradient-to-br ${kpi.bg} border border-slate-700 rounded-xl p-4`}>
            <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-slate-400 text-xs mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {canApprove && (
        <div className="flex gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all
              ${activeTab === "pending" ? "bg-amber-500 text-black shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            <Clock size={15} /> En attente {pendingForMe.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingForMe.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all
              ${activeTab === "all" ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            <ClipboardList size={15} /> Toutes les demandes ({allMyRequests.length})
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par demandeur, fournisseur ou produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
        {activeTab === "all" && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </select>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucune demande</p>
            <p className="text-sm mt-1">
              {currentUser.role === "user"
                ? "Soumettez une demande depuis la rubrique Achats"
                : "Aucune demande à traiter pour le moment"}
            </p>
          </div>
        )}

        {filtered.map((req) => {
          const cfg = STATUS_CONFIG[req.status];
          const isExpanded = expandedReq === req.id;

          return (
            <div key={req.id} className={`bg-slate-800/60 border rounded-xl overflow-hidden transition-all
              ${req.status === "pending" && canApprove ? "border-amber-500/40 shadow-lg shadow-amber-500/5" : "border-slate-700/50"}`}>
              
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => setExpandedReq(isExpanded ? null : req.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center">
                    <ShoppingBag size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-semibold text-sm">{req.supplierName}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        {ROLE_ICON[req.requestedByRole]}
                        {req.requestedByName}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Package size={11} /> {req.items.length} article{req.items.length > 1 ? "s" : ""}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">{formatAmount(req.total)}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Articles */}
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Articles demandés</p>
                    <div className="bg-slate-900/50 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left px-4 py-2 text-slate-400 font-medium">Produit</th>
                            <th className="text-center px-4 py-2 text-slate-400 font-medium">Qté</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">PU</th>
                            <th className="text-right px-4 py-2 text-slate-400 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {req.items.map((item, i) => (
                            <tr key={i} className="border-b border-slate-700/50 last:border-0">
                              <td className="px-4 py-2.5 text-white">{item.productName}</td>
                              <td className="px-4 py-2.5 text-center text-slate-300">{item.qty}</td>
                              <td className="px-4 py-2.5 text-right text-slate-300">{formatAmount(item.unitPrice)}</td>
                              <td className="px-4 py-2.5 text-right text-white font-semibold">{formatAmount(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-800/50">
                            <td colSpan={3} className="px-4 py-2.5 text-right text-slate-300 font-semibold">Total</td>
                            <td className="px-4 py-2.5 text-right text-white font-black text-base">{formatAmount(req.total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Note */}
                  {req.note && (
                    <div className="bg-slate-900/50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Note du demandeur</p>
                      <p className="text-slate-300 text-sm">{req.note}</p>
                    </div>
                  )}

                  {/* Review info */}
                  {req.reviewedByName && (
                    <div className={`rounded-xl p-3 ${req.status === "approved" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                      <p className="text-xs font-semibold mb-1 ${req.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}">
                        {req.status === "approved" ? "✅ Approuvé" : "❌ Rejeté"} par {req.reviewedByName} — {req.reviewedAt ? new Date(req.reviewedAt).toLocaleString("fr-FR") : ""}
                      </p>
                      {req.rejectionReason && <p className="text-red-300 text-sm">Motif : {req.rejectionReason}</p>}
                    </div>
                  )}

                  {/* Action buttons for pending */}
                  {req.status === "pending" && canApprove && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setApproveModal(req)}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <CheckCircle size={18} /> Approuver et exécuter
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: req.id, name: req.supplierName })}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <XCircle size={18} /> Rejeter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info for users */}
      {currentUser.role === "user" && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
          <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Comment soumettre un bon d'achat ?
          </h3>
          <p className="text-slate-400 text-sm">
            Rendez-vous dans la rubrique <strong className="text-white">Achats</strong> et cliquez sur 
            <strong className="text-blue-400"> "Soumettre une demande"</strong>. Votre manager ou administrateur 
            devra valider votre demande avant que l'achat ne soit enregistré dans le système.
          </p>
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-emerald-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Confirmer l'approbation</h3>
              <p className="text-slate-400 text-sm mt-1">
                En approuvant, l'achat de <span className="text-white font-semibold">{formatAmount(approveModal.total)}</span> sera 
                enregistré dans le système.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 mb-5 text-sm">
              <p className="text-slate-400">Fournisseur : <span className="text-white">{approveModal.supplierName}</span></p>
              <p className="text-slate-400 mt-1">Articles : <span className="text-white">{approveModal.items.length}</span></p>
              <p className="text-slate-400 mt-1">Demandé par : <span className="text-white">{approveModal.requestedByName}</span></p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setApproveModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors">Annuler</button>
              <button onClick={() => handleApprove(approveModal)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold transition-colors">✅ Approuver</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-red-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <XCircle size={32} className="text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Rejeter la demande</h3>
              <p className="text-slate-400 text-sm mt-1">Indiquez la raison du rejet. Le demandeur en sera informé.</p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motif du rejet (ex: budget insuffisant, produit non conforme...)"
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors">Annuler</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">❌ Rejeter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
