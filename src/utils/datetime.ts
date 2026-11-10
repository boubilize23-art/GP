/**
 * Formatage des dates et heures des opérations.
 *
 * Les tables « ventes », « achats » et « mouvements de stock » portent une
 * date (jour) et, depuis le 29 octobre 2026, l'heure exacte de l'opération
 * (`created_at`).
 */

/** Heure seule — « 14:32 » */
export function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Date + heure — « 29 oct. 2026 à 14:32 » (l'heure est omise si absente) */
export function formatDateTime(iso?: string | null, date?: string): string {
  const day = date
    ? new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const time = formatTime(iso);
  if (day && time) return `${day} à ${time}`;
  return day || time;
}
