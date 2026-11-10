import { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Check,
  Download,
  FileText,
  Loader2,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
  FileSpreadsheet,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useOrganizationLogo } from "../hooks/useOrganizationLogo";
import { fetchLogoAsDataUrl } from "../lib/organizationLogo";
// Le moteur PDF est chargé à la demande : jsPDF représente ~450 Ko,
// on ne veut pas le payer au démarrage de l'application.
import type { ReportSection } from "../lib/reportPdf";

type Preset = "month" | "lastMonth" | "quarter" | "year" | "all" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function periodFor(preset: Preset): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0);

  switch (preset) {
    case "month":
      return {
        from: iso(startOfMonth),
        to: iso(now),
        label: "Mois en cours",
      };
    case "lastMonth": {
      const s = new Date(y, m - 1, 1);
      const e = new Date(y, m, 0);
      return {
        from: iso(s),
        to: iso(e),
        label: s.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      };
    }
    case "quarter": {
      const q = Math.floor(m / 3);
      const s = new Date(y, q * 3, 1);
      const e = new Date(y, q * 3 + 3, 0);
      return {
        from: iso(s),
        to: iso(e),
        label: `${["T1", "T2", "T3", "T4"][q]} ${y}`,
      };
    }
    case "year":
      return { from: iso(new Date(y, 0, 1)), to: iso(now), label: `Année ${y}` };
    case "all":
      return { from: "1970-01-01", to: iso(now), label: "Tout l'historique" };
    default:
      return { from: iso(startOfMonth), to: iso(now), label: "Période personnalisée" };
  }
}

const SECTIONS: {
  id: ReportSection;
  label: string;
  description: string;
  icon: typeof BarChart3;
}[] = [
  {
    id: "synthese",
    label: "Synthèse",
    description: "CA encaissé, achats, bénéfice, créances, marge",
    icon: BarChart3,
  },
  {
    id: "ventes",
    label: "Ventes",
    description: "Détail de chaque vente et de son encaissement",
    icon: ShoppingCart,
  },
  {
    id: "achats",
    label: "Achats",
    description: "Détail de chaque achat et de son règlement",
    icon: Receipt,
  },
  {
    id: "stock",
    label: "Stock & mouvements",
    description: "Entrées, sorties et état des stocks",
    icon: Package,
  },
  {
    id: "creances",
    label: "Créances & dettes",
    description: "Encours clients et fournisseurs",
    icon: Users,
  },
  {
    id: "tva",
    label: "TVA",
    description: "TVA facturée, récupérable et nette due",
    icon: Wallet,
  },
  {
    id: "produits",
    label: "État des stocks",
    description: "Catalogue, seuils et valorisation",
    icon: FileSpreadsheet,
  },
];

const PRESETS: { id: Preset; label: string }[] = [
  { id: "month", label: "Ce mois" },
  { id: "lastMonth", label: "Mois dernier" },
  { id: "quarter", label: "Ce trimestre" },
  { id: "year", label: "Cette année" },
  { id: "all", label: "Tout" },
  { id: "custom", label: "Personnalisée" },
];

