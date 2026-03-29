import { useSettings } from "../context/SettingsContext";

export function useCurrency() {
  const { currency, formatAmount } = useSettings();
  return { currency, formatAmount, symbol: currency.symbol };
}
