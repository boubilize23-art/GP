import { createContext, useContext, useState, ReactNode, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

// ─── Helpers de calcul précis ─────────────────────────────────────────────────
/** Arrondi à 2 décimales — élimine les erreurs flottantes IEEE 754 */
const r2 = (n: number): number => Math.round(n * 100) / 100;
/** Valeur toujours ≥ 0 */
const pos = (n: number): number => Math.max(0, r2(n));
/** Reste = total − payé, toujours ≥ 0 */
const rem = (total: number, paid: number): number => pos(r2(total) - r2(paid));

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  tvaRate: number;       // taux TVA par défaut du produit (0 = pas de TVA)
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: "in" | "out" | "adjust";
  qty: number;
  reason: string;
  date: string;
  balanceBefore: number;
  balanceAfter: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
  type: "partial" | "full";
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  /** Cumul de toutes les créances non encore encaissées */
  balance: number;
  /** Cumul de tous les montants encaissés (tous paiements confondus) */
  totalPaid: number;
  paymentHistory: PaymentRecord[];
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  /** Cumul de toutes les dettes non encore réglées */
  balance: number;
  /** Cumul de tous les montants réglés (tous paiements confondus) */
  totalPaid: number;
  paymentHistory: PaymentRecord[];
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  tvaRate: number;       // taux TVA en % (0 si pas de TVA)
  tvaAmount: number;     // montant TVA calculé
  totalHT: number;       // total hors taxes
  total: number;         // total TTC
}

export interface Sale {
  id: string;
  ref: string;
  clientId: string;
  clientName: string;
  items: SaleItem[];
  totalHT: number;       // total hors taxes
  totalTVA: number;      // total TVA facturée
  /** Montant total TTC facturé */
  total: number;
  /** Montant cumulé encaissé (mis à jour à chaque paiement client) */
  paid: number;
  date: string;
  /** paid ≥ total → "paid" | paid > 0 → "partial" | sinon → "unpaid" */
  status: "paid" | "partial" | "unpaid";
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  tvaRate: number;       // taux TVA en % (0 si pas de TVA)
  tvaAmount: number;     // montant TVA récupérable
  totalHT: number;       // total hors taxes
  total: number;         // total TTC
}

export interface Purchase {
  id: string;
  ref: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalHT: number;       // total hors taxes
  totalTVA: number;      // total TVA récupérable
  /** Montant total TTC de l'achat */
  total: number;
  /** Montant cumulé réglé (mis à jour à chaque paiement fournisseur) */
  paid: number;
  date: string;
  status: "paid" | "partial" | "unpaid";
}

export interface Receivable {
  id: string;
  clientId: string;
  clientName: string;
  saleId: string;
  saleRef: string;
  amount: number;
  paid: number;
  remaining: number;
  dueDate: string;
  date: string;
  status: "paid" | "partial" | "pending";
}

type ClientInput = Omit<Client, "id" | "createdAt" | "balance" | "totalPaid" | "paymentHistory">;
type SupplierInput = Omit<Supplier, "id" | "createdAt" | "balance" | "totalPaid" | "paymentHistory">;

interface AppContextType {
  products: Product[];
  suppliers: Supplier[];
  clients: Client[];
  sales: Sale[];
  purchases: Purchase[];
  receivables: Receivable[];
  stockMovements: StockMovement[];

  addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addStockMovement: (productId: string, type: StockMovement["type"], qty: number, reason: string) => void;

