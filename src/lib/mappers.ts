import type {
  Product, Client, Supplier, Sale, Purchase, Receivable, StockMovement,
} from "../context/AppContext";
import type { PurchaseRequest } from "../context/AuthContext";
import type { Row } from "./sync";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  GESTIOPRO — Convertisseurs application ↔ SQL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  L'application utilise du camelCase, PostgreSQL du snake_case.
 *  Ces fonctions font la traduction dans les deux sens.
 */

const n = (v: unknown): number => {
  const parsed = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const s = (v: unknown): string => (v == null ? "" : String(v));

/** Ne garder que la partie date d'un timestamp PostgreSQL */
const day = (v: unknown): string => s(v).slice(0, 10);

// ── Produits ──────────────────────────────────────────────────────────────────
export const productToRow = (p: Product): Row => ({
  id: p.id,
  name: p.name,
  category: p.category,
  unit: p.unit,
  buy_price: p.buyPrice,
  sell_price: p.sellPrice,
  stock: p.stock,
  min_stock: p.minStock,
  tva_rate: p.tvaRate,
  created_at: p.createdAt,
});

export const productFromRow = (r: Row): Product => ({
  id: s(r.id),
  name: s(r.name),
  category: s(r.category),
  unit: s(r.unit),
  buyPrice: n(r.buy_price),
  sellPrice: n(r.sell_price),
  stock: n(r.stock),
  minStock: n(r.min_stock),
  tvaRate: n(r.tva_rate),
  createdAt: day(r.created_at),
});

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientToRow = (c: Client): Row => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  email: c.email,
  address: c.address,
  balance: c.balance,
  total_paid: c.totalPaid,
  payment_history: c.paymentHistory ?? [],
  created_at: c.createdAt,
});

export const clientFromRow = (r: Row): Client => ({
  id: s(r.id),
  name: s(r.name),
  phone: s(r.phone),
  email: s(r.email),
  address: s(r.address),
  balance: n(r.balance),
  totalPaid: n(r.total_paid),
  paymentHistory: Array.isArray(r.payment_history) ? (r.payment_history as Client["paymentHistory"]) : [],
  createdAt: day(r.created_at),
});

// ── Fournisseurs ──────────────────────────────────────────────────────────────
export const supplierToRow = (f: Supplier): Row => ({
  id: f.id,
  name: f.name,
  contact: f.contact,
  phone: f.phone,
  email: f.email,
  address: f.address,
  balance: f.balance,
  total_paid: f.totalPaid,
  payment_history: f.paymentHistory ?? [],
  created_at: f.createdAt,
});

export const supplierFromRow = (r: Row): Supplier => ({
  id: s(r.id),
  name: s(r.name),
  contact: s(r.contact),
  phone: s(r.phone),
  email: s(r.email),
  address: s(r.address),
  balance: n(r.balance),
  totalPaid: n(r.total_paid),
  paymentHistory: Array.isArray(r.payment_history) ? (r.payment_history as Supplier["paymentHistory"]) : [],
  createdAt: day(r.created_at),
});

// ── Ventes ────────────────────────────────────────────────────────────────────
export const saleToRow = (v: Sale): Row => ({
  id: v.id,
  ref: v.ref,
  client_id: v.clientId,
  client_name: v.clientName,
  items: v.items ?? [],
  total_ht: v.totalHT,
  total_tva: v.totalTVA,
  total: v.total,
  paid: v.paid,
  date: v.date,
  status: v.status,
  // `undefined` = clé absente du JSON envoyé : si l'application ne connaît pas
  // l'heure, c'est la base qui met l'heure du moment de l'enregistrement.
  // (`null` violerait la contrainte NOT NULL et ferait échouer l'enregistrement.)
  created_at: v.createdAt ?? undefined,
});

export const saleFromRow = (r: Row): Sale => ({
  id: s(r.id),
  ref: s(r.ref),
  clientId: s(r.client_id),
  clientName: s(r.client_name),
  items: Array.isArray(r.items) ? (r.items as Sale["items"]) : [],
  totalHT: n(r.total_ht),
  totalTVA: n(r.total_tva),
  total: n(r.total),
  paid: n(r.paid),
  date: day(r.date),
  status: (s(r.status) || "unpaid") as Sale["status"],
  createdAt: s(r.created_at) || undefined,
});

