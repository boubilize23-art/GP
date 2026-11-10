/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GESTIOPRO — Générateur de rapports PDF
 * ═══════════════════════════════════════════════════════════════════════════
 *  Produit un vrai fichier PDF (téléchargeable, partageable par e-mail ou
 *  WhatsApp) à partir des données de l'organisation courante.
 *
 *  Le document reprend l'identité de la société : logo, nom, période
 *  analysée, date de génération. Chaque page porte le même en-tête et le
 *  même pied de page.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  Product,
  Sale,
  Purchase,
  Client,
  Supplier,
  Receivable,
  StockMovement,
} from "../context/AppContext";

export type ReportSection =
  | "synthese"
  | "ventes"
  | "achats"
  | "stock"
  | "creances"
  | "tva"
  | "produits";

export interface ReportData {
  companyName: string;
  companyAddress?: string;
  /** Logo au format data URL (image/png) — optionnel */
  logoDataUrl?: string | null;
  periodLabel: string;
  periodFrom: string;
  periodTo: string;
  currencyCode: string;
  /** Formateur de montants aligné sur celui de l'application */
  format: (n: number) => string;
  sections: ReportSection[];
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  receivables: Receivable[];
  stockMovements: StockMovement[];
}

// ── Constantes de mise en page (mm) ────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const M = 14; // marge
const HEADER_H = 30;
const FOOTER_Y = 289;

const VIOLET: [number, number, number] = [124, 58, 237];
const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [15, 23, 42];
const SLATE_500: [number, number, number] = [100, 116, 139];
const EMERALD: [number, number, number] = [5, 150, 105];
const RED: [number, number, number] = [220, 38, 38];

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── helpers ───────────────────────────────────────────────────────────────────
function inPeriod(date: string, from: string, to: string): boolean {
  if (!date) return false;
  const d = date.slice(0, 10);
  return d >= from && d <= to;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Payée",
  partial: "Partielle",
  unpaid: "Impayée",
};

/**
 * Construit le document PDF. Retourne l'instance jsPDF prête à être
 * téléchargée (`downloadReportPdf` s'en charge).
 */