  /** Retourne l'ID du client créé */
  addClient: (c: ClientInput) => string;
  updateClient: (id: string, c: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  payClient: (clientId: string, amount: number, note: string) => void;

  /** Retourne l'ID du fournisseur créé */
  addSupplier: (s: SupplierInput) => string;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  paySupplier: (supplierId: string, amount: number, note: string) => void;

  addSale: (s: Omit<Sale, "id" | "ref">) => void;
  addPurchase: (p: Omit<Purchase, "id" | "ref">) => void;
  addReceivablePayment: (receivableId: string, amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const today = new Date().toISOString().split("T")[0];

// ─── Données de démo vides (pas de données fictives qui fausseraient les calculs) ──
const INIT_PRODUCTS: Product[] = [];
const INIT_SUPPLIERS: Supplier[] = [];
const INIT_CLIENTS: Client[] = [];
const INIT_SALES: Sale[] = [];
const INIT_PURCHASES: Purchase[] = [];
const INIT_RECEIVABLES: Receivable[] = [];
const INIT_STOCK_MOVEMENTS: StockMovement[] = [];

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts]             = useState<Product[]>(INIT_PRODUCTS);
  const [suppliers, setSuppliers]           = useState<Supplier[]>(INIT_SUPPLIERS);
  const [clients, setClients]               = useState<Client[]>(INIT_CLIENTS);
  const [sales, setSales]                   = useState<Sale[]>(INIT_SALES);
  const [purchases, setPurchases]           = useState<Purchase[]>(INIT_PURCHASES);
  const [receivables, setReceivables]       = useState<Receivable[]>(INIT_RECEIVABLES);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INIT_STOCK_MOVEMENTS);

  // Compteurs de références (utiliser useRef pour éviter les désync avec setState)
  const saleCounterRef     = useRef(1);
  const purchaseCounterRef = useRef(1);

  // ══════════════════════════════════════════════════════════════
  // STOCK
  // ══════════════════════════════════════════════════════════════
  const addStockMovement = (
    productId: string,
    type: StockMovement["type"],
    qty: number,
    reason: string
  ) => {
    setProducts((prev) => {
      const prod = prev.find((p) => p.id === productId);
      if (!prod) return prev;
      const before = prod.stock;
      const delta  = type === "in" ? qty : type === "out" ? -qty : qty - before;
      const after  = pos(before + delta);
      const mov: StockMovement = {
        id: uuidv4(), productId, productName: prod.name, type,
        qty: Math.abs(type === "adjust" ? qty - before : qty),
        reason, date: today, balanceBefore: before, balanceAfter: after,
      };
      setStockMovements((m) => [mov, ...m]);
      return prev.map((p) => p.id === productId ? { ...p, stock: after } : p);
    });
  };

  // ══════════════════════════════════════════════════════════════
  // PRODUITS
  // ══════════════════════════════════════════════════════════════
  const addProduct = (p: Omit<Product, "id" | "createdAt">) =>
    setProducts((prev) => [...prev, { ...p, id: uuidv4(), createdAt: today }]);

  const updateProduct = (id: string, p: Partial<Product>) =>
    setProducts((prev) => prev.map((x) => x.id === id ? { ...x, ...p } : x));

  const deleteProduct = (id: string) =>
    setProducts((prev) => prev.filter((x) => x.id !== id));

  // ══════════════════════════════════════════════════════════════
  // CLIENTS  — addClient retourne l'ID pour liaison immédiate
  // ══════════════════════════════════════════════════════════════
  const addClient = (c: ClientInput): string => {
    const id = uuidv4();
    const newClient: Client = {
      ...c,
      id,
      balance: 0,
      totalPaid: 0,
      paymentHistory: [],
      createdAt: today,
    };
    setClients((prev) => [...prev, newClient]);
    return id; // ← retourné immédiatement, pas de race condition
  };

  const updateClient = (id: string, c: Partial<Client>) =>
    setClients((prev) => prev.map((x) => x.id === id ? { ...x, ...c } : x));

  const deleteClient = (id: string) =>
    setClients((prev) => prev.filter((x) => x.id !== id));

