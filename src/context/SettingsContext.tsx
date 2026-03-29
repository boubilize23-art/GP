import { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";

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
  { code: "AED", symbol: "AED", name: "Dirham émirien", locale: "ar-AE" },
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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>(DEFAULT_FISCAL_YEARS);

  const activeFiscalYear = fiscalYears.find((fy) => fy.status === "active") ?? null;

  const setCurrency = (c: Currency) => setCurrencyState(c);

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
    // If new one is active, deactivate others
    if (fy.status === "active") {
      setFiscalYears((prev) =>
        [...prev.map((f) => f.status === "active" ? { ...f, status: "closed" as const } : f), newFY]
      );
    } else {
      setFiscalYears((prev) => [...prev, newFY]);
    }
  };

  const updateFiscalYear = (id: string, fy: Partial<FiscalYear>) => {
    setFiscalYears((prev) => prev.map((f) => (f.id === id ? { ...f, ...fy } : f)));
  };

  const deleteFiscalYear = (id: string) => {
    setFiscalYears((prev) => prev.filter((f) => f.id !== id));
  };

  const setActiveFiscalYear = (id: string) => {
    setFiscalYears((prev) =>
      prev.map((f) => ({
        ...f,
        status: f.id === id ? "active" : f.status === "active" ? "closed" : f.status,
      }))
    );
  };

  const closeFiscalYear = (id: string) => {
    setFiscalYears((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "closed" } : f))
    );
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
