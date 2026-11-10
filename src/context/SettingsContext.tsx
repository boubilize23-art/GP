import {
  createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../supabase";
import { useAuth } from "./AuthContext";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed" | "draft";
  createdAt: string;
}

export const CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€", name: "Euro", locale: "fr-FR" },
  { code: "USD", symbol: "$", name: "Dollar américain", locale: "en-US" },
  { code: "GBP", symbol: "£", name: "Livre sterling", locale: "en-GB" },
  { code: "CHF", symbol: "CHF", name: "Franc suisse", locale: "fr-CH" },
  { code: "CAD", symbol: "CA$", name: "Dollar canadien", locale: "fr-CA" },
  { code: "MAD", symbol: "DH", name: "Dirham marocain", locale: "fr-MA" },
  { code: "TND", symbol: "DT", name: "Dinar tunisien", locale: "fr-TN" },
  { code: "DZD", symbol: "DA", name: "Dinar algérien", locale: "fr-DZ" },
  { code: "XOF", symbol: "FCFA", name: "Franc CFA (UEMOA)", locale: "fr-SN" },
  { code: "XAF", symbol: "FCFA", name: "Franc CFA (CEMAC)", locale: "fr-CM" },
  { code: "CDF", symbol: "FC", name: "Franc congolais", locale: "fr-CD" },
  { code: "MGA", symbol: "Ar", name: "Ariary malgache", locale: "fr-MG" },
  { code: "GNF", symbol: "GF", name: "Franc guinéen", locale: "fr-GN" },
  { code: "HTG", symbol: "G", name: "Gourde haïtienne", locale: "fr-HT" },
  { code: "BIF", symbol: "BIF", name: "Franc burundais", locale: "fr-BI" },
  { code: "RWF", symbol: "RF", name: "Franc rwandais", locale: "rw-RW" },
  { code: "MRO", symbol: "UM", name: "Ouguiya mauritanien", locale: "fr-MR" },
  { code: "JPY", symbol: "¥", name: "Yen japonais", locale: "ja-JP" },
  { code: "CNY", symbol: "¥", name: "Yuan chinois", locale: "zh-CN" },
  { code: "BRL", symbol: "R$", name: "Real brésilien", locale: "pt-BR" },
  { code: "NGN", symbol: "₦", name: "Naira nigérian", locale: "en-NG" },
  { code: "ZAR", symbol: "R", name: "Rand sud-africain", locale: "en-ZA" },
  { code: "EGP", symbol: "E£", name: "Livre égyptienne", locale: "ar-EG" },
  { code: "AED", symbol: "AED", name: "Dirham émirati", locale: "ar-AE" },
  { code: "SAR", symbol: "SR", name: "Riyal saoudien", locale: "ar-SA" },
];

const currentYear = new Date().getFullYear();

const DEFAULT_FISCAL_YEARS: FiscalYear[] = [
  {
    id: "fy-" + currentYear,
    label: `Exercice ${currentYear}`,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    status: "active",
    createdAt: new Date().toISOString().split("T")[0],
  },
];

interface SettingsContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fiscalYears: FiscalYear[];
  activeFiscalYear: FiscalYear | null;
  addFiscalYear: (fy: Omit<FiscalYear, "id" | "createdAt">) => void;
  updateFiscalYear: (id: string, fy: Partial<FiscalYear>) => void;
  deleteFiscalYear: (id: string) => void;
  setActiveFiscalYear: (id: string) => void;
  closeFiscalYear: (id: string) => void;
  formatAmount: (value: number) => string;
  /** L'utilisateur a-t-il le droit d'enregistrer les réglages pour toute la société ? */
  canSaveSettings: boolean;
  /** Les réglages viennent-ils de la base (partagés) ou du navigateur seul ? */
  settingsShared: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_CURRENCY = "gp.currency";
const STORAGE_FISCAL_YEARS = "gp.fiscalYears";

/** Lit une valeur du localStorage sans planter si elle est corrompue */
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible (navigation privée) : on ignore */
  }
}