  /**
   * ENCAISSEMENT CLIENT
   * ─────────────────────────────────────────────────────────────
   * Règle : seulement 2 statuts visibles — "Payé" / "En créance"
   *
   * Montant payé s'accumule (+=) — jamais écrasé
   * Balance diminue (-=)        — jamais négative
   * Ventes liées mises à jour   — paid += montant, statut recalculé
   * Créances liées mises à jour — remaining diminue
   *
   * Exemple :
   *   Client A doit 100 000
   *   Paiement 1 = 30 000 → balance = 70 000 → "En créance"
   *   Paiement 2 = 20 000 → balance = 50 000 → "En créance"
   *   Paiement 3 = 50 000 → balance =      0 → "Payé"
   */
  const payClient = (clientId: string, amount: number, note: string) => {
    // ── Lire le client depuis l'état courant ──────────────────────────────────
    setClients((prevClients) => {
      const client = prevClients.find((c) => c.id === clientId);
      if (!client || client.balance <= 0) return prevClients;

      const toApply = pos(Math.min(r2(amount), r2(client.balance)));
      if (toApply <= 0) return prevClients;

      const newBalance    = rem(client.balance, toApply);
      const newTotalPaid  = r2(client.totalPaid + toApply);
      const rec: PaymentRecord = {
        id: uuidv4(),
        date: today,
        amount: toApply,
        note: note || "Encaissement client",
        type: newBalance === 0 ? "full" : "partial",
      };

      // ── Mise à jour des ventes liées ────────────────────────────────────────
      setSales((prevSales) => {
        let toDistribute = toApply;
        return prevSales.map((s) => {
          if (s.clientId !== clientId || toDistribute <= 0) return s;
          const saleRem = rem(s.total, s.paid);
          if (saleRem <= 0) return s;

          const apply    = pos(Math.min(toDistribute, saleRem));
          toDistribute   = pos(toDistribute - apply);
          const newPaid  = r2(s.paid + apply);
          const newRem   = rem(s.total, newPaid);
          return {
            ...s,
            paid: newPaid,
            status: newRem === 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid",
          };
        });
      });

      // ── Mise à jour des créances liées ──────────────────────────────────────
      setReceivables((prevRec) => {
        let toDistribute = toApply;
        return prevRec.map((r) => {
          if (r.clientId !== clientId || toDistribute <= 0) return r;
          const recRem = rem(r.amount, r.paid);
          if (recRem <= 0) return r;

          const apply   = pos(Math.min(toDistribute, recRem));
          toDistribute  = pos(toDistribute - apply);
          const newPaid = r2(r.paid + apply);
          const newRem  = rem(r.amount, newPaid);
          return {
            ...r,
            paid: newPaid,
            remaining: newRem,
            status: newRem === 0 ? "paid" : "partial",
          };
        });
      });

      // ── Retourner le client mis à jour ──────────────────────────────────────
      return prevClients.map((c) =>
        c.id !== clientId ? c : {
          ...c,
          balance: newBalance,
          totalPaid: newTotalPaid,
          paymentHistory: [rec, ...c.paymentHistory],
        }
      );
    });
  };

  // ══════════════════════════════════════════════════════════════
  // FOURNISSEURS  — addSupplier retourne l'ID
  // ══════════════════════════════════════════════════════════════
  const addSupplier = (s: SupplierInput): string => {
    const id = uuidv4();
    const newSupplier: Supplier = {
      ...s,
      id,
      balance: 0,
      totalPaid: 0,
      paymentHistory: [],
      createdAt: today,
    };
    setSuppliers((prev) => [...prev, newSupplier]);
    return id;
  };

  const updateSupplier = (id: string, s: Partial<Supplier>) =>
    setSuppliers((prev) => prev.map((x) => x.id === id ? { ...x, ...s } : x));

  const deleteSupplier = (id: string) =>
    setSuppliers((prev) => prev.filter((x) => x.id !== id));

  /**
   * RÈGLEMENT FOURNISSEUR
   * ─────────────────────────────────────────────────────────────
   * Même logique que payClient — miroir comptable exact
   *
   * Montant réglé s'accumule (+=)    — jamais écrasé
   * Balance diminue (-=)              — jamais négative
   * Achats liés mis à jour            — paid += montant
   */
  const paySupplier = (supplierId: string, amount: number, note: string) => {
    setSuppliers((prevSuppliers) => {
      const supplier = prevSuppliers.find((s) => s.id === supplierId);
      if (!supplier || supplier.balance <= 0) return prevSuppliers;

      const toApply = pos(Math.min(r2(amount), r2(supplier.balance)));
      if (toApply <= 0) return prevSuppliers;

      const newBalance   = rem(supplier.balance, toApply);
      const newTotalPaid = r2(supplier.totalPaid + toApply);
      const rec: PaymentRecord = {
        id: uuidv4(),
        date: today,
        amount: toApply,
        note: note || "Règlement fournisseur",
        type: newBalance === 0 ? "full" : "partial",
      };

      // ── Mise à jour des achats liés ─────────────────────────────────────────
      setPurchases((prevPurchases) => {
        let toDistribute = toApply;
        return prevPurchases.map((p) => {
          if (p.supplierId !== supplierId || toDistribute <= 0) return p;
          const purchRem = rem(p.total, p.paid);
          if (purchRem <= 0) return p;

          const apply    = pos(Math.min(toDistribute, purchRem));
          toDistribute   = pos(toDistribute - apply);
          const newPaid  = r2(p.paid + apply);
          const newRem   = rem(p.total, newPaid);
          return {
            ...p,
            paid: newPaid,
            status: newRem === 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid",
          };
        });
      });

      return prevSuppliers.map((s) =>
        s.id !== supplierId ? s : {
          ...s,
          balance: newBalance,
          totalPaid: newTotalPaid,
          paymentHistory: [rec, ...s.paymentHistory],
        }
      );
    });
  };