export default function ReportsPage() {
  const { products, sales, purchases, clients, suppliers, receivables, stockMovements } =
    useApp();
  const { currentUser, organizationId } = useAuth();
  const { formatAmount, currency, activeFiscalYear } = useSettings();
  const { logoUrl } = useOrganizationLogo(organizationId);

  const [preset, setPreset] = useState<Preset>("month");
  const initial = periodFor("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [selected, setSelected] = useState<ReportSection[]>([
    "synthese",
    "ventes",
    "achats",
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const role = currentUser?.role;
  const allowed = role === "admin" || role === "manager";

  const label = useMemo(() => {
    if (preset === "custom") return "Période personnalisée";
    return periodFor(preset).label;
  }, [preset]);

  const stats = useMemo(() => {
    const inP = (d?: string) => {
      if (!d) return false;
      const k = d.slice(0, 10);
      return k >= from && k <= to;
    };
    const s = sales.filter((x) => inP(x.date));
    const p = purchases.filter((x) => inP(x.date));
    const ca = s.reduce((t, x) => t + (x.paid || 0), 0);
    const ach = p.reduce((t, x) => t + (x.paid || 0), 0);
    return {
      ventes: s.length,
      achats: p.length,
      ca,
      achatsPayes: ach,
      benefice: ca - ach,
      creances: clients.reduce((t, c) => t + (c.balance || 0), 0),
      dettes: suppliers.reduce((t, c) => t + (c.balance || 0), 0),
      mouvements: stockMovements.filter(
        (m) => inP(m.date) || inP(m.createdAt)
      ).length,
    };
  }, [sales, purchases, clients, suppliers, stockMovements, from, to]);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "custom") return;
    const per = periodFor(p);
    setFrom(per.from);
    setTo(per.to);
  }

  function toggleSection(id: ReportSection) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (selected.length === 0) {
      setMessage("Choisissez au moins une section à inclure.");
      return;
    }
    if (from > to) {
      setMessage("La date de début doit précéder la date de fin.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { downloadReportPdf, reportFileName } = await import("../lib/reportPdf");
      const logoDataUrl = logoUrl ? await fetchLogoAsDataUrl(logoUrl) : null;
      downloadReportPdf(
        {
          companyName: currentUser?.company || "Ma société",
          logoDataUrl,
          periodLabel: label,
          periodFrom: from,
          periodTo: to,
          currencyCode: currency.code,
          format: formatAmount,
          sections: selected,
          sales,
          purchases,
          products,
          clients,
          suppliers,
          receivables,
          stockMovements,
        },
        reportFileName("Rapport", from, to)
      );
      setMessage("Rapport PDF généré.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `Erreur : ${e.message}`
          : "La génération du rapport a échoué."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <FileText size={28} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Accès réservé</h2>
        <p className="text-slate-500 text-sm">
          La génération de rapports est réservée aux administrateurs et aux managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <FileText size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rapports d'activité</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Générez la synthèse de vos ventes, achats, stocks et créances en un fichier PDF
            prêt à envoyer à votre comptable.
            {activeFiscalYear ? ` Exercice ${activeFiscalYear.label}.` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonne gauche : réglages ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Période */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Calendar size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-slate-800 font-bold text-base">Période analysée</h2>
                <p className="text-slate-500 text-xs">
                  Les données hors période sont exclues du rapport.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    preset === p.id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Du</span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => {
                    setPreset("custom");
                    setFrom(e.target.value);
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">Au</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => {
                    setPreset("custom");
                    setTo(e.target.value);
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </label>
            </div>
          </div>

          {/* Sections */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <FileSpreadsheet size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-slate-800 font-bold text-base">Contenu du rapport</h2>
                <p className="text-slate-500 text-xs">
                  Sélectionnez les sections à inclure dans le PDF.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECTIONS.map((s) => {
                const on = selected.includes(s.id);
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                      on
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        on
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-800">
                        {s.label}
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {s.description}
                      </span>
                    </span>
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        on ? "bg-violet-600 border-violet-600" : "border-slate-300"
                      }`}
                    >
                      {on && <Check size={13} className="text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Colonne droite : aperçu + action ────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-slate-800 font-bold text-base mb-4">Aperçu</h2>
            <p className="text-xs text-slate-500 mb-4">
              {label} · du {from} au {to}
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-sm text-slate-600">CA encaissé</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatAmount(stats.ca)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-sm text-slate-600">Achats payés</span>
                <span className="text-sm font-bold text-slate-800">
                  {formatAmount(stats.achatsPayes)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-sm text-slate-600">Bénéfice encaissé</span>
                <span
                  className={`text-sm font-bold ${
                    stats.benefice >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatAmount(stats.benefice)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-sm text-slate-600">Créances / dettes</span>
                <span className="text-sm font-bold text-slate-800">
                  {formatAmount(stats.creances)} / {formatAmount(stats.dettes)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-slate-600">Opérations</span>
                <span className="text-sm font-bold text-slate-800">
                  {stats.ventes} vente(s) · {stats.achats} achat(s)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy || selected.length === 0}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm
                         shadow-sm hover:opacity-95 transition
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Générer le PDF
                </>
              )}
            </button>

            {message && (
              <p
                className={`mt-3 text-xs font-semibold rounded-lg px-3 py-2 ${
                  message.startsWith("Erreur") || message.startsWith("Choisissez")
                    ? "text-red-700 bg-red-50 border border-red-100"
                    : "text-emerald-700 bg-emerald-50 border border-emerald-100"
                }`}
              >
                {message}
              </p>
            )}

            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
              Le PDF est généré sur votre appareil. Il porte le logo de votre société, le nom
              de la société et la période analysée. Aucun document ne transite ailleurs.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Conseil
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pour la déclaration de TVA, choisissez « TVA » et la période du mois
              concerné. Pour un inventaire, prenez « Stock & mouvements » plus « État des
              stocks ».
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