/** La devise est-elle cohérente ? (une valeur corrompée ne doit pas casser l'affichage) */
function isValidCurrency(c: unknown): c is Currency {
  if (!c || typeof c !== "object") return false;
  const v = c as Record<string, unknown>;
  return typeof v.code === "string" && typeof v.symbol === "string" && typeof v.name === "string";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { currentUser, organizationId } = useAuth();

  // ── État local (affichage immédiat) ──────────────────────────────────────────
  // Le navigateur ne garde plus qu'un CACHE : la source de vérité est la base,
  // pour que la devise soit la même sur tous les appareils de la société.
  const [currency, setCurrencyState] = useState<Currency>(
    () => {
      const cached = readStorage<Currency>(STORAGE_CURRENCY, CURRENCIES[0]);
      return isValidCurrency(cached) ? cached : CURRENCIES[0];
    },
  );
  const [fiscalYears, setFiscalYearsState] = useState<FiscalYear[]>(
    () => readStorage<FiscalYear[]>(STORAGE_FISCAL_YEARS, DEFAULT_FISCAL_YEARS),
  );

  /** true une fois que la base a répondu (ou qu'on a compris qu'elle était muette) */
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  /** true si les réglages affichés viennent bien de la base */
  const [settingsShared, setSettingsShared] = useState(false);
  /** null = pas encore connu, false = aucune ligne, true = ligne présente */
  const [hasOrgRow, setHasOrgRow] = useState<boolean | null>(null);

  /** Seuls les administrateurs peuvent changer les réglages de la société */
  const canSaveSettings =
    !!currentUser && (currentUser.role === "admin" || currentUser.isSuperAdmin === true);

  const activeFiscalYear = fiscalYears.find((fy) => fy.status === "active") ?? null;

  // Valeurs courantes (pour les écritures sans état périmé)
  const currencyRef = useRef(currency);
  currencyRef.current = currency;
  const fiscalYearsRef = useRef(fiscalYears);
  fiscalYearsRef.current = fiscalYears;
  const orgRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Écriture en base ────────────────────────────────────────────────────────
  const saveToDb = useCallback(
    async (orgId: string, cur: Currency, fys: FiscalYear[]) => {
      const { error } = await supabase.from("org_settings").upsert(
        { organization_id: orgId, currency: cur, fiscal_years: fys },
        { onConflict: "organization_id" },
      );
      if (error) {
        // Un simple employé n'a pas le droit d'écrire : le réglage reste
        // local à son navigateur. Ce n'est pas une erreur bloquante.
        console.warn("Réglages non enregistrés pour la société :", error.message);
        return false;
      }
      setSettingsShared(true);
      return true;
    },
    [],
  );

  /** Enregistre (avec un léger délai pour regrouper les modifications) */
  const scheduleSave = useCallback(
    (cur: Currency, fys: FiscalYear[]) => {
      const orgId = orgRef.current;
      if (!orgId || !canSaveSettings) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveToDb(orgId, cur, fys);
      }, 400);
    },
    [canSaveSettings, saveToDb],
  );

  // ── Lecture en base au démarrage / à la connexion ───────────────────────────
  useEffect(() => {
    if (!organizationId) {
      // Déconnexion : on réarme pour la prochaine session
      orgRef.current = null;
      setHasOrgRow(null);
      setSettingsLoaded(false);
      setSettingsShared(false);
      return;
    }
    if (orgRef.current === organizationId) return; // déjà chargé
    orgRef.current = organizationId;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("org_settings")
          .select("currency, fiscal_years")
          .eq("organization_id", organizationId)
          .limit(1);
        if (cancelled) return;
        if (error) {
          console.warn("Réglages de la société illisibles :", error.message);
          setHasOrgRow(null);
          setSettingsLoaded(true);
          return;
        }
        const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
        if (row) {
          const cur = row.currency;
          if (isValidCurrency(cur)) setCurrencyState(cur);
          const fys = row.fiscal_years;
          if (Array.isArray(fys) && fys.length) setFiscalYearsState(fys as FiscalYear[]);
          setHasOrgRow(true);
          setSettingsShared(true);
        } else {
          setHasOrgRow(false);
          setSettingsShared(false);
        }
      } catch {
        if (!cancelled) setSettingsLoaded(true);
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // ── Première visite : on crée la ligne avec les réglages connus ────────────
  useEffect(() => {
    if (!organizationId || hasOrgRow !== false || !canSaveSettings) return;
    let cancelled = false;
    (async () => {
      const ok = await saveToDb(organizationId, currencyRef.current, fiscalYearsRef.current);
      if (!cancelled && ok) setHasOrgRow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, hasOrgRow, canSaveSettings, saveToDb]);

  // ── Cache navigateur (pour un affichage immédiat au démarrage) ──────────────
  useEffect(() => {
    if (!settingsLoaded) return;
    writeStorage(STORAGE_CURRENCY, currency);
  }, [currency, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    writeStorage(STORAGE_FISCAL_YEARS, fiscalYears);
  }, [fiscalYears, settingsLoaded]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    scheduleSave(c, fiscalYearsRef.current);
  };

  const applyFiscalYears = (next: FiscalYear[]) => {
    setFiscalYearsState(next);
    scheduleSave(currencyRef.current, next);
  };

  const formatAmount = (value: number): string => {
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${value.toLocaleString("fr-FR")} ${currency.symbol}`;
    }
  };

  const addFiscalYear = (fy: Omit<FiscalYear, "id" | "createdAt">) => {
    const newFY: FiscalYear = {
      ...fy,
      id: uuidv4(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    // Si le nouveau est actif, les autres passent en « clôturé »
    const next = fy.status === "active"
      ? [
          ...fiscalYears.map((f) =>
            f.status === "active" ? { ...f, status: "closed" as const } : f,
          ),
          newFY,
        ]
      : [...fiscalYears, newFY];
    applyFiscalYears(next);
  };

  const updateFiscalYear = (id: string, fy: Partial<FiscalYear>) => {
    applyFiscalYears(fiscalYears.map((f) => (f.id === id ? { ...f, ...fy } : f)));
  };

  const deleteFiscalYear = (id: string) => {
    applyFiscalYears(fiscalYears.filter((f) => f.id !== id));
  };

  const setActiveFiscalYear = (id: string) => {
    applyFiscalYears(
      fiscalYears.map((f) => ({
        ...f,
        status: f.id === id ? "active" : f.status === "active" ? "closed" : f.status,
      })),
    );
  };

  const closeFiscalYear = (id: string) => {
    applyFiscalYears(fiscalYears.map((f) => (f.id === id ? { ...f, status: "closed" } : f)));
  };

  return (
    <SettingsContext.Provider
      value={{
        currency,
        setCurrency,
        fiscalYears,
        activeFiscalYear,
        addFiscalYear,
        updateFiscalYear,
        deleteFiscalYear,
        setActiveFiscalYear,
        closeFiscalYear,
        formatAmount,
        canSaveSettings,
        settingsShared,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
