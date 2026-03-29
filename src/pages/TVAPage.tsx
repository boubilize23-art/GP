import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useCurrency } from "../hooks/useCurrency";
import {
  Receipt, AlertCircle, CheckCircle, Clock,
  TrendingDown, ChevronDown, ChevronUp,
  FileText, Info, Calendar, ArrowRight,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

// Arrondi comptable strict à 2 décimales
const r2 = (n: number) => Math.round(n * 100) / 100;

// ─── Type ─────────────────────────────────────────────────────────────────────
interface MonthTVA {
  month: number;           // 0-indexed
  label: string;
  // TVA sur ventes (collectée = facturée)
  tvaFacturee: number;
  // TVA sur achats (récupérable = déductible)
  tvaRecuperable: number;
  // Crédit reporté du mois précédent
  creditReporte: number;
  // TVA nette = facturée - récupérable - crédit reporté
  tvaNet: number;
  // > 0 → TVA due au trésor
  tvaDue: number;
  // < 0 → crédit à reporter au mois suivant
  creditAReporter: number;
  // Date limite de paiement (mois suivant)
  delaiPaiement: string;
  // Détail des ventes et achats du mois
  ventes: { ref: string; date: string; ht: number; tva: number; ttc: number; client: string }[];
  achats:  { ref: string; date: string; ht: number; tva: number; ttc: number; fournisseur: string }[];
}

export default function TVAPage() {
  const { sales, purchases } = useApp();
  const { formatAmount } = useCurrency();

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [selectedYear,   setSelectedYear]   = useState(currentYear);
  const [expandedMonth,  setExpandedMonth]  = useState<number | null>(currentMonth);
  const [activeTab,      setActiveTab]      = useState<"ventes" | "achats">("ventes");

  // ── Années disponibles ──────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    sales.forEach((s) => years.add(new Date(s.date).getFullYear()));
    purchases.forEach((p) => years.add(new Date(p.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, purchases, currentYear]);

  // ── Calcul TVA mois par mois ────────────────────────────────────────────────
  const monthsData: MonthTVA[] = useMemo(() => {
    const result: MonthTVA[] = [];
    let pendingCredit = 0; // Crédit en attente de report

    for (let m = 0; m < 12; m++) {
      // Ventes du mois
      const monthSales = sales.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === selectedYear && d.getMonth() === m;
      });

      // Achats du mois
      const monthPurchases = purchases.filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === selectedYear && d.getMonth() === m;
      });

      const hasOperations = monthSales.length > 0 || monthPurchases.length > 0;

      // TVA facturée (sur ventes — même si non payées, selon date facture)
      const tvaFacturee = r2(
        monthSales.reduce((s, v) => s + r2(v.totalTVA ?? 0), 0)
      );

      // TVA récupérable (sur achats — même si non payés, selon date facture)
      const tvaRecuperable = r2(
        monthPurchases.reduce((s, p) => s + r2(p.totalTVA ?? 0), 0)
      );

      // ── RÈGLE CLEF : le crédit reporté ne s'applique QUE si le mois a des opérations
      // Si aucune opération ce mois → le crédit reste en attente pour le prochain mois actif
      const creditReporteApplique = hasOperations ? pendingCredit : 0;

      // TVA nette = Facturée − Récupérable − Crédit reporté (seulement si opérations)
      const tvaNet = hasOperations
        ? r2(tvaFacturee - tvaRecuperable - creditReporteApplique)
        : 0;

      let tvaDue        = 0;
      let creditAReporter = 0;

      if (!hasOperations) {
        // Pas d'opérations → rien ne change, le crédit reste en attente
        tvaDue          = 0;
        creditAReporter = 0;
        // pendingCredit reste inchangé → sera reporté au prochain mois actif
      } else if (tvaNet > 0) {
        // TVA à payer ce mois
        tvaDue          = r2(tvaNet);
        creditAReporter = 0;
        pendingCredit   = 0; // Crédit consommé
      } else {
        // Crédit TVA à reporter au prochain mois ayant des opérations
        tvaDue          = 0;
        creditAReporter = r2(Math.abs(tvaNet));
        pendingCredit   = creditAReporter; // En attente du prochain mois actif
      }

      // Date limite : dernier jour du mois suivant
      const nextMonth     = m + 1 > 11 ? 0  : m + 1;
      const nextYear      = m + 1 > 11 ? selectedYear + 1 : selectedYear;
      const lastDay       = new Date(nextYear, nextMonth + 1, 0).getDate();
      const delaiPaiement = tvaDue > 0
        ? `Avant le ${lastDay} ${MONTHS[nextMonth]} ${nextYear}`
        : "—";

      // Détail ventes
      const ventesDetail = monthSales.map((s) => ({
        ref:       s.ref,
        date:      s.date,
        ht:        r2(s.totalHT  ?? s.total),
        tva:       r2(s.totalTVA ?? 0),
        ttc:       r2(s.total),
        client:    s.clientName,
      }));

      // Détail achats
      const achatsDetail = monthPurchases.map((p) => ({
        ref:         p.ref,
        date:        p.date,
        ht:          r2(p.totalHT  ?? p.total),
        tva:         r2(p.totalTVA ?? 0),
        ttc:         r2(p.total),
        fournisseur: p.supplierName,
      }));

      result.push({
        month: m,
        label: `${MONTHS[m]} ${selectedYear}`,
        tvaFacturee,
        tvaRecuperable,
        // Afficher le crédit reporté appliqué (= 0 si pas d'opérations)
        creditReporte: creditReporteApplique,
        tvaNet,
        tvaDue,
        creditAReporter,
        delaiPaiement,
        ventes: ventesDetail,
        achats:  achatsDetail,
      });
    }

    return result;
  }, [sales, purchases, selectedYear]);

  // ── Totaux annuels ──────────────────────────────────────────────────────────
  const annualTotals = useMemo(() => ({
    tvaFacturee:    r2(monthsData.reduce((s, m) => s + m.tvaFacturee,    0)),
    tvaRecuperable: r2(monthsData.reduce((s, m) => s + m.tvaRecuperable, 0)),
    tvaDue:         r2(monthsData.reduce((s, m) => s + m.tvaDue,         0)),
    creditFinal:    monthsData[11]?.creditAReporter ?? 0,
    nbVentes:       monthsData.reduce((s, m) => s + m.ventes.length, 0),
    nbAchats:       monthsData.reduce((s, m) => s + m.achats.length,  0),
  }), [monthsData]);

  // ── Statut du mois ──────────────────────────────────────────────────────────
  const getStatus = (m: MonthTVA) => {
    if (m.ventes.length === 0 && m.achats.length === 0) return "empty";
    if (m.tvaDue > 0)          return "due";
    if (m.creditAReporter > 0) return "credit";
    return "zero";
  };

  const STATUS_CFG = {
    empty:  { label: "Aucune opération", color: "text-slate-400",   bg: "bg-slate-50  border-slate-200",   dot: "bg-slate-300",  icon: <Clock size={13} /> },
    due:    { label: "TVA à payer",       color: "text-red-600",     bg: "bg-red-50    border-red-300",      dot: "bg-red-500",    icon: <AlertCircle size={13} /> },
    credit: { label: "Crédit à reporter", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-300", dot: "bg-emerald-500",icon: <TrendingDown size={13} /> },
    zero:   { label: "Soldé",             color: "text-blue-600",    bg: "bg-blue-50   border-blue-300",     dot: "bg-blue-500",   icon: <CheckCircle size={13} /> },
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Receipt size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-black text-2xl">Déclaration de TVA</h2>
            <p className="text-slate-500 text-sm">
              Tableau mensuel · TVA Facturée · TVA Récupérable · Crédit reporté · TVA Due
            </p>
          </div>
        </div>
        {/* Sélecteur année */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Calendar size={15} className="text-violet-500" />
          <span className="text-xs text-slate-500 font-semibold">Exercice :</span>
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(+e.target.value); setExpandedMonth(null); }}
            className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI Cards annuelles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "TVA Facturée",
            sub: `${annualTotals.nbVentes} vente(s) avec TVA`,
            value: formatAmount(annualTotals.tvaFacturee),
            color: "from-blue-400 to-cyan-500",
            text: "text-blue-700",
            icon: <FileText size={18} />,
          },
          {
            label: "TVA Récupérable",
            sub: `${annualTotals.nbAchats} achat(s) avec TVA`,
            value: formatAmount(annualTotals.tvaRecuperable),
            color: "from-emerald-400 to-teal-500",
            text: "text-emerald-700",
            icon: <Receipt size={18} />,
          },
          {
            label: "TVA Due (annuelle)",
            sub: "Somme des TVA dues",
            value: formatAmount(annualTotals.tvaDue),
            color: "from-red-400 to-rose-500",
            text: "text-red-700",
            icon: <AlertCircle size={18} />,
          },
          {
            label: "Crédit TVA Final",
            sub: "Crédit à reporter en " + (selectedYear + 1),
            value: formatAmount(annualTotals.creditFinal),
            color: "from-violet-400 to-purple-500",
            text: "text-violet-700",
            icon: <TrendingDown size={18} />,
          },
        ].map(({ label, sub, value, color, text, icon }) => (
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

      {/* ── Règle comptable (info box) ── */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-violet-600 mt-0.5 shrink-0" />
        <div className="text-xs text-violet-700 space-y-1">
          <p className="font-bold text-sm">Règle de calcul TVA (logique comptable)</p>
          <p>
            <span className="font-bold">TVA nette</span> = TVA Facturée &minus; TVA Récupérable &minus; Crédit TVA reporté
          </p>
          <p>
            Si TVA nette <span className="font-bold text-red-600">&gt; 0</span> → <span className="font-bold">TVA due</span> au Trésor — délai : <span className="font-bold">mois suivant</span>
          </p>
          <p>
            Si TVA nette <span className="font-bold text-emerald-600">&le; 0</span> → <span className="font-bold">Crédit TVA à reporter</span> au mois suivant
          </p>
          <p className="text-violet-500 mt-1">
            Le crédit TVA à reporter de janvier devient automatiquement le crédit reporté de février, et ainsi de suite.
          </p>
        </div>
      </div>

      {/* ── Grille des 12 mois ── */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {monthsData.map((m) => {
          const st  = getStatus(m);
          const cfg = STATUS_CFG[st];
          const isExpanded = expandedMonth === m.month;
          return (
            <button
              key={m.month}
              onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
              className={`relative rounded-2xl border-2 p-3 text-left transition-all duration-200 hover:shadow-md ${cfg.bg} ${isExpanded ? "ring-2 ring-violet-400 shadow-lg" : ""}`}
            >
              <div className={`w-2 h-2 rounded-full ${cfg.dot} absolute top-2.5 right-2.5`} />
              <p className="text-xs font-bold text-slate-600">{MONTHS[m.month]}</p>
              {m.tvaDue > 0 && (
                <p className="text-xs font-black text-red-600 mt-1">{formatAmount(m.tvaDue)}</p>
              )}
              {m.creditAReporter > 0 && (
                <p className="text-xs font-black text-emerald-600 mt-1">+{formatAmount(m.creditAReporter)}</p>
              )}
              {m.ventes.length === 0 && m.achats.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">—</p>
              )}
              <p className={`text-[10px] mt-1 font-semibold ${cfg.color}`}>{cfg.label}</p>
              <div className="absolute bottom-2 right-2">
                {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Détail du mois sélectionné ── */}
      {expandedMonth !== null && (() => {
        const m   = monthsData[expandedMonth];
        const st  = getStatus(m);
        const cfg = STATUS_CFG[st];
        return (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">

            {/* Header du mois */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-white font-black text-xl">{m.label}</h3>
                  <p className="text-violet-200 text-sm mt-0.5 flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                      ${st === "due" ? "bg-red-500/30 text-red-100" :
                        st === "credit" ? "bg-emerald-500/30 text-emerald-100" :
                        st === "zero"   ? "bg-blue-500/30 text-blue-100"    :
                        "bg-white/20 text-white/70"}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setExpandedMonth(null)}
                  className="text-violet-200 hover:text-white transition text-sm font-bold"
                >
                  ✕ Fermer
                </button>
              </div>
            </div>

            {/* Tableau de synthèse du mois */}
            <div className="p-6 space-y-6">

              {/* ── Synthèse comptable ── */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-100 border-b border-slate-200">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Receipt size={15} className="text-violet-500" />
                    Synthèse TVA — {m.label}
                  </h4>
                </div>
                <div className="divide-y divide-slate-100">

                  {/* TVA Facturée */}
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">TVA Facturée</p>
                        <p className="text-xs text-slate-400">Collectée sur {m.ventes.length} vente(s)</p>
                      </div>
                    </div>
                    <span className="font-black text-blue-600 text-base">{formatAmount(m.tvaFacturee)}</span>
                  </div>

                  {/* TVA Récupérable */}
                  <div className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Receipt size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">TVA Récupérable</p>
                        <p className="text-xs text-slate-400">Déductible sur {m.achats.length} achat(s)</p>
                      </div>
                    </div>
                    <span className="font-black text-emerald-600 text-base">− {formatAmount(m.tvaRecuperable)}</span>
                  </div>

                  {/* Crédit reporté */}
                  {m.creditReporte > 0 && (
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                          <ArrowRight size={14} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">Crédit TVA reporté</p>
                          <p className="text-xs text-slate-400">Report de {expandedMonth > 0 ? MONTHS[expandedMonth - 1] : "l'exercice précédent"}</p>
                        </div>
                      </div>
                      <span className="font-black text-violet-600 text-base">− {formatAmount(m.creditReporte)}</span>
                    </div>
                  )}

                  {/* Séparateur */}
                  <div className="h-0.5 bg-slate-200" />

                  {/* TVA Nette */}
                  <div className={`flex items-center justify-between px-5 py-4 ${
                    m.tvaDue > 0 ? "bg-red-50" : m.creditAReporter > 0 ? "bg-emerald-50" : "bg-blue-50"
                  }`}>
                    <div>
                      <p className="font-black text-slate-800 text-sm">TVA Nette</p>
                      <p className="text-xs text-slate-500">Facturée − Récupérable − Crédit reporté</p>
                    </div>
                    <span className={`font-black text-lg ${
                      m.tvaNet > 0 ? "text-red-600" : m.tvaNet < 0 ? "text-emerald-600" : "text-slate-600"
                    }`}>
                      {m.tvaNet > 0 ? "" : m.tvaNet < 0 ? "−" : ""}{formatAmount(Math.abs(m.tvaNet))}
                    </span>
                  </div>

                  {/* TVA Due OU Crédit à reporter */}
                  {m.tvaDue > 0 && (
                    <div className="flex items-center justify-between px-5 py-4 bg-red-100 border-t-2 border-red-300">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shadow">
                          <AlertCircle size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-black text-red-700 text-sm">TVA DUE AU TRÉSOR</p>
                          <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                            <Calendar size={10} /> Délai : {m.delaiPaiement}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-red-700 text-xl">{formatAmount(m.tvaDue)}</span>
                    </div>
                  )}

                  {m.creditAReporter > 0 && (
                    <div className="flex items-center justify-between px-5 py-4 bg-emerald-100 border-t-2 border-emerald-300">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow">
                          <TrendingDown size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-black text-emerald-700 text-sm">CRÉDIT TVA À REPORTER</p>
                          <p className="text-xs text-emerald-600 font-semibold">
                            Reporté en {expandedMonth < 11 ? MONTHS[expandedMonth + 1] : `Janvier ${selectedYear + 1}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 text-xl">{formatAmount(m.creditAReporter)}</span>
                    </div>
                  )}

                  {m.tvaDue === 0 && m.creditAReporter === 0 && m.ventes.length + m.achats.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-t-2 border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow">
                          <CheckCircle size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-black text-blue-700 text-sm">TVA SOLDÉE</p>
                          <p className="text-xs text-blue-500">Aucune TVA due ni crédit à reporter</p>
                        </div>
                      </div>
                      <span className="font-black text-blue-700 text-xl">0,00</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Détail Ventes / Achats ── */}
              {(m.ventes.length > 0 || m.achats.length > 0) && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => setActiveTab("ventes")}
                      className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${
                        activeTab === "ventes"
                          ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <FileText size={14} /> TVA Facturée — Ventes
                      <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-0.5 rounded-full">
                        {m.ventes.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab("achats")}
                      className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${
                        activeTab === "achats"
                          ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Receipt size={14} /> TVA Récupérable — Achats
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-full">
                        {m.achats.length}
                      </span>
                    </button>
                  </div>

                  {/* Tableau Ventes */}
                  {activeTab === "ventes" && (
                    <div className="overflow-x-auto">
                      {m.ventes.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-sm">
                          Aucune vente avec TVA en {m.label}
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-blue-50 border-b border-blue-100">
                              <th className="text-left px-4 py-3 text-blue-600 font-bold text-xs uppercase">Référence</th>
                              <th className="text-left px-4 py-3 text-blue-600 font-bold text-xs uppercase">Date</th>
                              <th className="text-left px-4 py-3 text-blue-600 font-bold text-xs uppercase">Client</th>
                              <th className="text-right px-4 py-3 text-blue-600 font-bold text-xs uppercase">Montant HT</th>
                              <th className="text-right px-4 py-3 text-blue-600 font-bold text-xs uppercase">TVA Facturée</th>
                              <th className="text-right px-4 py-3 text-blue-600 font-bold text-xs uppercase">TTC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.ventes.map((v, i) => (
                              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}`}>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                                    {v.ref}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">{fmt(v.date)}</td>
                                <td className="px-4 py-3 text-slate-700 font-semibold text-xs">{v.client}</td>
                                <td className="px-4 py-3 text-right text-slate-600 text-xs">{formatAmount(v.ht)}</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600 text-sm">
                                  {v.tva > 0 ? formatAmount(v.tva) : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right font-black text-slate-800 text-sm">{formatAmount(v.ttc)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-blue-600 text-white">
                              <td colSpan={3} className="px-4 py-3 font-bold text-sm">TOTAL {m.label.toUpperCase()}</td>
                              <td className="px-4 py-3 text-right font-bold text-blue-200 text-sm">
                                {formatAmount(r2(m.ventes.reduce((s, v) => s + v.ht, 0)))}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-white text-sm">
                                {formatAmount(m.tvaFacturee)}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-white text-sm">
                                {formatAmount(r2(m.ventes.reduce((s, v) => s + v.ttc, 0)))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tableau Achats */}
                  {activeTab === "achats" && (
                    <div className="overflow-x-auto">
                      {m.achats.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-sm">
                          Aucun achat avec TVA en {m.label}
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-emerald-50 border-b border-emerald-100">
                              <th className="text-left px-4 py-3 text-emerald-600 font-bold text-xs uppercase">Référence</th>
                              <th className="text-left px-4 py-3 text-emerald-600 font-bold text-xs uppercase">Date</th>
                              <th className="text-left px-4 py-3 text-emerald-600 font-bold text-xs uppercase">Fournisseur</th>
                              <th className="text-right px-4 py-3 text-emerald-600 font-bold text-xs uppercase">Montant HT</th>
                              <th className="text-right px-4 py-3 text-emerald-600 font-bold text-xs uppercase">TVA Récupérable</th>
                              <th className="text-right px-4 py-3 text-emerald-600 font-bold text-xs uppercase">TTC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.achats.map((a, i) => (
                              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-emerald-50/30"}`}>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                    {a.ref}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">{fmt(a.date)}</td>
                                <td className="px-4 py-3 text-slate-700 font-semibold text-xs">{a.fournisseur}</td>
                                <td className="px-4 py-3 text-right text-slate-600 text-xs">{formatAmount(a.ht)}</td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600 text-sm">
                                  {a.tva > 0 ? formatAmount(a.tva) : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right font-black text-slate-800 text-sm">{formatAmount(a.ttc)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-600 text-white">
                              <td colSpan={3} className="px-4 py-3 font-bold text-sm">TOTAL {m.label.toUpperCase()}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-200 text-sm">
                                {formatAmount(r2(m.achats.reduce((s, a) => s + a.ht, 0)))}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-white text-sm">
                                {formatAmount(m.tvaRecuperable)}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-white text-sm">
                                {formatAmount(r2(m.achats.reduce((s, a) => s + a.ttc, 0)))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Message si aucune opération ── */}
              {m.ventes.length === 0 && m.achats.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  <Clock size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="font-semibold text-sm">Aucune opération enregistrée en {m.label}</p>
                  <p className="text-xs mt-1">Les ventes et achats apparaîtront ici automatiquement selon leur date.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Tableau récapitulatif annuel ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Receipt size={16} className="text-violet-500" />
          <h3 className="font-bold text-slate-700">Récapitulatif annuel {selectedYear}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-bold text-xs uppercase">Mois</th>
                <th className="text-right px-4 py-3 text-blue-500 font-bold text-xs uppercase">TVA Facturée</th>
                <th className="text-right px-4 py-3 text-emerald-500 font-bold text-xs uppercase">TVA Récup.</th>
                <th className="text-right px-4 py-3 text-violet-500 font-bold text-xs uppercase">Crédit Reporté</th>
                <th className="text-right px-4 py-3 text-slate-500 font-bold text-xs uppercase">TVA Nette</th>
                <th className="text-right px-4 py-3 text-red-500 font-bold text-xs uppercase">TVA Due</th>
                <th className="text-right px-4 py-3 text-emerald-500 font-bold text-xs uppercase">Crédit à Reporter</th>
                <th className="text-left px-4 py-3 text-slate-500 font-bold text-xs uppercase">Délai Paiement</th>
                <th className="text-center px-4 py-3 text-slate-500 font-bold text-xs uppercase">Statut</th>
              </tr>
            </thead>
            <tbody>
              {monthsData.map((m, idx) => {
                const st  = getStatus(m);
                const cfg = STATUS_CFG[st];
                const isCurrentMonth = m.month === currentMonth && selectedYear === currentYear;
                return (
                  <tr
                    key={m.month}
                    onClick={() => setExpandedMonth(expandedMonth === m.month ? null : m.month)}
                    className={`border-b border-slate-50 cursor-pointer transition hover:bg-violet-50/40
                      ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                      ${isCurrentMonth ? "ring-2 ring-inset ring-violet-300 bg-violet-50/30" : ""}
                      ${expandedMonth === m.month ? "bg-violet-50" : ""}
                    `}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${isCurrentMonth ? "text-violet-700" : "text-slate-700"}`}>
                        {MONTHS[m.month]}
                        {isCurrentMonth && <span className="ml-1.5 text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-bold">Actuel</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600 text-sm">
                      {m.tvaFacturee > 0 ? formatAmount(m.tvaFacturee) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 text-sm">
                      {m.tvaRecuperable > 0 ? formatAmount(m.tvaRecuperable) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-violet-600 text-sm">
                      {m.creditReporte > 0 ? formatAmount(m.creditReporte) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold text-sm ${
                      m.tvaNet > 0 ? "text-red-600" : m.tvaNet < 0 ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      {m.ventes.length + m.achats.length > 0 ? formatAmount(Math.abs(m.tvaNet)) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-600 text-sm">
                      {m.tvaDue > 0 ? formatAmount(m.tvaDue) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                      {m.creditAReporter > 0 ? formatAmount(m.creditAReporter) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-left text-xs text-slate-500">
                      {m.delaiPaiement !== "—" ? (
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <Calendar size={10} /> {m.delaiPaiement}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <td className="px-4 py-4 font-black text-sm">TOTAL {selectedYear}</td>
                <td className="px-4 py-4 text-right font-black text-blue-200">{formatAmount(annualTotals.tvaFacturee)}</td>
                <td className="px-4 py-4 text-right font-black text-emerald-200">{formatAmount(annualTotals.tvaRecuperable)}</td>
                <td className="px-4 py-4 text-right text-violet-200 font-bold">—</td>
                <td className="px-4 py-4 text-right text-slate-300 font-bold">—</td>
                <td className="px-4 py-4 text-right font-black text-red-300">{formatAmount(annualTotals.tvaDue)}</td>
                <td className="px-4 py-4 text-right font-black text-emerald-300">{formatAmount(annualTotals.creditFinal)}</td>
                <td colSpan={2} className="px-4 py-4 text-xs text-slate-400 text-center">
                  {annualTotals.nbVentes} vente(s) · {annualTotals.nbAchats} achat(s)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
