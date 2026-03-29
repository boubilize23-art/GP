import { useRef } from "react";
import { Sale } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { X, Printer, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface InvoiceModalProps {
  sale: Sale;
  onClose: () => void;
}

export default function InvoiceModal({ sale, onClose }: InvoiceModalProps) {
  const { formatAmount, currency, activeFiscalYear } = useSettings();
  const { currentUser } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const company = currentUser?.company || "Mon Entreprise";
  const userName = currentUser?.fullName || "Administrateur";

  const statusLabel = sale.status === "paid" ? "PAYÉE" : sale.status === "partial" ? "PARTIELLE" : "IMPAYÉE";
  const statusColor = sale.status === "paid" ? "#059669" : sale.status === "partial" ? "#d97706" : "#dc2626";
  const statusBg = sale.status === "paid" ? "#ecfdf5" : sale.status === "partial" ? "#fffbeb" : "#fef2f2";
  const statusBorder = sale.status === "paid" ? "#6ee7b7" : sale.status === "partial" ? "#fcd34d" : "#fca5a5";

  const saleDate = new Date(sale.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const dueDate = new Date(new Date(sale.date).getTime() + 30 * 24 * 3600 * 1000)
    .toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const tva = 0;
  const netAPayer = sale.total;
  const reste = sale.total - sale.paid;

  // ── Impression : une seule page A4 ──────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const currencySymbol = typeof currency === "object" ? currency.symbol : currency;
    const currencyCode = typeof currency === "object" ? currency.code : currency;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Facture ${sale.ref}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 210mm; height: 297mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px; color: #1e293b;
    background: white;
  }
  @page { size: A4; margin: 0; }
  @media print {
    html, body { width: 210mm; height: 297mm; }
  }

  .page {
    width: 210mm; height: 297mm;
    padding: 14mm 14mm 10mm 14mm;
    display: flex; flex-direction: column;
    position: relative; overflow: hidden;
  }

  /* Filigrane */
  .watermark {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 90px; font-weight: 900;
    color: rgba(220,38,38,0.07); pointer-events: none;
    white-space: nowrap; z-index: 0;
    display: ${sale.status === "unpaid" ? "block" : "none"};
  }

  /* Bande supérieure violet */
  .top-band {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    height: 6px; border-radius: 3px;
    margin-bottom: 12px;
  }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .company-name { font-size: 20px; font-weight: 900; color: #7c3aed; letter-spacing: -0.5px; }
  .company-sub { font-size: 9px; color: #64748b; margin-top: 2px; }
  .invoice-block { text-align: right; }
  .invoice-title { font-size: 26px; font-weight: 900; color: #1e293b; }
  .invoice-ref { font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px; }
  .fy-badge {
    display: inline-block; margin-top: 4px;
    background: #f1f5f9; border: 1px solid #e2e8f0;
    border-radius: 20px; padding: 2px 8px;
    font-size: 9px; color: #64748b;
  }

  /* Status stamp */
  .stamp {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 4px;
    font-size: 13px; font-weight: 900; letter-spacing: 1px;
    border: 2px solid; transform: rotate(-5deg);
    border-color: ${statusBorder};
    color: ${statusColor}; background: ${statusBg};
    margin-top: 6px;
  }

  /* Info row */
  .info-row { display: flex; gap: 10px; margin-bottom: 12px; }
  .info-box {
    flex: 1; background: #f8fafc; border: 1px solid #e2e8f0;
    border-radius: 8px; padding: 8px 10px;
  }
  .info-label { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .info-value { font-size: 10px; font-weight: 600; color: #1e293b; }
  .info-value-sm { font-size: 9px; color: #64748b; }

  /* Divider */
  .divider { height: 1px; background: #e2e8f0; margin: 8px 0; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  thead { background: linear-gradient(135deg, #7c3aed, #4f46e5); }
  thead th {
    color: white; font-size: 9px; font-weight: 700;
    padding: 6px 8px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;
  }
  thead th:last-child { text-align: right; }
  thead th:nth-child(2), thead th:nth-child(3) { text-align: right; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:nth-child(even) { background: #fafafa; }
  td { padding: 5px 8px; font-size: 10px; color: #374151; vertical-align: middle; }
  td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
  .product-name { font-weight: 600; color: #1e293b; }

  /* Totaux */
  .totals-section { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .totals-box { width: 52%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .totals-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 12px; border-bottom: 1px solid #e2e8f0; }
  .totals-row:last-child { border-bottom: none; }
  .totals-row.net {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    padding: 8px 12px;
  }
  .totals-row.net .label, .totals-row.net .val { color: white; font-weight: 900; font-size: 12px; }
  .totals-label { font-size: 9px; color: #64748b; }
  .totals-val { font-size: 10px; font-weight: 700; color: #1e293b; }

  /* Payment detail */
  .payment-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .payment-box {
    flex: 1; border-radius: 8px; padding: 7px 10px; text-align: center; border: 1px solid;
  }
  .payment-box.total { background: #eff6ff; border-color: #bfdbfe; }
  .payment-box.paid  { background: #ecfdf5; border-color: #6ee7b7; }
  .payment-box.rest  { background: #fef2f2; border-color: #fca5a5; display: ${reste > 0 ? "block" : "none"}; }
  .payment-box .p-label { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
  .payment-box .p-val  { font-size: 13px; font-weight: 900; }
  .payment-box.total .p-val { color: #1e40af; }
  .payment-box.paid  .p-val { color: #059669; }
  .payment-box.rest  .p-val { color: #dc2626; }

  /* Footer */
  .footer { margin-top: auto; padding-top: 8px; border-top: 1px solid #e2e8f0; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-note { font-size: 9px; color: #94a3b8; }
  .signature-box {
    border: 1px dashed #cbd5e1; border-radius: 6px;
    padding: 6px 16px; text-align: center; min-width: 120px;
  }
  .sig-label { font-size: 8px; color: #94a3b8; margin-bottom: 12px; }
  .sig-name { font-size: 9px; font-weight: 700; color: #7c3aed; }

  /* Bottom band */
  .bottom-band {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, #7c3aed, #06b6d4, #10b981);
  }
</style>
</head>
<body>
<div class="page">
  <div class="watermark">IMPAYÉ</div>

  <!-- Bande top -->
  <div class="top-band"></div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${company}</div>
      <div class="company-sub">Gestion commerciale · GestioPro</div>
      <div class="stamp">${statusLabel}</div>
    </div>
    <div class="invoice-block">
      <div class="invoice-title">FACTURE</div>
      <div class="invoice-ref"># ${sale.ref}</div>
      <div class="fy-badge">📅 ${activeFiscalYear?.label || "Exercice courant"}</div>
    </div>
  </div>

  <!-- Info boxes -->
  <div class="info-row">
    <div class="info-box">
      <div class="info-label">Date de facturation</div>
      <div class="info-value">${saleDate}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Date d'échéance</div>
      <div class="info-value">${dueDate}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Client</div>
      <div class="info-value">${sale.clientName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Devise</div>
      <div class="info-value">${currencyCode} (${currencySymbol})</div>
    </div>
    <div class="info-box">
      <div class="info-label">Émis par</div>
      <div class="info-value">${userName}</div>
      <div class="info-value-sm">${today}</div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Articles -->
  <table>
    <thead>
      <tr>
        <th style="width:45%">Désignation</th>
        <th>Quantité</th>
        <th>Prix unitaire</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items.map((item) => `
        <tr>
          <td><span class="product-name">${item.productName}</span></td>
          <td>${item.qty}</td>
          <td>${item.unitPrice.toLocaleString("fr-FR")} ${currencySymbol}</td>
          <td style="font-weight:700;color:#1e293b">${item.total.toLocaleString("fr-FR")} ${currencySymbol}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <!-- Totaux -->
  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span class="totals-label">Sous-total HT</span>
        <span class="totals-val">${netAPayer.toLocaleString("fr-FR")} ${currencySymbol}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">TVA (0%)</span>
        <span class="totals-val">0 ${currencySymbol}</span>
      </div>
      <div class="totals-row net">
        <span class="label">NET À PAYER</span>
        <span class="val">${netAPayer.toLocaleString("fr-FR")} ${currencySymbol}</span>
      </div>
    </div>
  </div>

  <!-- Paiement -->
  <div class="payment-row">
    <div class="payment-box total">
      <div class="p-label">Total facture</div>
      <div class="p-val">${sale.total.toLocaleString("fr-FR")} ${currencySymbol}</div>
    </div>
    <div class="payment-box paid">
      <div class="p-label">Montant encaissé</div>
      <div class="p-val">${sale.paid.toLocaleString("fr-FR")} ${currencySymbol}</div>
    </div>
    <div class="payment-box rest">
      <div class="p-label">Solde restant dû</div>
      <div class="p-val">${reste.toLocaleString("fr-FR")} ${currencySymbol}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-row">
      <div>
        <div class="footer-note">Paiement sous 30 jours — Merci pour votre confiance</div>
        <div class="footer-note" style="margin-top:3px">Document généré par GestioPro · ${today}</div>
      </div>
      <div class="signature-box">
        <div class="sig-label">Signature & cachet</div>
        <div class="sig-name">${userName}</div>
      </div>
    </div>
  </div>

  <!-- Bande bottom -->
  <div class="bottom-band"></div>
</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 1000); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  // ── Interface modale ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Topbar modale */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              {sale.status === "paid" ? <CheckCircle size={16} className="text-white" /> :
               sale.status === "partial" ? <Clock size={16} className="text-white" /> :
               <AlertCircle size={16} className="text-white" />}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Facture {sale.ref}</p>
              <p className="text-slate-400 text-xs">{sale.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition"
            >
              <Printer size={15} /> Imprimer / PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corps de la facture — Aperçu A4 scrollable */}
        <div className="overflow-y-auto flex-1 bg-slate-200 p-6" ref={printRef}>
          {/* Feuille A4 simulée */}
          <div className="bg-white shadow-2xl mx-auto" style={{ width: "100%", maxWidth: "595px", minHeight: "842px", padding: "28px", position: "relative", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>

            {/* Filigrane IMPAYÉ */}
            {sale.status === "unpaid" && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%) rotate(-35deg)",
                fontSize: "80px", fontWeight: 900, color: "rgba(220,38,38,0.06)",
                pointerEvents: "none", whiteSpace: "nowrap", zIndex: 0
              }}>IMPAYÉ</div>
            )}

            {/* Bande violet top */}
            <div style={{ height: "6px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", borderRadius: "3px", marginBottom: "16px" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 900, color: "#7c3aed", letterSpacing: "-0.5px" }}>{company}</p>
                <p style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Gestion commerciale · GestioPro</p>
                {/* Stamp */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  marginTop: "8px", padding: "4px 12px", borderRadius: "4px",
                  border: `2px solid ${statusBorder}`,
                  backgroundColor: statusBg, color: statusColor,
                  fontWeight: 900, fontSize: "12px", letterSpacing: "1px",
                  transform: "rotate(-5deg)"
                }}>
                  {statusLabel}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "28px", fontWeight: 900, color: "#1e293b" }}>FACTURE</p>
                <p style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}># {sale.ref}</p>
                {activeFiscalYear && (
                  <p style={{ fontSize: "9px", color: "#7c3aed", marginTop: "4px", background: "#f5f3ff", padding: "2px 8px", borderRadius: "20px", display: "inline-block" }}>
                    📅 {activeFiscalYear.label}
                  </p>
                )}
              </div>
            </div>

            {/* Infos */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {[
                { label: "Date facture", value: saleDate },
                { label: "Échéance", value: dueDate },
                { label: "Client", value: sale.clientName },
                { label: "Émis par", value: userName },
              ].map((info) => (
                <div key={info.label} style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 8px" }}>
                  <p style={{ fontSize: "8px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{info.label}</p>
                  <p style={{ fontSize: "10px", fontWeight: 600, color: "#1e293b" }}>{info.value}</p>
                </div>
              ))}
            </div>

            {/* Séparateur */}
            <div style={{ height: "1px", background: "#e2e8f0", margin: "8px 0" }} />

            {/* Tableau articles */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                  {["Désignation", "Qté", "Prix unit.", "Total"].map((h, i) => (
                    <th key={h} style={{
                      color: "white", fontSize: "9px", fontWeight: 700,
                      padding: "7px 8px", textAlign: i > 0 ? "right" : "left",
                      textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 8px", fontSize: "10px", fontWeight: 600, color: "#1e293b" }}>{item.productName}</td>
                    <td style={{ padding: "6px 8px", fontSize: "10px", textAlign: "right", color: "#475569" }}>{item.qty}</td>
                    <td style={{ padding: "6px 8px", fontSize: "10px", textAlign: "right", color: "#475569" }}>
                      {formatAmount(item.unitPrice)}
                    </td>
                    <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>
                      {formatAmount(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
              <div style={{ width: "52%", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                {[
                  { label: "Sous-total HT", value: formatAmount(netAPayer), highlight: false },
                  { label: "TVA (0%)", value: formatAmount(tva), highlight: false },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "9px", color: "#64748b" }}>{row.label}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#1e293b" }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                  <span style={{ color: "white", fontWeight: 900, fontSize: "11px" }}>NET À PAYER</span>
                  <span style={{ color: "white", fontWeight: 900, fontSize: "13px" }}>{formatAmount(netAPayer)}</span>
                </div>
              </div>
            </div>

            {/* Paiement */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {[
                { label: "Total facture", value: formatAmount(sale.total), bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
                { label: "Montant encaissé", value: formatAmount(sale.paid), bg: "#ecfdf5", border: "#6ee7b7", color: "#059669" },
                ...(reste > 0 ? [{ label: "Solde restant dû", value: formatAmount(reste), bg: "#fef2f2", border: "#fca5a5", color: "#dc2626" }] : []),
              ].map((p) => (
                <div key={p.label} style={{ flex: 1, background: p.bg, border: `1px solid ${p.border}`, borderRadius: "8px", padding: "8px", textAlign: "center" }}>
                  <p style={{ fontSize: "8px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "3px" }}>{p.label}</p>
                  <p style={{ fontSize: "14px", fontWeight: 900, color: p.color }}>{p.value}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <p style={{ fontSize: "9px", color: "#94a3b8" }}>Paiement sous 30 jours · Merci pour votre confiance</p>
                <p style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>Document généré le {today} · GestioPro</p>
              </div>
              <div style={{ border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "6px 16px", textAlign: "center" }}>
                <p style={{ fontSize: "8px", color: "#94a3b8", marginBottom: "14px" }}>Signature & cachet</p>
                <p style={{ fontSize: "9px", fontWeight: 700, color: "#7c3aed" }}>{userName}</p>
              </div>
            </div>

            {/* Bande bottom */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #7c3aed, #06b6d4, #10b981)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
