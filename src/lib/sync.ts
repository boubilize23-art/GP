import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  GESTIOPRO — Couche de synchronisation Supabase
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Principe : l'état React reste la source de vérité pour l'affichage.
 *  À chaque modification, un diff est calculé par rapport au dernier état
 *  synchronisé, puis envoyé à Supabase :
 *     • ligne nouvelle ou modifiée → UPSERT
 *     • ligne disparue              → DELETE
 *
 *  La lecture se fait au démarrage, puis toutes les 15 secondes (rafraîchissement)
 *  et en temps réel quand la publication `supabase_realtime` est active.
 */

export type SyncStatus = "idle" | "loading" | "ready" | "error";

export type Row = Record<string, unknown>;

interface CollectionOptions<T> {
  /** Nom de la table Supabase */
  table: string;
  /** Synchronisation active ? (false hors-ligne ou non connecté) */
  enabled: boolean;
  /** Identifiant de l'organisation (ajouté automatiquement aux écritures) */
  organizationId?: string | null;
  /** Élément de l'app → ligne SQL */
  toRow: (item: T) => Row;
  /** Ligne SQL → élément de l'app */
  fromRow: (row: Row) => T;
  /** Colonnes sélectionnées (par défaut toutes) */
  columns?: string;
}

interface CollectionResult<T> {
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  status: SyncStatus;
  error: string | null;
  /** Forcer une relecture immédiate */
  refresh: () => void;
}

/** Intervalle entre deux rafraîchissements automatiques (ms) */
const POLL_INTERVAL = 15000;

export function useSupabaseCollection<T extends { id: string }>(
  options: CollectionOptions<T>,
): CollectionResult<T> {
  const { table, enabled, organizationId, columns = "*" } = options;

  const [rows, setRows] = useState<T[]>([]);
  const [status, setStatus] = useState<SyncStatus>(enabled ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);

  /** Dernier état connu de la base (pour le diff) */
  const syncedRef = useRef<T[]>([]);
  /** Des modifications locales sont en attente d'envoi */
  const dirtyRef = useRef(false);
  /** Empêche deux écritures simultanées sur la même table */
  const writingRef = useRef(false);

  // Les convertisseurs sont recréés à chaque rendu : on les garde dans des refs
  const toRowRef = useRef(options.toRow);
  toRowRef.current = options.toRow;
  const fromRowRef = useRef(options.fromRow);
  fromRowRef.current = options.fromRow;
  const orgRef = useRef(organizationId);
  orgRef.current = organizationId;
  /**
   * Organisation d'origine de chaque ligne déjà en base (id -> organization_id).
   * Sert à ne jamais rattacher une ligne existante à une autre société quand
   * l'administrateur principal change de société consultée.
   */
  const orgByIdRef = useRef<Record<string, string>>({});

  // ── Lecture initiale ────────────────────────────────────────────────────────
  const load = async (silent = false) => {
    if (!enabled) return;
    if (!silent) setStatus("loading");
    try {
      // Filtre d'organisation : un écran ne montre qu'une société à la fois.
      // (pour un client, la RLS le cloisonne de toute façon ; pour
      //  l'administrateur principal, c'est ce qui évite de mélanger les chiffres)
      let query = supabase.from(table).select(columns);
      if (orgRef.current) query = query.eq("organization_id", orgRef.current);
      const { data, error: err } = await query;
      if (err) throw new Error(err.message);
      const raw = ((data ?? []) as unknown) as Array<Record<string, unknown>>;
      // On mémorise la société d'origine de chaque ligne.
      orgByIdRef.current = Object.fromEntries(
        raw.map((r) => [String(r.id ?? ""), String(r.organization_id ?? "")]),
      );
      const mapped = raw.map((row) => fromRowRef.current(row as unknown as Row));
      syncedRef.current = mapped;
      dirtyRef.current = false;
      setRows(mapped);
      setStatus("ready");
      setError(null);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    if (!enabled) {
      // Déconnexion : on vide les données locales pour ne rien laisser fuiter
      setRows([]);
      syncedRef.current = [];
      dirtyRef.current = false;
      setStatus("idle");
      return;
    }
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, enabled, columns, organizationId]);

  // ── Envoi des modifications ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || status !== "ready") return;

    const timer = setTimeout(async () => {
      if (writingRef.current) return;

      const previous = syncedRef.current;
      const current = rows;

      const upserts: Row[] = [];
      for (const item of current) {
        const before = previous.find((r) => r.id === item.id);
        const row = toRowRef.current(item);
        if (!before || JSON.stringify(toRowRef.current(before)) !== JSON.stringify(row)) {
          // Une ligne déjà en base garde SA société d'origine : on ne déplace
          // jamais une opération d'une société vers une autre.
          const existingOrg = orgByIdRef.current[String(item.id)];
          upserts.push({
            ...row,
            organization_id: existingOrg || orgRef.current || undefined,
          });
        }
      }
      const deletedIds = previous.filter((p) => !current.some((c) => c.id === p.id)).map((p) => p.id);

      if (upserts.length === 0 && deletedIds.length === 0) {
        dirtyRef.current = false;
        return;
      }

      writingRef.current = true;
      try {
        if (upserts.length) {
          const { error: err } = await supabase
            .from(table)
            .upsert(upserts, { onConflict: "id" });
          if (err) throw new Error(err.message);
        }
        if (deletedIds.length) {
          // La suppression ne peut jamais viser une autre organisation.
          const { error: err } = await supabase
            .from(table)
            .delete()
            .in("id", deletedIds)
            .eq("organization_id", orgRef.current ?? "");
          if (err) throw new Error(err.message);
        }
        syncedRef.current = current;
        dirtyRef.current = false;
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        writingRef.current = false;
      }
    }, 600);

    // On considère la liste comme « sale » tant que l'envoi n'est pas fait
    dirtyRef.current = true;

    return () => clearTimeout(timer);
  }, [rows, table, enabled, status]);

  // ── Rafraîchissement périodique (filet de sécurité si le temps réel est off) ─
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (dirtyRef.current || writingRef.current) return; // ne pas écraser une saisie locale
      void load(true);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, enabled]);

  // ── Temps réel (si les tables sont dans la publication supabase_realtime) ──
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`gp:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: unknown) => {
          const evt = payload as {
            eventType: "INSERT" | "UPDATE" | "DELETE";
            new: Row | null;
            old: Row | null;
          };

          if (evt.eventType === "DELETE") {
            const id = (evt.old?.id ?? evt.new?.id) as string | undefined;
            if (!id) return;
            setRows((prev) => prev.filter((r) => r.id !== id));
            syncedRef.current = syncedRef.current.filter((r) => r.id !== id);
            return;
          }

          if (!evt.new) return;
          const item = fromRowRef.current(evt.new);
          setRows((prev) => {
            const exists = prev.some((r) => r.id === item.id);
            const next = exists
              ? prev.map((r) => (r.id === item.id ? item : r))
              : [...prev, item];
            syncedRef.current = next;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, enabled]);

  return {
    rows,
    setRows,
    status,
    error,
    refresh: () => void load(true),
  };
}

/** Vide une table (utilisé pour un reset complet) */
export async function clearTable(table: string): Promise<void> {
  await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

/** Supprime toutes les lignes d'une organisation sur une table */
export async function clearOrganizationData(organizationId: string): Promise<void> {
  const tables = [
    "products", "clients", "suppliers", "sales",
    "purchases", "receivables", "stock_movements", "purchase_requests",
  ];
  for (const table of tables) {
    await supabase.from(table).delete().eq("organization_id", organizationId);
  }
}