  // ══════════════════════════════════════════════════════════════
  // VENTES  — liaison directe et atomique avec le client
  // ══════════════════════════════════════════════════════════════
  /**
   * CRÉATION VENTE
   * ─────────────────────────────────────────────────────────────
   * Invariants garantis :
   *   • client.balance   += (total − paid)   [nouvelle créance]
   *   • client.totalPaid += paid             [encaissement immédiat]
   *   • receivable.remaining = total − paid  [= client.balance variation]
   *   • Σ ventes.total = Σ client.balance + client.totalPaid  [CA cohérent]
   */
  const addSale = (s: Omit<Sale, "id" | "ref">) => {
    const ref          = `VTE-${String(saleCounterRef.current).padStart(4, "0")}`;
    saleCounterRef.current += 1;

    const totalHTSale  = r2(s.totalHT);
    const totalTVASale = r2(s.totalTVA);
    const totalSale    = r2(s.total);   // TTC = HT + TVA
    const paidInit     = pos(Math.min(r2(s.paid), totalSale));
    const remaining    = rem(totalSale, paidInit);

    const saleId       = uuidv4();
    const saleStatus: Sale["status"] =
      remaining === 0 ? "paid" : paidInit > 0 ? "partial" : "unpaid";

    const newSale: Sale = {
      ...s,
      id: saleId,
      ref,
      totalHT: totalHTSale,
      totalTVA: totalTVASale,
      total: totalSale,
      paid: paidInit,
      status: saleStatus,
    };

    // 1. Enregistrer la vente
    setSales((prev) => [...prev, newSale]);

    // 2. Mettre à jour le client — atomique avec la vente
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== s.clientId) return c;
        return {
          ...c,
          // Créance += restant dû (montant non encore encaissé)
          balance:    r2(c.balance + remaining),
          // Encaissé += ce qui a été payé immédiatement à la création
          totalPaid:  r2(c.totalPaid + paidInit),
        };
      })
    );

    // 3. Créer la créance si reste > 0
    if (remaining > 0) {
      const due = new Date(Date.now() + 30 * 24 * 3600 * 1000)
        .toISOString().split("T")[0];
      const receivable: Receivable = {
        id: uuidv4(),
        clientId:   s.clientId,
        clientName: s.clientName,
        saleId,
        saleRef:    ref,
        amount:     totalSale,
        paid:       paidInit,
        remaining,
        dueDate:    due,
        date:       s.date,
        status:     paidInit > 0 ? "partial" : "pending",
      };
      setReceivables((prev) => [...prev, receivable]);
    }

    // 4. Décrémenter le stock — article par article
    s.items.forEach((item) => {
      setProducts((prev) => {
        const prod = prev.find((p) => p.id === item.productId);
        if (!prod) return prev;
        const before = prod.stock;
        const after  = pos(before - item.qty);
        const mov: StockMovement = {
          id: uuidv4(), productId: item.productId, productName: item.productName,
          type: "out", qty: item.qty, reason: `Vente ${ref}`,
          date: s.date, balanceBefore: before, balanceAfter: after,
        };
        setStockMovements((m) => [mov, ...m]);
        return prev.map((p) =>
          p.id === item.productId ? { ...p, stock: after } : p
        );
      });
    });
  };

  // ══════════════════════════════════════════════════════════════
  // ACHATS  — liaison directe et atomique avec le fournisseur
  // ══════════════════════════════════════════════════════════════
  /**
   * CRÉATION ACHAT
   * ─────────────────────────────────────────────────────────────
   * Invariants garantis :
   *   • fournisseur.balance   += (total − paid)  [nouvelle dette]
   *   • fournisseur.totalPaid += paid             [paiement immédiat]
   *   • achat.total − achat.paid = fournisseur.balance variation
   */
  const addPurchase = (p: Omit<Purchase, "id" | "ref">) => {
    const ref       = `ACH-${String(purchaseCounterRef.current).padStart(4, "0")}`;
    purchaseCounterRef.current += 1;

    const totalHTPurch  = r2(p.totalHT);
    const totalTVAPurch = r2(p.totalTVA);
    const totalPurch    = r2(p.total);  // TTC
    const paidInit      = pos(Math.min(r2(p.paid), totalPurch));
    const remaining     = rem(totalPurch, paidInit);

    const purchStatus: Purchase["status"] =
      remaining === 0 ? "paid" : paidInit > 0 ? "partial" : "unpaid";

    const newPurchase: Purchase = {
      ...p,
      id: uuidv4(),
      ref,
      totalHT:  totalHTPurch,
      totalTVA: totalTVAPurch,
      total:    totalPurch,
      paid:     paidInit,
      status:   purchStatus,
    };

    // 1. Enregistrer l'achat
    setPurchases((prev) => [...prev, newPurchase]);

    // 2. Mettre à jour le fournisseur — atomique avec l'achat
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== p.supplierId) return s;
        return {
          ...s,
          // Dette += restant dû
          balance:    r2(s.balance + remaining),
          // Payé   += paiement immédiat
          totalPaid:  r2(s.totalPaid + paidInit),
        };
      })
    );

    // 3. Incrémenter le stock — article par article
    p.items.forEach((item) => {
      setProducts((prev) => {
        const prod = prev.find((pp) => pp.id === item.productId);
        if (!prod) return prev;
        const before = prod.stock;
        const after  = r2(before + item.qty);
        const mov: StockMovement = {
          id: uuidv4(), productId: item.productId, productName: item.productName,
          type: "in", qty: item.qty, reason: `Achat ${ref}`,
          date: p.date, balanceBefore: before, balanceAfter: after,
        };
        setStockMovements((m) => [mov, ...m]);
        return prev.map((pp) =>
          pp.id === item.productId ? { ...pp, stock: after } : pp
        );
      });
    });
  };

  // ══════════════════════════════════════════════════════════════
  // PAIEMENT CRÉANCE DIRECT (depuis page Créances si elle existe)
  // ══════════════════════════════════════════════════════════════
  const addReceivablePayment = (receivableId: string, amount: number) => {
    setReceivables((prevRec) => {
      const rec = prevRec.find((r) => r.id === receivableId);
      if (!rec) return prevRec;

      const toApply = pos(Math.min(r2(amount), r2(rec.remaining)));
      if (toApply <= 0) return prevRec;

      const newPaid = r2(rec.paid + toApply);
      const newRem  = rem(rec.amount, newPaid);

      // Mettre à jour le client lié
      setClients((prev) =>
        prev.map((c) =>
          c.id !== rec.clientId ? c : {
            ...c,
            balance:    rem(c.balance, toApply),
            totalPaid:  r2(c.totalPaid + toApply),
          }
        )
      );

      // Mettre à jour la vente liée
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== rec.saleId) return s;
          const newSalePaid = r2(s.paid + toApply);
          const newSaleRem  = rem(s.total, newSalePaid);
          return {
            ...s,
            paid:   newSalePaid,
            status: newSaleRem === 0 ? "paid" : newSalePaid > 0 ? "partial" : "unpaid",
          };
        })
      );

      return prevRec.map((r) =>
        r.id !== receivableId ? r : {
          ...r,
          paid:      newPaid,
          remaining: newRem,
          status:    newRem === 0 ? "paid" : "partial",
        }
      );
    });
  };

  return (
    <AppContext.Provider
      value={{
        products, suppliers, clients, sales, purchases, receivables, stockMovements,
        addProduct, updateProduct, deleteProduct, addStockMovement,
        addClient,  updateClient,  deleteClient,  payClient,
        addSupplier, updateSupplier, deleteSupplier, paySupplier,
        addSale, addPurchase, addReceivablePayment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
