import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import { CreditCard, CheckCircle, Clock, AlertCircle, DollarSign, X } from "lucide-react";

export default function ReceivablesPage() {
  const { receivables, addReceivablePayment } = useApp();
  const { formatAmount, symbol } = useCurrency();

  const [payId, setPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const total = receivables.reduce((s, r) => s + r.amount, 0);
  const collected = receivables.reduce((s, r) => s + r.paid, 0);
  const outstanding = receivables.reduce((s, r) => s + r.remaining, 0);

  const statusBadge = (status: string) => {
    if (status === "paid") return <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={11} />Soldé</span>;
    if (status === "partial") return <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={11} />Partiel</span>;
    if (status === "overdue") return <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle size={11} />En retard</span>;
    return <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"><Clock size={11} />En attente</span>;
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (payId) {
      addReceivablePayment(payId, parseFloat(payAmount) || 0);
      setPayId(null);
      setPayAmount("");
    }
  };

  const selectedRec = receivables.find((r) => r.id === payId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
          <CreditCard size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Créances Clients</h2>
          <p className="text-slate-500 text-sm">{receivables.length} créance(s)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Total facturé</p>
          <p className="text-2xl font-black text-slate-800">{formatAmount(total)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Recouvré</p>
          <p className="text-2xl font-black text-emerald-600">{formatAmount(collected)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">Restant dû</p>
          <p className="text-2xl font-black text-red-500">{formatAmount(outstanding)}</p>
        </div>
      </div>

      {receivables.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-red-200 p-12 text-center">
          <CreditCard size={48} className="mx-auto text-red-200 mb-4" />
          <h3 className="text-slate-700 font-semibold text-lg mb-2">Aucune créance</h3>
          <p className="text-slate-500 text-sm">Les créances apparaissent automatiquement quand une vente n'est pas entièrement payée.</p>
        </div>
      )}

      {receivables.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Facture</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Client</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Échéance</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-semibold">Montant</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-semibold">Payé</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-semibold">Reste</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-semibold">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.saleRef}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.clientName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{new Date(r.dueDate).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatAmount(r.amount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatAmount(r.paid)}</td>
                    <td className="px-4 py-3 text-right text-red-500 font-bold">{formatAmount(r.remaining)}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      {r.remaining > 0 && (
                        <button onClick={() => { setPayId(r.id); setPayAmount(""); }}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition">
                          <DollarSign size={11} />Encaisser
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payId && selectedRec && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Encaissement</h3>
              <button onClick={() => setPayId(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Facture</span><span className="font-mono text-xs font-semibold">{selectedRec.saleRef}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Client</span><span className="font-semibold">{selectedRec.clientName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Reste dû</span><span className="font-bold text-red-500">{formatAmount(selectedRec.remaining)}</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant à encaisser ({symbol})</label>
                <input required type="number" min="0.01" max={selectedRec.remaining} step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPayId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-semibold">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
