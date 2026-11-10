/**
 * 💾 GestioPro — Persistance des brouillons de formulaire
 *
 * Objectif : conserver la saisie en cours (étape, rôle, champs, clé d'organisation)
 * même après un rafraîchissement (F5), un crash du navigateur ou la fermeture de l'onglet.
 *
 * Le brouillon est stocké dans localStorage avec :
 *  - un numéro de version (invalide les anciens formats quand le formulaire évolue)
 *  - un horodatage (les brouillons trop vieux sont purgés automatiquement)
 */

/** Durée de vie d'un brouillon : 7 jours */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface DraftEnvelope<T> {
  /** Version du format du brouillon */
  version: number;
  /** Date de sauvegarde (ms epoch) */
  savedAt: number;
  /** Données du brouillon */
  data: T;
}

/**
 * Sauvegarde un brouillon.
 * Silencieux en cas d'échec (quota dépassé, navigation privée, etc.) :
 * la saisie continue de fonctionner, seule la reprise sera impossible.
 */
export function saveDraft<T>(key: string, data: T, version = 1): void {
  try {
    const envelope: DraftEnvelope<T> = { version, savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota dépassé / stockage indisponible */
  }
}

/**
 * Charge un brouillon.
 * Retourne `null` si : aucun brouillon, version incompatible, ou brouillon expiré.
 * Dans les deux derniers cas le brouillon est purgé pour ne pas encombrer le stockage.
 */
export function loadDraft<T>(key: string, version = 1): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw) as DraftEnvelope<T>;
    if (!envelope || typeof envelope !== "object" || !("data" in envelope)) {
      clearDraft(key);
      return null;
    }
    if (envelope.version !== version) {
      clearDraft(key);
      return null;
    }
    if (Date.now() - envelope.savedAt > DRAFT_TTL_MS) {
      clearDraft(key);
      return null;
    }
    return envelope.data;
  } catch {
    clearDraft(key);
    return null;
  }
}

/** Supprime définitivement un brouillon */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Date de la dernière sauvegarde (ms epoch) ou null si pas de brouillon */
export function getDraftSavedAt(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<unknown>;
    return typeof envelope?.savedAt === "number" ? envelope.savedAt : null;
  } catch {
    return null;
  }
}

// ── Obfuscation des champs sensibles ─────────────────────────────────────────
// Même approche que utils/security.ts (base64 + encodage URI) : évite de laisser
// le mot de passe en clair dans le stockage du navigateur.

export function obfuscate(value: string): string {
  try {
    return btoa(encodeURIComponent(value));
  } catch {
    return "";
  }
}

export function deobfuscate(value: string): string {
  try {
    return decodeURIComponent(atob(value));
  } catch {
    return "";
  }
}