export function buildReportPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const fmt = data.format;

  const sales = data.sales.filter((s) => inPeriod(s.date, data.periodFrom, data.periodTo));
  const purchases = data.purchases.filter((p) => inPeriod(p.date, data.periodFrom, data.periodTo));
  const movements = data.stockMovements.filter(
    (m) => inPeriod(m.date || m.createdAt || "", data.periodFrom, data.periodTo) ||
           inPeriod(m.createdAt || "", data.periodFrom, data.periodTo)
  );

  // ── Chiffres de synthèse ────────────────────────────────────────────────────
  const caEncaisse = r2(sales.reduce((s, x) => s + (x.paid || 0), 0));
  const caFacture = r2(sales.reduce((s, x) => s + (x.total || 0), 0));
  const achatsPayes = r2(purchases.reduce((s, x) => s + (x.paid || 0), 0));
  const achatsFactures = r2(purchases.reduce((s, x) => s + (x.total || 0), 0));
  const benefice = r2(caEncaisse - achatsPayes);
  const creances = r2(data.clients.reduce((s, c) => s + (c.balance || 0), 0));
  const dettes = r2(data.suppliers.reduce((s, c) => s + (c.balance || 0), 0));
  const tvaFacturee = r2(sales.reduce((s, x) => s + (x.totalTVA || 0), 0));
  const tvaRecuperee = r2(purchases.reduce((s, x) => s + (x.totalTVA || 0), 0));
  const tvaNette = r2(tvaFacturee - tvaRecuperee);
  const marge = caFacture > 0 ? r2(((caFacture - achatsFactures) / caFacture) * 100) : 0;

  const ventesSorties = r2(
    movements.filter((m) => m.type === "out").reduce((s, m) => s + (m.qty || 0), 0)
  );
  const entreesStock = r2(
    movements.filter((m) => m.type === "in").reduce((s, m) => s + (m.qty || 0), 0)
  );
  const valeurStock = r2(
    data.products.reduce((s, p) => s + (p.stock || 0) * (p.buyPrice || 0), 0)
  );

  // ── En-tête / pied de page, redessinés sur chaque page ──────────────────────
  const drawChrome = () => {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);

      // Bandeau violet
      doc.setFillColor(VIOLET[0], VIOLET[1], VIOLET[2]);
      doc.rect(0, 0, PAGE_W, 4, "F");

      let xText = M;
      if (data.logoDataUrl) {
        try {
          const format = data.logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          doc.addImage(data.logoDataUrl, format, M, 9, 22, 11);
          xText = M + 26;
        } catch {
          /* logo illisible : on continue sans */
        }
      }

      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(data.companyName, xText, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("RAPPORT D'ACTIVITÉ", xText, 19);
      if (data.companyAddress) {
        doc.text(data.companyAddress.slice(0, 70), xText, 23);
      }

      // Bloc droit : période + génération
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(VIOLET[0], VIOLET[1], VIOLET[2]);
      doc.text(data.periodLabel, PAGE_W - M, 14, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text(
        `Du ${fmtDate(data.periodFrom)} au ${fmtDate(data.periodTo)}`,
        PAGE_W - M,
        19,
        { align: "right" }
      );
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`,
        PAGE_W - M,
        23,
        { align: "right" }
      );

      // Filet
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(M, 27, PAGE_W - M, 27);

      // Pied de page
      doc.setDrawColor(226, 232, 240);
      doc.line(M, FOOTER_Y - 4, PAGE_W - M, FOOTER_Y - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text(`GestioPro — ${data.companyName}`, M, FOOTER_Y);
      doc.text(`Page ${p} / ${pages}`, PAGE_W - M, FOOTER_Y, { align: "right" });
    }
  };

  // ── Helpers de mise en page ────────────────────────────────────────────────
  let cursorY = HEADER_H + 4;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > FOOTER_Y - 8) {
      doc.addPage();
      cursorY = HEADER_H + 4;
    }
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    doc.text(title, M, cursorY);
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text(subtitle, M, cursorY + 4.5);
      cursorY += 8;
    }
    cursorY += 3;
  };

  const table = (head: string[][], body: unknown[][], opts: Record<string, unknown> = {}) => {
    ensureSpace(30);
    autoTable(doc, {
      startY: cursorY,
      head,
      body: body as never,
      margin: { left: M, right: M, top: HEADER_H + 2, bottom: 14 },
      styles: { fontSize: 8, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.15 },
      headStyles: {
        fillColor: VIOLET,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.8,
        halign: "left",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      ...opts,
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    cursorY = (last?.finalY ?? cursorY) + 8;
  };

  // ── 1. SYNTHÈSE ────────────────────────────────────────────────────────────
  if (data.sections.includes("synthese")) {
    sectionTitle(
      "Synthèse de l'activité",
      `Période du ${fmtDate(data.periodFrom)} au ${fmtDate(data.periodTo)} — ${sales.length} vente(s), ${purchases.length} achat(s)`
    );

    const kpis: { label: string; value: string; color: [number, number, number] }[] = [
      { label: "CA encaissé", value: fmt(caEncaisse), color: EMERALD },
      { label: "CA facturé", value: fmt(caFacture), color: INDIGO },
      { label: "Achats payés", value: fmt(achatsPayes), color: INDIGO },
      { label: "Bénéfice encaissé", value: fmt(benefice), color: benefice >= 0 ? EMERALD : RED },
      { label: "Créances clients", value: fmt(creances), color: VIOLET },
      { label: "Dettes fournisseurs", value: fmt(dettes), color: VIOLET },
      { label: "Marge brute", value: `${marge} %`, color: SLATE },
      { label: "TVA nette due", value: fmt(tvaNette), color: SLATE },
      { label: "Valeur du stock", value: fmt(valeurStock), color: SLATE },
    ];

    const boxW = (PAGE_W - M * 2 - 6) / 3;
    const boxH = 20;
    kpis.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = M + col * (boxW + 3);
      const y = cursorY + row * (boxH + 3);
      if (row > 0 && y + boxH > FOOTER_Y - 8) {
        // on laisse la grille suivante à la page suivante
        return;
      }
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, boxW, boxH, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text(k.label.toUpperCase(), x + 4, y + 6.5);

      doc.setFont("helvetica", "bold");
      const valueSize = k.value.length <= 13 ? 11 : k.value.length <= 17 ? 9.5 : 8.5;
      doc.setFontSize(valueSize);
      doc.setTextColor(k.color[0], k.color[1], k.color[2]);
      doc.text(k.value, x + 4, y + 14);
    });
    const rows = Math.ceil(kpis.length / 3);
    cursorY += rows * (boxH + 3) + 4;

    // Petit tableau de répartition des ventes
    const unpaid = sales.filter((s) => s.status !== "paid");
    table(
      [["Indicateur", "Valeur"]],
      [
        ["Ventes payées", String(sales.filter((s) => s.status === "paid").length)],
        ["Ventes partielles", String(sales.filter((s) => s.status === "partial").length)],
        ["Ventes impayées", String(sales.filter((s) => s.status === "unpaid").length)],
        ["Montant restant à encaisser", fmt(r2(unpaid.reduce((s, x) => s + (x.total - x.paid), 0)))],
        ["Entrées de stock (unités)", String(entreesStock)],
        ["Sorties de stock (unités)", String(ventesSorties)],
      ],
      { columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right", fontStyle: "bold" } } }
    );
  }

  // ── 2. VENTES ──────────────────────────────────────────────────────────────
  if (data.sections.includes("ventes")) {
    sectionTitle(
      "Détail des ventes",
      `${sales.length} vente(s) sur la période`
    );
    if (sales.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("Aucune vente sur cette période.", M, cursorY);
      cursorY += 8;
    } else {
      table(
        [["Réf", "Date", "Client", "HT", "TVA", "TTC", "Encaissé", "Statut"]],
        sales
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((s) => [
            s.ref,
            fmtDate(s.date),
            s.clientName,
            fmt(s.totalHT),
            fmt(s.totalTVA),
            fmt(s.total),
            fmt(s.paid),
            STATUS_LABEL[s.status] || s.status,
          ]),
        {
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 18 },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right", fontStyle: "bold" },
            6: { halign: "right" },
            7: { cellWidth: 20 },
          },
        }
      );
    }
  }

  // ── 3. ACHATS ──────────────────────────────────────────────────────────────
  if (data.sections.includes("achats")) {
    sectionTitle("Détail des achats", `${purchases.length} achat(s) sur la période`);
    if (purchases.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("Aucun achat sur cette période.", M, cursorY);
      cursorY += 8;
    } else {
      table(
        [["Réf", "Date", "Fournisseur", "HT", "TVA", "TTC", "Réglé", "Statut"]],
        purchases
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((p) => [
            p.ref,
            fmtDate(p.date),
            p.supplierName,
            fmt(p.totalHT),
            fmt(p.totalTVA),
            fmt(p.total),
            fmt(p.paid),
            STATUS_LABEL[p.status] || p.status,
          ]),
        {
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 18 },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right", fontStyle: "bold" },
            6: { halign: "right" },
            7: { cellWidth: 20 },
          },
        }
      );
    }
  }

  // ── 4. STOCK & MOUVEMENTS ──────────────────────────────────────────────────
  if (data.sections.includes("stock")) {
    sectionTitle(
      "Stock et mouvements",
      `${entreesStock} unité(s) entrée(s) · ${ventesSorties} unité(s) sortie(s)`
    );

    // Synthèse par produit
    const perProduct = data.products
      .map((p) => {
        const ms = movements.filter((m) => m.productId === p.id);
        const inn = r2(ms.filter((m) => m.type === "in").reduce((s, m) => s + (m.qty || 0), 0));
        const out = r2(ms.filter((m) => m.type === "out").reduce((s, m) => s + (m.qty || 0), 0));
        return { p, inn, out, stock: p.stock || 0, seuil: p.minStock || 0 };
      })
      .filter((x) => x.inn > 0 || x.out > 0 || x.stock > 0);

    if (perProduct.length) {
      table(
        [["Produit", "Stock actuel", "Seuil", "Entrées", "Sorties", "Valeur"]],
        perProduct.map((x) => [
          x.p.name,
          String(x.stock),
          String(x.seuil),
          String(x.inn),
          String(x.out),
          fmt(r2(x.stock * (x.p.buyPrice || 0))),
        ]),
        {
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right", fontStyle: "bold" },
          },
        }
      );
    }

    if (movements.length) {
      sectionTitle("Mouvements détaillés", `${movements.length} mouvement(s)`);
      table(
        [["Date", "Produit", "Type", "Qté", "Stock après", "Motif"]],
        movements
          .slice()
          .sort((a, b) =>
            ((a.createdAt || a.date) < (b.createdAt || b.date) ? 1 : -1)
          )
          .map((m) => [
            fmtDate(m.date),
            m.productName,
            m.type === "in" ? "Entrée" : m.type === "out" ? "Sortie" : "Ajustement",
            String(m.qty),
            String(m.balanceAfter),
            m.reason,
          ]),
        {
          columnStyles: {
            0: { cellWidth: 18 },
            2: { cellWidth: 22 },
            3: { halign: "right" },
            4: { halign: "right" },
          },
        }
      );
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("Aucun mouvement de stock enregistré sur cette période.", M, cursorY);
      cursorY += 8;
    }
  }

  // ── 5. CRÉANCES & DETTES ───────────────────────────────────────────────────
  if (data.sections.includes("creances")) {
    sectionTitle(
      "Créances et dettes",
      "Ce qui reste à encaisser et à régler"
    );
    const enc = data.clients.filter((c) => (c.balance || 0) > 0);
    if (enc.length) {
      table(
        [["Client", "Encours", "Total encaissé"]],
        enc.map((c) => [c.name, fmt(c.balance), fmt(c.totalPaid)]),
        { columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" } } }
      );
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("Aucune créance client en cours.", M, cursorY);
      cursorY += 8;
    }

    const det = data.suppliers.filter((s) => (s.balance || 0) > 0);
    if (det.length) {
      table(
        [["Fournisseur", "Encours", "Total réglé"]],
        det.map((s) => [s.name, fmt(s.balance), fmt(s.totalPaid)]),
        { columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" } } }
      );
    }
  }

  // ── 6. TVA ─────────────────────────────────────────────────────────────────
  if (data.sections.includes("tva")) {
    sectionTitle(
      "TVA",
      "TVA facturée, récupérable et nette due"
    );
    const lines = sales.map((s) => ({
      op: `Vente ${s.ref}`,
      base: s.totalHT,
      tva: s.totalTVA,
      sens: "Facturée",
      date: s.date,
    }));
    const linesA = purchases.map((p) => ({
      op: `Achat ${p.ref}`,
      base: p.totalHT,
      tva: p.totalTVA,
      sens: "Récupérable",
      date: p.date,
    }));
    const all = [...lines, ...linesA].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (all.length) {
      table(
        [["Date", "Opération", "Sens", "Base HT", "TVA"]],
        all.map((l) => [fmtDate(l.date), l.op, l.sens, fmt(l.base), fmt(l.tva)]),
        {
          columnStyles: {
            0: { cellWidth: 18 },
            3: { halign: "right" },
            4: { halign: "right", fontStyle: "bold" },
          },
        }
      );
      table(
        [["Total", "Base HT", "TVA"]],
        [
          [
            "TVA facturée",
            fmt(r2(lines.reduce((s, l) => s + l.base, 0))),
            fmt(tvaFacturee),
          ],
          [
            "TVA récupérable",
            fmt(r2(linesA.reduce((s, l) => s + l.base, 0))),
            fmt(tvaRecuperee),
          ],
          ["TVA nette due", "", fmt(tvaNette)],
        ],
        { columnStyles: { 1: { halign: "right" }, 2: { halign: "right", fontStyle: "bold" } } }
      );
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("Aucune opération soumise à la TVA sur cette période.", M, cursorY);
      cursorY += 8;
    }
  }

  // ── 7. PRODUITS ────────────────────────────────────────────────────────────
  if (data.sections.includes("produits")) {
    sectionTitle("État des stocks", `${data.products.length} produit(s) au catalogue`);
    table(
      [["Produit", "Catégorie", "Stock", "Seuil", "Prix achat", "Prix vente", "Valeur"]],
      data.products.map((p) => [
        p.name,
        p.category || "—",
        String(p.stock),
        String(p.minStock),
        fmt(p.buyPrice),
        fmt(p.sellPrice),
        fmt(r2((p.stock || 0) * (p.buyPrice || 0))),
      ]),
      {
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right", fontStyle: "bold" },
        },
      }
    );
  }

  drawChrome();
  return doc;
}

/** Génère le PDF et déclenche le téléchargement. */
export function downloadReportPdf(data: ReportData, filename: string): void {
  const doc = buildReportPdf(data);
  doc.save(filename);
}

/** Nom de fichier normalisé : « GestioPro_Rapport_2026-11.pdf » */
export function reportFileName(prefix: string, from: string, to: string): string {
  const clean = (s: string) => (s || "").slice(0, 10).replace(/-/g, "_");
  return `GestioPro_${prefix}_${clean(from)}_${clean(to)}.pdf`;
}
