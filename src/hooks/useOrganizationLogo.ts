import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  getCachedOrganizationLogo,
  invalidateOrganizationLogo,
  setCachedOrganizationLogo,
} from "../lib/organizationLogo";

interface OrgLogoRow {
  logo_url?: string | null;
}

/**
 * Charge l'URL du logo d'une société (mise en cache mémoire).
 * `reload` force un rechargement depuis la base.
 */
export function useOrganizationLogo(organizationId: string | null) {
  const [logoUrl, setLogoUrl] = useState<string | null>(() =>
    getCachedOrganizationLogo(organizationId)
  );
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!organizationId) {
        setLogoUrl(null);
        return;
      }
      if (!force) {
        const cached = getCachedOrganizationLogo(organizationId);
        if (cached !== null) {
          setLogoUrl(cached);
          return;
        }
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("logo_url")
          .eq("id", organizationId)
          .maybeSingle<OrgLogoRow>();
        const url = (!error && data?.logo_url) || null;
        setCachedOrganizationLogo(organizationId, url);
        setLogoUrl(url);
      } catch {
        setLogoUrl(null);
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    logoUrl,
    loading,
    reload: () => {
      invalidateOrganizationLogo(organizationId);
      void load(true);
    },
  };
}