// ── Achats ────────────────────────────────────────────────────────────────────
export const purchaseToRow = (a: Purchase): Row => ({
  id: a.id,
  ref: a.ref,
  supplier_id: a.supplierId,
  supplier_name: a.supplierName,
  items: a.items ?? [],
  total_ht: a.totalHT,
  total_tva: a.totalTVA,
  total: a.total,
  paid: a.paid,
  date: a.date,
  status: a.status,
  created_at: a.createdAt ?? undefined,
});

export const purchaseFromRow = (r: Row): Purchase => ({
  id: s(r.id),
  ref: s(r.ref),
  supplierId: s(r.supplier_id),
  supplierName: s(r.supplier_name),
  items: Array.isArray(r.items) ? (r.items as Purchase["items"]) : [],
  totalHT: n(r.total_ht),
  totalTVA: n(r.total_tva),
  total: n(r.total),
  paid: n(r.paid),
  date: day(r.date),
  status: (s(r.status) || "unpaid") as Purchase["status"],
  createdAt: s(r.created_at) || undefined,
});

// ── Créances ──────────────────────────────────────────────────────────────────
export const receivableToRow = (c: Receivable): Row => ({
  id: c.id,
  client_id: c.clientId,
  client_name: c.clientName,
  sale_id: c.saleId,
  sale_ref: c.saleRef,
  amount: c.amount,
  paid: c.paid,
  remaining: c.remaining,
  due_date: c.dueDate,
  date: c.date,
  status: c.status,
});

export const receivableFromRow = (r: Row): Receivable => ({
  id: s(r.id),
  clientId: s(r.client_id),
  clientName: s(r.client_name),
  saleId: s(r.sale_id),
  saleRef: s(r.sale_ref),
  amount: n(r.amount),
  paid: n(r.paid),
  remaining: n(r.remaining),
  dueDate: day(r.due_date),
  date: day(r.date),
  status: (s(r.status) || "pending") as Receivable["status"],
});

// ── Mouvements de stock ───────────────────────────────────────────────────────
export const stockMovementToRow = (m: StockMovement): Row => ({
  id: m.id,
  product_id: m.productId,
  product_name: m.productName,
  type: m.type,
  qty: m.qty,
  reason: m.reason,
  date: m.date,
  balance_before: m.balanceBefore,
  balance_after: m.balanceAfter,
  created_at: m.createdAt ?? undefined,
});

export const stockMovementFromRow = (r: Row): StockMovement => ({
  id: s(r.id),
  productId: s(r.product_id),
  productName: s(r.product_name),
  type: (s(r.type) || "in") as StockMovement["type"],
  qty: n(r.qty),
  reason: s(r.reason),
  date: day(r.date),
  balanceBefore: n(r.balance_before),
  balanceAfter: n(r.balance_after),
  createdAt: s(r.created_at) || undefined,
});

// ── Demandes d'achat ──────────────────────────────────────────────────────────
export const purchaseRequestToRow = (p: PurchaseRequest): Row => ({
  id: p.id,
  requested_by: p.requestedBy,
  requested_by_name: p.requestedByName,
  requested_by_role: p.requestedByRole,
  supplier_id: p.supplierId,
  supplier_name: p.supplierName,
  items: p.items ?? [],
  total: p.total,
  date: p.date,
  note: p.note,
  status: p.status,
  reviewed_by: p.reviewedBy ?? null,
  reviewed_by_name: p.reviewedByName ?? null,
  reviewed_at: p.reviewedAt ?? null,
  rejection_reason: p.rejectionReason ?? null,
  created_at: p.createdAt,
});

export const purchaseRequestFromRow = (r: Row): PurchaseRequest => ({
  id: s(r.id),
  requestedBy: s(r.requested_by),
  requestedByName: s(r.requested_by_name),
  requestedByRole: (s(r.requested_by_role) || "user") as PurchaseRequest["requestedByRole"],
  organizationKey: "",
  supplierId: s(r.supplier_id),
  supplierName: s(r.supplier_name),
  items: Array.isArray(r.items) ? (r.items as PurchaseRequest["items"]) : [],
  total: n(r.total),
  date: day(r.date),
  note: s(r.note),
  status: (s(r.status) || "pending") as PurchaseRequest["status"],
  reviewedBy: s(r.reviewed_by) || undefined,
  reviewedByName: s(r.reviewed_by_name) || undefined,
  reviewedAt: s(r.reviewed_at) || undefined,
  rejectionReason: s(r.rejection_reason) || undefined,
  createdAt: s(r.created_at),
});
